import { blinkPhase, rasterizeStatic, rasterizeText, RASTER_H, RASTER_W } from '../crt/raster';
import { rowText, type Grid } from '../crt/grid';
import { INK } from '../crt/palette';
import type { FileSystem } from './fs';
import type { Store } from './storage';
import type { Picture } from '../graphics/bitmap';
import type { Sfx, Track } from '../audio/types';
import { wideFontInstalled } from '../crt/font';
import { DEFAULT_THEME, THEMES, isTheme, type Theme, type ThemeId } from '../crt/themes';
import { CURSORS, type CursorShape } from './gui/cursors';
import { Gfx } from './gui/gfx';

export type { CursorShape };
import { tr, type Lang, type Text } from './i18n';

/** A key press. `alt` is set for Alt+letter (read from the physical key, so it works on a Mac). */
export type Key = { key: string; ctrl: boolean; shift?: boolean; alt?: boolean };
/** 'pad': a game, where keys are held rather than typed (no key clicks, no auto-repeat). */
export type InputMode = 'text' | 'pad';
export type DisplayMode = 'text' | 'graphics' | 'static';

export type PointerKind = 'mouse' | 'touch' | 'pen';
export type PointerPhase = 'down' | 'move' | 'up' | 'cancel' | 'leave';
/** A pointer as the page reports it, in raster pixels. */
export type PointerInput = {
  phase: PointerPhase;
  x: number;
  y: number;
  /** Over the glass (or held by a drag that started there). */
  inside: boolean;
  kind: PointerKind;
  id: number;
  primary: boolean;
  button: number;
  buttons: number;
  shift: boolean;
  /** Seconds, for telling a double click from two. */
  time: number;
  /** Raster pixels per CSS pixel where the pointer is: drags start after a few CSS pixels. */
  pxPerCss: number;
};
/** The same, with the position in the desk's logical pixels too. */
export type Pointer = PointerInput & { lx: number; ly: number };

/**
 * A program on the machine. Programs stack: the one on top owns the screen and the
 * keyboard, and ESC normally pops back to the one beneath.
 */
export interface App {
  readonly input?: InputMode;
  /** Draw the whole screen; called on entry and whenever the app is uncovered. */
  show(m: Machine): void;
  key(m: Machine, k: Key): void;
  release?(m: Machine, key: string): void;
  tick?(m: Machine, dt: number): void;
  /** Called when covered by another app or removed. */
  hide?(m: Machine): void;
  /**
   * Line editors only: what has been typed so far, mirrored by the phone's text field.
   * null while nothing is being edited.
   */
  line?(): string | null;
  /** The wheel, or a swipe: lines to move, negative toward the top. */
  scroll?(m: Machine, lines: number): void;
  /** The mouse, a finger or a pen. A program without this does not see the pointer. */
  pointer?(m: Machine, p: Pointer): void;
  /** The wheel over the screen, at a logical point (null from a key). */
  wheel?(m: Machine, lines: number, at: { x: number; y: number } | null): void;
  /** What the screen says, for tests and screen readers, when the grid is not the whole story. */
  describe?(m: Machine): string;
  /** Pixels over the page: buttons for the pointer. Called whenever the frame is composed. */
  overlay?(m: Machine, g: Gfx): void;
  /** CTRL combinations the program takes from the browser (DOS: C). All others stay the browser's. */
  readonly ctrlKeys?: readonly string[];
  /** Keys it takes that the browser would use otherwise: TAB. */
  readonly captureKeys?: readonly string[];
}

/** The sound card, as the machine sees it. */
export interface Speaker {
  readonly enabled: boolean;
  /** The track asked for most recently, playing or waiting for the first gesture. */
  readonly current: Track | null;
  setEnabled(on: boolean): void;
  sfx(name: Sfx, detail?: string): void;
  music(track: Track | null): void;
  hiss(on: boolean): void;
}

export type MachineEvents = {
  exit(): void;
  openUrl(url: string): void;
  /** Text for assistive technology: a screen, a page, a line of output. */
  announce(text: string): void;
  inputMode(mode: InputMode): void;
  loadPicture(url: string): Promise<Picture>;
  /** The Chinese character ROM, added to the given VGA glyph table. */
  loadWideFont(base: Uint8Array): Promise<Uint8Array>;
  /** Another tube was selected: the page degausses into it. */
  theme(next: Theme, previous: Theme): void;
};

export class Machine {
  readonly stack: App[] = [];
  /** Every character ever typed on this machine, on this device. The status bar shows it. */
  keystrokes: number;
  /** Every BACKSPACE: the traces of hesitation Jackie taught his scorer to look for. */
  hesitations: number;
  /** Every press of the mouse button or tap: the counter climbs for a visitor who never types. */
  clicks: number;
  /** Logical pixels are this many raster pixels square: 1 on a desk, 2 on a phone. */
  readonly scale: 1 | 2;
  /** Seconds the machine has run while the page was shown, and when anything was last touched. */
  clock = 0;
  lastInput = 0;
  /** The pointer, in raster pixels, as the tube draws it. */
  readonly mouse = { x: 0, y: 0, visible: false, shape: 'arrow' as CursorShape, kind: 'mouse' as PointerKind };
  private mouseVersion = 0;
  lang: Lang;
  /** The visitor prefers less motion: animations are cut short. */
  still = false;
  /** The tube, one of the six the buttons under the screen select. */
  theme: Theme;
  private pictures = new Map<string, Promise<Picture>>();
  /** What the visitor has seen: read files, viewed photos, recovered logs. Remembered across visits. */
  private readonly flags: Set<string>;
  glyphs: Uint8Array | null = null;
  mode: DisplayMode = 'text';
  private bitmap: Uint8Array | null = null;
  private bitmapVersion = 0;
  private drawn = { grid: -1, bitmap: -1, blink: -1, mode: '' as string, mouse: -1, overlay: -1 };
  private overlayVersion = 0;
  private overlayGfx: Gfx | null = null;
  /** The last page composed, without the pointer: what the pointer is drawn over. */
  private readonly composed = new Uint8Array(RASTER_W * RASTER_H);

  constructor(
    readonly grid: Grid,
    readonly audio: Speaker,
    readonly store: Store,
    readonly fs: FileSystem,
    private readonly events: MachineEvents,
    options: { scale?: 1 | 2 } = {},
  ) {
    this.scale = options.scale ?? (grid.cols < 80 ? 2 : 1);
    this.keystrokes = store.get('keystrokes', 0);
    this.clicks = store.get('clicks', 0);
    this.hesitations = store.get('hesitations', 0);
    this.lang = store.get<Lang>('lang', 'en');
    const tube = store.get<string>('theme', DEFAULT_THEME);
    this.theme = THEMES[isTheme(tube) ? tube : DEFAULT_THEME];
    this.flags = new Set(store.get<string[]>('flags', []));
    fs.exists = node => node.kind !== 'file' || !node.when || node.when(this);
  }

  t(text: Text): string { return tr(this.lang, text); }

  /** Switches language, loading the character ROM first when Chinese needs it. */
  async setLanguage(lang: Lang): Promise<void> {
    if (lang === 'zh' && this.glyphs && !wideFontInstalled()) this.glyphs = await this.events.loadWideFont(this.glyphs);
    this.lang = lang;
    this.store.set('lang', lang);
    this.grid.version++;
  }

  /** Selects a tube; `keep` remembers it for the next visit. */
  setTheme(id: ThemeId, keep = true): void {
    if (keep) this.store.set('theme', id);
    if (this.theme.id === id) return;
    const previous = this.theme;
    this.theme = THEMES[id];
    this.events.theme(this.theme, previous);
  }

  has(flag: string): boolean { return this.flags.has(flag); }
  soundOn(): boolean { return this.audio.enabled; }
  mark(flag: string): void {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    this.store.set('flags', [...this.flags]);
  }

  get cols(): number { return this.grid.cols; }
  get rows(): number { return this.grid.rows; }
  /** The 40-column phone page. */
  get narrow(): boolean { return this.grid.cols < 80; }
  get top(): App | undefined { return this.stack[this.stack.length - 1]; }
  get inputMode(): InputMode { return this.top?.input ?? 'text'; }
  get line(): string | null { return this.top?.line?.() ?? null; }

  push(app: App): void {
    this.top?.hide?.(this);
    this.stack.push(app);
    this.enter(app);
  }

  pop(): void {
    const app = this.stack.pop();
    app?.hide?.(this);
    if (this.top) this.enter(this.top);
  }

  replace(app: App): void {
    const app0 = this.stack.pop();
    app0?.hide?.(this);
    this.stack.push(app);
    this.enter(app);
  }

  private enter(app: App): void {
    this.mode = 'text';
    this.bitmap = null;
    this.grid.cursor.visible = false;
    this.cursor('arrow');
    this.redraw();
    app.show(this);
    this.events.inputMode(app.input ?? 'text');
  }

  key(k: Key): void {
    this.lastInput = this.clock;
    if (k.key.length === 1 && !k.ctrl && !k.alt) { this.keystrokes++; this.store.set('keystrokes', this.keystrokes); }
    if (k.key === 'Backspace') this.hesitate();
    // The keyboard itself; a game's pad is a pad, not keys.
    if (this.inputMode !== 'pad' && !k.ctrl) this.audio.sfx('key', k.key === ' ' ? 'space' : k.key === 'Enter' ? 'enter' : '');
    this.top?.key(this, k);
  }

  release(key: string): void { this.top?.release?.(this, key); }
  scroll(lines: number): void { if (lines) this.top?.scroll?.(this, lines); }

  /** The keys the page lets the program on top have. */
  get ctrlKeys(): readonly string[] { return this.top?.ctrlKeys ?? []; }
  get captureKeys(): readonly string[] { return this.top?.captureKeys ?? []; }

  /** The overlay changed: compose the frame again. */
  redraw(): void { this.overlayVersion++; }

  /** The frame as last shown, pointer and all: what a camera in the room would have caught. */
  snapshot(): Uint8Array {
    const out = this.composed.slice();
    this.stampPointer(out);
    return out;
  }

  /** A trace of second thoughts: BACKSPACE, an undo, a rubbed-out line, a wrong letter. */
  hesitate(): void { this.hesitations++; this.store.set('hesitations', this.hesitations); }

  /** Seconds since the visitor last did anything. */
  get idle(): number { return this.clock - this.lastInput; }

  /** What the counter on the screen shows: everything the visitor has put in. */
  get output(): number { return this.keystrokes + this.clicks; }

  pointer(p: PointerInput): void {
    this.lastInput = this.clock;
    if (p.phase === 'down' && p.primary) { this.clicks++; this.store.set('clicks', this.clicks); }
    const visible = p.kind === 'mouse' && p.inside && p.phase !== 'leave';
    if (visible !== this.mouse.visible || p.x !== this.mouse.x || p.y !== this.mouse.y || p.kind !== this.mouse.kind) {
      Object.assign(this.mouse, { x: p.x, y: p.y, visible, kind: p.kind });
      this.mouseVersion++;
    }
    this.top?.pointer?.(this, { ...p, lx: p.x / this.scale, ly: p.y / this.scale });
  }

  wheel(lines: number, at: { x: number; y: number } | null): void {
    if (!lines) return;
    this.lastInput = this.clock;
    const top = this.top;
    if (top?.wheel) top.wheel(this, lines, at && { x: at.x / this.scale, y: at.y / this.scale });
    else top?.scroll?.(this, lines);
  }

  /** The pointer's shape over what it points at. */
  cursor(shape: CursorShape): void {
    if (shape === this.mouse.shape) return;
    this.mouse.shape = shape;
    this.mouseVersion++;
  }

  /** What the screen says: the text page, and whatever the program on top adds. */
  describe(): string {
    const grid = Array.from({ length: this.rows }, (_, y) => rowText(this.grid, y)).join('\n');
    const more = this.top?.describe?.(this);
    return more ? `${grid}\n${more}` : grid;
  }
  /** Tells the page whether a line is being edited now (focus moved into or out of a field). */
  refreshInput(): void { this.events.inputMode(this.inputMode); }
  tick(dt: number): void { this.clock += dt; this.top?.tick?.(this, dt); }

  /** The graphics layer, created on first use. Call `present()` after drawing into it. */
  graphics(): Uint8Array {
    if (!this.bitmap) this.bitmap = new Uint8Array(RASTER_W * RASTER_H);
    if (this.mode === 'text') this.mode = 'graphics';
    return this.bitmap;
  }
  present(): void { this.bitmapVersion++; }
  setMode(mode: DisplayMode): void {
    this.mode = mode;
    if (mode === 'text') this.bitmap = null;
  }

  announce(text: string): void { this.events.announce(text); }
  openUrl(url: string): void { this.events.openUrl(url); }
  exit(): void { this.events.exit(); }
  /** Pictures are read once and kept: the boot loader reads them ahead of time. */
  loadPicture(url: string): Promise<Picture> {
    let p = this.pictures.get(url);
    if (!p) {
      p = this.events.loadPicture(url);
      this.pictures.set(url, p);
      p.catch(() => this.pictures.delete(url));
    }
    return p;
  }

  /**
   * Composes the frame into the beam raster. Text lies over graphics or static with
   * blank cells left transparent; the pointer goes over everything. Returns whether
   * anything changed.
   */
  render(raster: Uint8Array, time: number, zoom: 1 | 2): boolean {
    if (!this.glyphs) return false;
    const blink = blinkPhase(time);
    const staticMode = this.mode === 'static';
    const page = staticMode || this.drawn.grid !== this.grid.version || this.drawn.bitmap !== this.bitmapVersion
      || this.drawn.blink !== blink || this.drawn.mode !== this.mode || this.drawn.overlay !== this.overlayVersion;
    if (!page && this.drawn.mouse === this.mouseVersion) return false;
    if (page) {
      const out = this.composed;
      if (staticMode) rasterizeStatic(out, time, 777);
      else if (this.mode === 'graphics' && this.bitmap) out.set(this.bitmap);
      rasterizeText(this.grid, this.glyphs, out, time, zoom, this.mode !== 'text');
      const top = this.top;
      if (top?.overlay) {
        if (this.overlayGfx?.glyphs !== this.glyphs) this.overlayGfx = new Gfx(out, this.glyphs, this.scale);
        this.overlayGfx.reset();
        top.overlay(this, this.overlayGfx);
      }
    }
    raster.set(this.composed);
    this.stampPointer(raster);
    this.drawn = { grid: this.grid.version, bitmap: this.bitmapVersion, blink, mode: this.mode, mouse: this.mouseVersion, overlay: this.overlayVersion };
    return true;
  }

  private stampPointer(raster: Uint8Array): void {
    const { x, y, visible, shape } = this.mouse;
    if (!visible || shape === 'none') return;
    const c = CURSORS[shape], s = this.scale;
    const ox = Math.round(x) - c.hx * s, oy = Math.round(y) - c.hy * s;
    c.rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const colour = c.ink[row[rx]];
        if (colour === undefined) continue;
        const v = typeof colour === 'number' ? colour : INK[colour];
        for (let dy = 0; dy < s; dy++) {
          const py = oy + ry * s + dy;
          if (py < 0 || py >= RASTER_H) continue;
          for (let dx = 0; dx < s; dx++) {
            const px = ox + rx * s + dx;
            if (px >= 0 && px < RASTER_W) raster[py * RASTER_W + px] = v;
          }
        }
      }
    });
  }
}
