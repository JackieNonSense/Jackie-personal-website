import { clearGrid } from '../../crt/grid';
import { strWidth } from '../../crt/font';
import { contains, intersect, type Rect } from './geometry';
import { Gfx, PATTERNS, type Icon, type TextRun } from './gfx';
import { GLYPH } from './icons';
import { TITLE_H, Window, type WindowPart } from './window';
import { CLICK, DRAG, Widget, type DrawState, type GuiEvent, type GuiHost, type MenuItem, type WindowSpec } from './widget';
import { Button } from './widgets';
import { clip, clock, wrap } from '../screen';
import type { CursorShape } from './cursors';
import type { Text } from '../i18n';
import type { App, Key, Machine, Pointer } from '../machine';

/** The bar along the top of the screen. */
export const BAR_H = 18;
/** A desk icon's cell: the picture and its name under it. */
export const ICON_CELL = { w: 72, h: 58 };

export type DeskIcon = { id: string; label: Text; icon: Icon; open(host: GuiHost): void };

export type DesktopConfig = {
  icons: DeskIcon[];
  /** The menu under the mark at the left of the top bar. */
  menu: MenuItem[];
  /** The mark itself, 16 pixels square. */
  mark: Icon;
  /** What to open the first time the desk comes up. */
  start?(host: GuiHost): void;
  /** Shown in the top bar until the visitor has clicked something. */
  tip?: Text;
  /** A screen saver, for when nobody has touched anything for a minute. */
  saver?(m: Machine): App | null;
};

type Popup = { items: MenuItem[]; r: Rect; hover: number; from: 'mark' | 'point' };
type Press = {
  x: number; y: number; time: number; threshold: number; kind: Pointer['kind'];
  what: 'widget' | WindowPart | 'icon' | 'menu' | 'mark' | 'desk';
  widget?: Widget; window?: Window; icon?: number;
  origin?: Rect; dragging: boolean;
};
type Zoom = { from: Rect; to: Rect; t: number };
type Layer = { rect: Rect | null; runs: TextRun[] };

const MENU_ITEM = 18, MENU_GAP = 7;
/** Seconds of quiet before the screen saver comes on. */
export const SAVER_AFTER = 60;

/**
 * JR-DESK: the pixel desk. A bar along the top with the mark (and its menu), the
 * clock and the counter; icons on the desk; windows over them. A single click on
 * an icon opens it; windows move by their title bars and close with the box in the
 * corner. Everything also answers the keys: arrows, ENTER and ESC.
 */
export class Desktop implements App, GuiHost {
  /** TAB walks the controls of the window in front. */
  readonly captureKeys = ['Tab'];
  m!: Machine;
  private g: Gfx | null = null;
  /** Open windows, bottom to top. */
  private readonly windows: Window[] = [];
  private readonly made = new Map<string, Window>();
  /** Everything needs drawing again. */
  private dirty = true;
  /** Only what lies over the other windows: the front window, the zoom, the bar and the menu. */
  private frontDirty = false;
  private started = false;
  focused: Widget | null = null;
  private hover: Widget | null = null;
  private press: Press | null = null;
  private lastClick: { time: number; x: number; y: number; key: unknown } | null = null;
  private menu: Popup | null = null;
  private selectedIcon = -1;
  private positions: Record<string, { x: number; y: number }> = {};
  private shown = { minute: -1, output: -1, tip: false, theme: '' };
  private zoom: Zoom | null = null;
  /** Text as last drawn, layer by layer, for describe(). */
  private layers: Layer[] = [];
  /**
   * The desk and the windows behind the front one, as last drawn. While only the front
   * window changes (it is being dragged about, or pulled bigger), just it is drawn again.
   */
  private behind: { page: Uint8Array; layers: Layer[]; windows: Window[] } | null = null;

  constructor(private readonly config: DesktopConfig) {}

  // ── The program ──────────────────────────────────────────────────────────────

  show(m: Machine): void {
    this.m = m;
    clearGrid(m.grid);
    m.grid.cursor.visible = false;
    this.g = new Gfx(m.graphics(), m.glyphs!, m.scale);
    this.positions = m.store.get('icons', {});
    for (const w of this.made.values()) w.layout();
    if (!this.started) { this.started = true; this.config.start?.(this); }
    this.fit();
    m.cursor('arrow');
    this.dirty = true;
    this.compose();
    m.refreshInput();
  }

  hide(): void { this.press = null; this.menu = null; }

  tick(m: Machine, dt: number): void {
    for (const w of this.windows) {
      w.content.tick(dt);
      if (w.flash > 0) { w.flash = Math.max(0, w.flash - dt); this.dirty = true; }
    }
    if (this.zoom) { this.zoom.t += dt / 0.18; if (this.zoom.t >= 1) this.zoom = null; this.frontDirty = true; }
    const minute = Math.floor(Date.now() / 60000), tip = this.tipShowing;
    if (minute !== this.shown.minute || m.output !== this.shown.output || tip !== this.shown.tip) this.frontDirty = true;
    // Another tube draws the desk in its own pattern.
    if (m.theme.id !== this.shown.theme) this.dirty = true;
    if (this.config.saver && m.idle >= SAVER_AFTER && !this.press && !this.menu && !this.modal && m.top === this) {
      const saver = this.config.saver(m);
      if (saver) { m.push(saver); return; }
    }
    if (this.dirty || this.frontDirty) this.compose();
  }

  line(): string | null { return this.focused?.line() ?? null; }

  // ── What the desk is made of ─────────────────────────────────────────────────

  get deskRect(): Rect { const g = this.g!; return { x: 0, y: BAR_H, w: g.width, h: g.height - BAR_H }; }
  private get active(): Window | null { return this.windows[this.windows.length - 1] ?? null; }
  private get modal(): Window | null { const w = this.active; return w?.spec.modal ? w : null; }
  private get tipShowing(): boolean { return Boolean(this.config.tip) && this.m.clicks === 0 && !this.windows.length; }
  /** On a phone every window takes the whole desk. */
  private get small(): boolean { return this.m.scale === 2; }

  private iconRect(i: number): Rect {
    const icon = this.config.icons[i], d = this.deskRect, saved = this.positions[icon.id];
    if (this.small) {
      const cols = Math.max(1, Math.floor(d.w / 64));
      return { x: (i % cols) * 64, y: d.y + 6 + Math.floor(i / cols) * 58, w: 64, h: 58 };
    }
    if (saved) return { x: saved.x, y: saved.y, ...ICON_CELL };
    const rows = Math.max(1, Math.floor((d.h - 8) / ICON_CELL.h));
    return { x: 6 + Math.floor(i / rows) * ICON_CELL.w, y: d.y + 6 + (i % rows) * ICON_CELL.h, ...ICON_CELL };
  }

  // ── The host's side ──────────────────────────────────────────────────────────

  invalidate(): void { this.dirty = true; }
  isOpen(id: string): boolean { return this.windows.some(w => w.id === id); }
  run(app: App): void { this.m.push(app); }
  beep(): void { this.m.audio.sfx('beep'); }

  open(spec: WindowSpec, from?: Rect): void {
    let w = this.made.get(spec.id);
    const d = this.deskRect;
    if (!w) {
      const size = { w: Math.min(spec.size.w, d.w), h: Math.min(spec.size.h, d.h) };
      const n = this.windows.length;
      const place = spec.place ?? 'cascade';
      const at = place === 'centre' ? { x: Math.floor((d.w - size.w) / 2), y: d.y + Math.floor((d.h - size.h) / 2) }
        : place === 'cascade' ? { x: 150 + (n % 6) * 18, y: d.y + 10 + (n % 6) * 18 } : place;
      w = new Window(spec, this, { ...size, x: Math.min(at.x, d.w - size.w), y: Math.min(at.y, d.y + d.h - size.h) });
      this.made.set(spec.id, w);
    }
    if (!this.windows.includes(w)) {
      this.windows.push(w);
      if (from && !this.m.still) this.zoom = { from, to: w.r, t: 0 };
      spec.onOpen?.(this);
    }
    this.fit();
    this.raise(w);
    this.m.announce(w.title(this.m));
  }

  close(id: string): void {
    const w = this.windows.find(x => x.id === id);
    if (!w || w.spec.onClose?.(this) === false) return;
    this.windows.splice(this.windows.indexOf(w), 1);
    if (this.focused && w.content !== this.focused && [...w.content.walk()].includes(this.focused)) this.setFocus(null);
    const top = this.active;
    if (top) this.raise(top); else this.setFocus(null);
    this.dirty = true;
  }

  focus(widget: Widget | null): void { this.setFocus(widget); }
  capture(widget: Widget | null): void { if (this.press) this.press.widget = widget ?? undefined; }

  popup(items: MenuItem[], at: { x: number; y: number }, from: Popup['from'] = 'point'): void {
    const m = this.m, g = this.g!;
    const labels = items.map(it => (it === 'separator' ? '' : m.t(it.label)));
    const w = Math.max(...labels.map(l => g.measure(l))) + 40;
    const h = items.reduce((s, it) => s + (it === 'separator' ? MENU_GAP : MENU_ITEM), 0) + 4;
    const x = Math.max(0, Math.min(at.x, g.width - w)), y = Math.max(BAR_H, Math.min(at.y, g.height - h));
    this.menu = { items, r: { x, y, w, h }, hover: -1, from };
    this.dirty = true;
  }

  private raise(w: Window): void {
    const i = this.windows.indexOf(w);
    if (i < 0) return;
    this.windows.splice(i, 1);
    this.windows.push(w);
    // The keys go where they went before; else to the first list or text, and only then to a button.
    const all = [...w.content.walk()].filter(x => x.focusable && x.visible);
    this.setFocus(w.focus && all.includes(w.focus) ? w.focus : all.find(x => !(x instanceof Button)) ?? all[0] ?? null);
    this.dirty = true;
  }

  private setFocus(widget: Widget | null): void {
    if (widget === this.focused) return;
    this.focused?.focusOut();
    this.focused = widget;
    widget?.focusIn();
    const w = widget && this.windowOf(widget);
    if (w) w.focus = widget;
    this.dirty = true;
    this.m.refreshInput();
  }

  private windowOf(widget: Widget): Window | null {
    let root: Widget = widget;
    while (root.parent) root = root.parent;
    return this.windows.find(w => w.content === root) ?? null;
  }

  /** Windows stay on the desk: maximised ones fill it; on a phone, they all do. */
  private fit(): void {
    const d = this.deskRect;
    for (const w of this.made.values()) {
      if (this.small) { w.maximise(d, true); continue; }
      if (w.maximised) { w.r = { ...d }; w.layout(); continue; }
      w.moveTo(Math.max(-w.r.w + 48, Math.min(d.w - 48, w.r.x)), Math.max(d.y, Math.min(d.y + d.h - TITLE_H, w.r.y)));
    }
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────

  private compose(): void {
    const m = this.m, g = this.g!, front = this.active, behind = this.behind;
    g.reset();
    const layer = (rect: Rect | null, draw: () => void) => { const at = g.runs.length; draw(); this.layers.push({ rect, runs: g.runs.slice(at) }); };
    const same = behind !== null && behind.page.length === g.page.length && behind.windows.length === this.windows.length
      && behind.windows.every((w, i) => w === this.windows[i]);
    if (!this.dirty && same) {
      g.page.set(behind.page);
      this.layers = [...behind.layers];
    } else {
      this.layers = [];
      layer(null, () => { this.drawDesk(g); this.drawIcons(g); });
      for (const w of this.windows) if (w !== front) layer(w.r, () => this.paintWindow(g, w, false));
      const page = behind?.page.length === g.page.length ? behind.page : new Uint8Array(g.page.length);
      page.set(g.page);
      this.behind = { page, layers: [...this.layers], windows: [...this.windows] };
    }
    if (front) layer(front.r, () => this.paintWindow(g, front, true));
    if (this.zoom) this.drawZoom(g, this.zoom);
    layer({ x: 0, y: 0, w: g.width, h: BAR_H }, () => this.drawBar(g));
    if (this.menu) { const menu = this.menu; layer(menu.r, () => this.drawMenu(g, menu)); }
    m.present();
    this.dirty = false;
    this.frontDirty = false;
    this.shown = { minute: Math.floor(Date.now() / 60000), output: m.output, tip: this.tipShowing, theme: m.theme.id };
  }

  private paintWindow(g: Gfx, w: Window, active: boolean): void {
    const pressed = this.press?.what === 'widget' && this.press.widget === this.hover ? this.hover : null;
    const s: DrawState = { m: this.m, active, focus: this.focused, hover: this.hover, pressed };
    w.paint(g, s);
  }

  private drawDesk(g: Gfx): void {
    g.pattern(this.deskRect, PATTERNS[this.m.theme.pattern], 'deskAlt', 'desk');
  }

  private drawIcons(g: Gfx): void {
    const m = this.m;
    this.config.icons.forEach((icon, i) => {
      const r = this.iconRect(i), chosen = i === this.selectedIcon;
      const ix = r.x + Math.floor((r.w - icon.icon.w) / 2), iy = r.y + 2;
      g.icon(icon.icon, ix, iy);
      if (chosen) g.pattern({ x: ix, y: iy, w: icon.icon.w, h: icon.icon.h }, PATTERNS.half, 'select', null);
      // The name under it, on a strip of the desk's own label colour; two lines at most.
      const lines = wrap(m.t(icon.label), Math.floor((r.w + 8) / 8)).slice(0, 2);
      lines.forEach((line, k) => {
        const text = clip(line, Math.floor((r.w + 8) / 8)), w = strWidth(text) * 8;
        const x = r.x + Math.floor((r.w - w) / 2), y = iy + icon.icon.h + 2 + k * 16;
        g.fill({ x: x - 2, y, w: w + 4, h: 16 }, chosen ? 'select' : 'deskLabel');
        g.text(x, y, text, chosen ? 'selectText' : 'deskText');
      });
    });
  }

  private drawZoom(g: Gfx, z: Zoom): void {
    // The window growing out of its icon: a few outlines, as the old desks drew it.
    for (let k = 0; k < 3; k++) {
      const t = Math.max(0, Math.min(1, z.t - k * 0.12)), e = t * t * (3 - 2 * t);
      const r = { x: z.from.x + (z.to.x - z.from.x) * e, y: z.from.y + (z.to.y - z.from.y) * e, w: z.from.w + (z.to.w - z.from.w) * e, h: z.from.h + (z.to.h - z.from.h) * e };
      g.rect({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }, 'frame');
    }
  }

  private drawBar(g: Gfx): void {
    const m = this.m, bar = { x: 0, y: 0, w: g.width, h: BAR_H };
    g.fill(bar, 'bar');
    g.hline(0, BAR_H - 1, g.width, 'frame');
    const open = this.menu?.from === 'mark';
    const mark = { x: 0, y: 0, w: 26, h: BAR_H - 1 };
    if (open) g.fill(mark, 'select');
    g.icon(this.config.mark, 5, 1);
    const right = `${clock()}  ${String(m.output % 1_000_000).padStart(6, '0')}`;
    const rw = g.measure(right);
    g.text(g.width - rw - 6, 1, right, 'barText');
    const middle = this.tipShowing ? m.t(this.config.tip!) : this.active?.title(m) ?? 'JR-DESK';
    const room = g.width - 26 - rw - 20;
    const text = clip(middle, Math.floor(room / 8));
    g.text(26 + 8 + Math.max(0, Math.floor((room - g.measure(text)) / 2)), 1, text, 'barText', { bold: !this.tipShowing });
  }

  private drawMenu(g: Gfx, menu: Popup): void {
    const m = this.m, r = menu.r;
    g.pattern({ x: r.x + 3, y: r.y + r.h, w: r.w, h: 3 }, PATTERNS.half, 'dropShadow', null);
    g.pattern({ x: r.x + r.w, y: r.y + 3, w: 3, h: r.h }, PATTERNS.half, 'dropShadow', null);
    g.fill(r, 'face'); g.rect(r, 'frame');
    let y = r.y + 2;
    menu.items.forEach((it, i) => {
      if (it === 'separator') { g.hline(r.x + 4, y + 3, r.w - 8, 'shadow'); y += MENU_GAP; return; }
      const row = { x: r.x + 2, y, w: r.w - 4, h: MENU_ITEM }, live = it.enabled?.(m) ?? true, on = i === menu.hover && live;
      if (on) g.fill(row, 'select');
      const colour = on ? 'selectText' : live ? 'faceText' : 'faceDim';
      if (it.checked?.(m)) g.icon(GLYPH.check, row.x + 5, row.y + 5, { '#': colour });
      g.text(row.x + 22, row.y + 1, m.t(it.label), colour);
      y += MENU_ITEM;
    });
  }

  private menuItemAt(x: number, y: number): number {
    const menu = this.menu;
    if (!menu || !contains(menu.r, x, y)) return -1;
    let at = menu.r.y + 2;
    for (let i = 0; i < menu.items.length; i++) {
      const h = menu.items[i] === 'separator' ? MENU_GAP : MENU_ITEM;
      if (y >= at && y < at + h) return menu.items[i] === 'separator' ? -1 : i;
      at += h;
    }
    return -1;
  }

  private runMenu(i: number): void {
    const it = this.menu?.items[i];
    this.menu = null;
    this.dirty = true;
    if (it && it !== 'separator' && (it.enabled?.(this.m) ?? true)) it.run(this);
  }

  // ── The pointer ──────────────────────────────────────────────────────────────

  pointer(m: Machine, p: Pointer): void {
    if (!p.primary) return;
    const x = p.lx, y = p.ly;
    if (p.phase === 'down') this.down(p, x, y);
    else if (p.phase === 'move') this.move(p, x, y);
    else if (p.phase === 'up') this.up(p, x, y);
    else if (p.phase === 'cancel' || p.phase === 'leave') {
      if (p.phase === 'cancel') this.press = null;
      if (!this.press) this.setHover(null);
      this.dirty = true;
    }
  }

  private gui(type: GuiEvent['type'], p: Pointer, x: number, y: number): GuiEvent {
    const press = this.press;
    return { type, x, y, dx: press ? x - press.x : 0, dy: press ? y - press.y : 0, kind: p.kind, time: p.time, shift: p.shift };
  }

  private deliver(widget: Widget, e: GuiEvent): void {
    for (let w: Widget | null = widget; w; w = w.parent) if (w.enabled && w.event?.(e)) return;
  }

  private down(p: Pointer, x: number, y: number): void {
    const threshold = ((p.kind === 'mouse' ? DRAG.mouse : DRAG.touch) * p.pxPerCss) / this.m.scale;
    const press: Press = { x, y, time: p.time, threshold, kind: p.kind, what: 'desk', dragging: false };
    this.press = press;
    // An open menu takes the click; anywhere else closes it, and that is all the click does.
    if (this.menu) {
      if (contains(this.menu.r, x, y)) { press.what = 'menu'; this.menu.hover = this.menuItemAt(x, y); this.dirty = true; return; }
      this.menu = null; this.dirty = true; this.press = null;
      return;
    }
    const modal = this.modal;
    if (modal && !contains(modal.r, x, y)) { this.beep(); modal.flash = 0.5; this.press = null; return; }
    if (y < BAR_H) {
      if (x < 26) { press.what = 'mark'; this.popup(this.config.menu, { x: 0, y: BAR_H }, 'mark'); }
      return;
    }
    for (let i = this.windows.length - 1; i >= 0; i--) {
      const w = this.windows[i], part = w.part(x, y);
      if (!part) continue;
      if (w !== this.active) this.raise(w);
      press.window = w;
      press.what = part;
      press.origin = { ...w.r };
      if (part === 'content') {
        const widget = w.content.at(x, y);
        if (widget) {
          press.what = 'widget';
          press.widget = widget;
          let focusable: Widget | null = widget;
          while (focusable && !focusable.focusable) focusable = focusable.parent;
          if (focusable) this.setFocus(focusable);
          this.deliver(widget, this.gui('down', p, x, y));
        }
      }
      this.dirty = true;
      return;
    }
    const icon = this.config.icons.findIndex((_, i) => contains(this.iconRect(i), x, y));
    if (icon >= 0) {
      press.what = 'icon'; press.icon = icon; press.origin = this.iconRect(icon);
      this.selectedIcon = icon;
      this.dirty = true;
      return;
    }
    this.selectedIcon = -1;
    this.dirty = true;
  }

  private move(p: Pointer, x: number, y: number): void {
    const press = this.press;
    if (!press) { this.track(x, y); return; }
    if (press.what === 'menu') {
      const i = this.menuItemAt(x, y);
      if (i !== this.menu?.hover && this.menu) { this.menu.hover = i; this.dirty = true; }
      return;
    }
    if (!press.dragging && Math.hypot(x - press.x, y - press.y) >= press.threshold) {
      press.dragging = true;
      if (press.what === 'widget' && press.widget) this.deliver(press.widget, this.gui('dragstart', p, x, y));
    }
    if (press.what === 'widget' && press.widget) {
      const over = press.window?.content.at(x, y) ?? null;
      if (over !== this.hover) this.setHover(over);
      if (press.dragging) this.deliver(press.widget, this.gui('drag', p, x, y));
      return;
    }
    if (!press.dragging || !press.origin) return;
    const d = this.deskRect, dx = x - press.x, dy = y - press.y;
    if (press.what === 'title' && press.window && !press.window.maximised && !this.small) {
      const w = press.window, o = press.origin;
      w.moveTo(Math.max(-o.w + 48, Math.min(d.w - 48, o.x + dx)), Math.max(d.y, Math.min(d.y + d.h - TITLE_H, o.y + dy)));
      this.m.cursor('move');
      // The window pressed on came to the front, so nothing behind it changes.
      this.frontDirty = true;
    } else if (press.what === 'grip' && press.window) {
      const o = press.origin;
      press.window.resize(Math.min(d.w - o.x, o.w + dx), Math.min(d.y + d.h - o.y, o.h + dy));
      this.frontDirty = true;
    } else if (press.what === 'icon' && press.icon !== undefined && !this.small) {
      const o = press.origin;
      this.positions[this.config.icons[press.icon].id] = { x: Math.round(Math.max(0, Math.min(d.w - o.w, o.x + dx))), y: Math.round(Math.max(d.y, Math.min(d.y + d.h - o.h, o.y + dy))) };
      this.m.cursor('move');
      this.dirty = true;
    }
  }

  private up(p: Pointer, x: number, y: number): void {
    const press = this.press;
    this.press = null;
    if (!press) return;
    this.dirty = true;
    if (press.what === 'menu') { const i = this.menuItemAt(x, y); if (i >= 0) this.runMenu(i); return; }
    if (press.what === 'widget' && press.widget) {
      const widget = press.widget;
      this.deliver(widget, this.gui(press.dragging ? 'dragend' : 'up', p, x, y));
      if (!press.dragging && widget.at(x, y)) {
        this.deliver(widget, this.gui('click', p, x, y));
        if (this.isDouble(p, x, y, widget)) this.deliver(widget, this.gui('dblclick', p, x, y));
      }
      this.track(x, y);
      return;
    }
    const w = press.window;
    if (w && press.what === 'close' && w.part(x, y) === 'close') { this.close(w.id); this.track(x, y); return; }
    if (w && press.what === 'max' && w.part(x, y) === 'max') { this.maximise(w); this.track(x, y); return; }
    if (w && press.what === 'title' && !press.dragging && this.isDouble(p, x, y, w) && (w.spec.resizable || w.spec.onMaximise)) { this.maximise(w); return; }
    if (press.what === 'icon' && press.icon !== undefined) {
      if (press.dragging) {
        // Dropped: snap to the grid and remember it.
        const id = this.config.icons[press.icon].id, at = this.positions[id];
        if (at) this.positions[id] = { x: Math.round(at.x / 8) * 8, y: Math.round(at.y / 8) * 8 };
        this.m.store.set('icons', this.positions);
      } else this.openIcon(press.icon);
    }
    this.track(x, y);
  }

  /** The box beside the close box: the window fills the desk, unless it has something better to do. */
  private maximise(w: Window): void {
    if (w.spec.onMaximise) w.spec.onMaximise(this);
    else w.maximise(this.deskRect);
    this.dirty = true;
  }

  private isDouble(p: Pointer, x: number, y: number, key: unknown): boolean {
    const last = this.lastClick;
    const double = Boolean(last && last.key === key && p.time - last.time < CLICK.double && Math.hypot(x - last.x, y - last.y) <= CLICK.slop);
    this.lastClick = double ? null : { time: p.time, x, y, key };
    return double;
  }

  private openIcon(i: number): void {
    const icon = this.config.icons[i];
    this.selectedIcon = i;
    const before = this.windows.length, r = this.iconRect(i);
    icon.open(this);
    if (this.windows.length > before && this.zoom === null && !this.m.still) this.zoom = { from: r, to: this.active!.r, t: 0 };
    this.dirty = true;
  }

  /** Hover: what the pointer is over, and what shape it takes there. */
  private track(x: number, y: number): void {
    let shape: CursorShape = 'arrow', widget: Widget | null = null;
    if (this.menu) {
      const i = this.menuItemAt(x, y);
      if (i !== this.menu.hover) { this.menu.hover = i; this.dirty = true; }
    } else if (y < BAR_H) {
      if (x < 26) shape = 'hand';
    } else {
      const w = [...this.windows].reverse().find(win => contains(win.r, x, y));
      if (w) {
        const part = w.part(x, y);
        if (part === 'content') { widget = w.content.at(x, y); shape = widget?.cursor ?? 'arrow'; }
        else if (part === 'grip') shape = 'resize';
      } else {
        if (this.config.icons.some((_, i) => contains(this.iconRect(i), x, y))) shape = 'hand';
      }
    }
    this.setHover(widget);
    this.m.cursor(shape);
  }

  private setHover(widget: Widget | null): void {
    if (widget === this.hover) return;
    if (this.hover?.hoverable || widget?.hoverable) this.dirty = true;
    this.hover = widget;
  }

  wheel(_m: Machine, lines: number, at: { x: number; y: number } | null): void {
    const w = at ? [...this.windows].reverse().find(win => contains(win.r, at.x, at.y)) : this.active;
    if (!w) return;
    let widget: Widget | null = at ? w.content.at(at.x, at.y) : this.focused;
    for (; widget; widget = widget.parent) if (widget.enabled && widget.wheel?.(lines)) return;
  }

  // ── The keys ─────────────────────────────────────────────────────────────────

  key(_m: Machine, k: Key): void {
    const menu = this.menu;
    if (menu) {
      const live = menu.items.map((it, i) => (it === 'separator' ? -1 : i)).filter(i => i >= 0);
      const at = live.indexOf(menu.hover);
      if (k.key === 'ArrowDown') menu.hover = live[(at + 1) % live.length];
      else if (k.key === 'ArrowUp') menu.hover = live[(at - 1 + live.length) % live.length];
      else if (k.key === 'Enter' && menu.hover >= 0) this.runMenu(menu.hover);
      else if (k.key === 'Escape') this.menu = null;
      this.dirty = true;
      return;
    }
    const w = this.active;
    if (w) {
      for (let x: Widget | null = this.focused; x; x = x.parent) if (x.enabled && x.key?.(k)) return;
      if (k.key === 'Escape') { this.close(w.id); return; }
      if (k.key === 'Tab') { this.cycleFocus(w, k.shift ? -1 : 1); return; }
      // ENTER that nothing else wanted presses the window's default button.
      if (k.key === 'Enter') {
        const button = [...w.content.walk()].find((x): x is Button => x instanceof Button && Boolean(x.o.isDefault) && x.visible && x.enabled);
        button?.onClick(this);
      }
      return;
    }
    // No window: the keys walk the icons.
    const n = this.config.icons.length;
    if (!n) return;
    const moves: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (k.key in moves) {
      this.selectedIcon = this.selectedIcon < 0 ? (moves[k.key] > 0 ? 0 : n - 1) : (this.selectedIcon + moves[k.key] + n) % n;
      this.dirty = true;
      return;
    }
    if (k.key === 'Enter' && this.selectedIcon >= 0) this.openIcon(this.selectedIcon);
  }

  private cycleFocus(w: Window, step: number): void {
    const all = [...w.content.walk()].filter(x => x.focusable && x.visible && x.enabled);
    if (!all.length) return;
    const i = this.focused ? all.indexOf(this.focused) : -1;
    this.setFocus(all[(i + step + all.length) % all.length]);
  }

  // ── What is on the screen ────────────────────────────────────────────────────

  describe(): string {
    const out: string[] = [];
    this.layers.forEach((layer, i) => {
      const above = this.layers.slice(i + 1).map(l => l.rect).filter(Boolean) as Rect[];
      for (const run of layer.runs) {
        const cx = run.x + run.w / 2, cy = run.y + run.h / 2;
        if (!above.some(r => contains(r, cx, cy))) out.push(run.text);
      }
    });
    return out.join('\n');
  }

  /** Where some text shows on the screen, topmost first; `within` a widget, when it has that id (for tests and scripts). */
  find(text: string, within?: string): Rect | null {
    const box = within ? this.locate(within) : null;
    if (within && !box) return null;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const above = this.layers.slice(i + 1).map(l => l.rect).filter(Boolean) as Rect[];
      const run = [...this.layers[i].runs].reverse().find(r => r.text.includes(text) && !above.some(a => contains(a, r.x + r.w / 2, r.y + r.h / 2))
        && (!box || contains(box, r.x + 1, r.y + r.h / 2)));
      if (run) {
        // Narrow to the words themselves, 8 pixels a character (16 for Chinese).
        const before = strWidth(run.text.slice(0, run.text.indexOf(text))) * 8;
        return { x: run.x + before, y: run.y, w: strWidth(text) * 8, h: run.h };
      }
    }
    return null;
  }

  /** Where a widget with this id is on the screen (for tests and scripts). */
  locate(id: string): Rect | null {
    for (const w of [...this.windows].reverse()) for (const x of w.content.walk()) if (x.id === id && x.visible) {
      const r = intersect(x.r, w.r);
      if (r) return r;
    }
    const i = this.config.icons.findIndex(icon => icon.id === id);
    return i >= 0 ? this.iconRect(i) : null;
  }

  /** Where an open window is (for tests and scripts). */
  rectOf(id: string): Rect | null { const w = this.windows.find(x => x.id === id); return w ? { ...w.r } : null; }

  /** The windows open now, bottom to top (for tests). */
  get openWindows(): string[] { return this.windows.map(w => w.id); }
}
