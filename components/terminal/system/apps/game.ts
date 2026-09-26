import { ATTR, clearGrid } from '../../crt/grid';
import { centered, padTo, statusBar, text } from '../screen';
import { ButtonTracker, closeBox, drawButtons } from '../gui/overlay';
import type { Gfx } from '../gui/gfx';
import type { Text } from '../i18n';
import type { Track } from '../../audio/types';
import type { App, Key, Machine, Pointer, PointerKind } from '../machine';

/**
 * What a game sees of the controls: keys held now, keys pressed since last frame,
 * and the pointer, in raster pixels, when there is one over the screen.
 */
export type GameInput = {
  held: ReadonlySet<string>;
  pressed: ReadonlySet<string>;
  pointer: { x: number; y: number; down: boolean; kind: PointerKind } | null;
};

/**
 * A game for the terminal. It draws into the graphics page (m.graphics()) or the text
 * page, and reports when it is over. Keys arrive normalised: Left, Right, Up, Down,
 * Fire (space, J, Z) and the raw key for anything else.
 */
export interface Game {
  readonly title: string;
  readonly music?: Track;
  readonly help: Text;
  /** Scores already on the machine's table, before the visitor's own. */
  readonly table?: readonly { name: string; score: number; date: string }[];
  reset(m: Machine): void;
  update(m: Machine, dt: number, input: GameInput): void;
  draw(m: Machine): void;
  readonly over: boolean;
  readonly score: number;
  /** Set when the program falls over: what DOS printed as it went. */
  readonly crash?: string | null;
}

const NAMES: Record<string, string> = {
  ArrowLeft: 'Left', a: 'Left', A: 'Left', ArrowRight: 'Right', d: 'Right', D: 'Right',
  ArrowUp: 'Up', w: 'Up', W: 'Up', ArrowDown: 'Down', s: 'Down', S: 'Down',
  ' ': 'Fire', j: 'Fire', J: 'Fire', z: 'Fire', Z: 'Fire', Enter: 'Fire',
};

/** Runs a game: title card, play, game over with the local best, ESC to leave. */
export class GameApp implements App {
  readonly input = 'pad' as const;
  private state: 'title' | 'play' | 'over' | 'crashed' = 'title';
  private held = new Set<string>();
  private pressed = new Set<string>();
  private previousMusic: Track | null = null;
  private readonly buttons = new ButtonTracker();
  private aim: GameInput['pointer'] = null;

  constructor(private readonly game: Game, private readonly id: string) {}

  show(m: Machine): void {
    this.previousMusic = m.audio.current;
    if (this.game.music) m.audio.music(this.game.music);
    this.game.reset(m);
    this.card(m);
    m.announce(`${this.game.title}. ${m.t(this.game.help)} ${m.t({ en: 'Press fire to start. Escape to leave.', zh: '按开火键开始，ESC 离开。' })}`);
  }

  hide(m: Machine): void { m.audio.music(this.previousMusic); }

  overlay(m: Machine, g: Gfx): void { if (this.state !== 'crashed') drawButtons(g, m, [closeBox(g.width)], this.buttons.hover, this.buttons.down); }

  /** The pointer steers; a press fires, or starts a game. */
  pointer(m: Machine, p: Pointer): void {
    if (this.state === 'crashed') { if (p.phase === 'down') m.pop(); return; }
    if (this.buttons.pointer(m, p, [closeBox(640 / m.scale)], () => m.pop())) return;
    m.cursor(this.state === 'play' ? 'cross' : 'arrow');
    const down = p.phase === 'down' || (p.phase === 'move' && (p.buttons & 1) === 1);
    this.aim = p.phase === 'leave' || p.phase === 'cancel' || (p.kind !== 'mouse' && p.phase === 'up') ? null : { x: p.x, y: p.y, down, kind: p.kind };
    if (p.phase !== 'down') return;
    if (this.state !== 'play') this.start(m);
    else this.pressed.add('Fire');
  }

  private start(m: Machine): void { this.state = 'play'; this.game.reset(m); clearGrid(m.grid); }

  private get best(): string { return `best:${this.id}`; }

  private card(m: Machine): void {
    const g = m.grid;
    this.game.draw(m);
    clearGrid(g);
    const mid = Math.floor(g.rows / 2) - 2;
    centered(g, mid, ` ${this.game.title} `, ATTR.inverse);
    if (this.state === 'over') {
      const best = m.store.get(this.best, 0);
      centered(g, mid + 2, `SCORE ${this.game.score}   BEST ${best}`, ATTR.bright);
    } else centered(g, mid + 2, m.t(this.game.help));
    centered(g, mid + 4, m.t(m.narrow ? { en: 'Tap to start', zh: '点一下开始' } : { en: 'Click to start', zh: '点一下开始' }), ATTR.blink);
    this.scores(m, mid + 6);
    statusBar(g, m.t(m.narrow ? { en: 'Your finger steers', zh: '手指控制方向' } : { en: 'The mouse steers  ·  or ←→ and SPACE', zh: '鼠标控制方向  ·  也可以用 ←→ 和空格' }));
  }

  /** The machine's high-score table, with the visitor's best in its place. */
  private scores(m: Machine, y: number): void {
    const table = this.game.table;
    // The narrow page has no room; GAMES\HISCORE.DAT holds the same table.
    if (!table?.length || m.narrow) return;
    const best = m.store.get(this.best, 0);
    const rows = [...table, ...(best ? [{ name: m.t({ en: 'YOU', zh: '你' }), score: best, date: '' }] : [])]
      .sort((a, b) => b.score - a.score).slice(0, Math.max(0, m.rows - y - 2));
    centered(m.grid, y, 'HIGH SCORES', ATTR.dim);
    rows.slice(0, 5).forEach((r, i) => {
      const line = `${String(i + 1)}. ${padTo(r.name, 8)} ${String(r.score).padStart(6)}  ${r.date || '          '}`;
      centered(m.grid, y + 1 + i, line, r.date ? 0 : ATTR.bright);
    });
  }

  key(m: Machine, { key, ctrl }: Key): void {
    if (ctrl) return;
    if (key === 'Escape' || key === 'Backspace' || this.state === 'crashed') { m.pop(); return; }
    const name = NAMES[key] ?? key;
    if (this.state !== 'play') {
      if (name === 'Fire') this.start(m);
      return;
    }
    if (!this.held.has(name)) this.pressed.add(name);
    this.held.add(name);
  }

  release(_m: Machine, key: string): void { this.held.delete(NAMES[key] ?? key); }

  /** The program has died: back at the prompt, with what it said as it went. Any key or click returns. */
  private fallOver(m: Machine, message: string): void {
    this.state = 'crashed';
    this.held.clear();
    if (this.game.score > m.store.get(this.best, 0)) m.store.set(this.best, this.game.score);
    m.setMode('text');
    clearGrid(m.grid);
    text(m.grid, 0, 1, message);
    text(m.grid, 0, 3, 'C:\\GAMES>');
    m.grid.cursor.visible = true;
    m.grid.cursor.x = 9; m.grid.cursor.y = 3;
    m.cursor('arrow');
    m.redraw();
    m.announce(message);
  }

  tick(m: Machine, dt: number): void {
    if (this.state !== 'play') return;
    this.game.update(m, Math.min(dt, 0.05), { held: this.held, pressed: this.pressed, pointer: this.aim });
    this.pressed.clear();
    if (this.game.crash) { this.fallOver(m, this.game.crash); return; }
    this.game.draw(m);
    if (this.game.over) {
      this.state = 'over';
      this.held.clear();
      if (this.game.score > m.store.get(this.best, 0)) m.store.set(this.best, this.game.score);
      this.card(m);
    }
  }
}
