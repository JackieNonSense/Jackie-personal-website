import { ATTR, clearGrid } from '../../crt/grid';
import { strWidth } from '../../crt/font';
import { W } from '../../graphics/bitmap';
import { MODEM_CPS, Teletype } from '../teletype';
import { Gfx, PATTERNS } from '../gui/gfx';
import { drawFrame, TITLE_H } from '../gui/window';
import { well } from '../gui/widgets';
import { text } from '../screen';
import type { Text } from '../i18n';
import type { App, Key, Machine, Pointer } from '../machine';

/** One thing JR-DESK reads while loading; `load` reads it for real. */
export type PreloadItem = { name: string; size?: number; load?: () => Promise<unknown> };

/** The maker's ident: what comes on first on the black screen, and the mark it leaves. */
export type Ident = {
  /** What a screen reader hears while it plays. */
  name: string;
  /** Frames a second it moves at, when fewer than the screen's: it is drawn only when a new one is due. */
  fps?: number;
  /** Seconds it runs: for a first visit, a returning one, or a visitor who wants less motion. */
  length(returning: boolean, still: boolean): number;
  /** Its frame at `t` of `length` seconds, onto the graphics page (palette indices, 640 x 400). */
  draw(page: Uint8Array, t: number, length: number, still: boolean, returning: boolean): void;
  /** The mark alone, `size` pixels square, top left at (x, y): for the BIOS corner and the loader. */
  badge(page: Uint8Array, x: number, y: number, size: number): void;
};

export type BootScript = {
  ident: Ident;
  product: string;
  bios(m: Machine): string[];
  drives(m: Machine): string[];
  biosId: string;
  config(m: Machine): string[];
  dos(m: Machine): string[];
  preload(m: Machine): PreloadItem[];
  user: string;
  greeting: Text;
  /** "Last call" line; `previous` is the last visit on this device, if any. */
  lastCall(previous: number | null, now: number): Text;
  next(m: Machine): App;
};

/** A stage of starting up. `tick` returns true when it is done; `skip` finishes it at once. */
interface Stage {
  enter(m: Machine): void;
  tick(m: Machine, dt: number): boolean;
  skip(m: Machine): void;
  /** What a stage drawn in pixels shows, for tests and screen readers. */
  describe?(): string;
}

const center = (s: string, cols: number) => ' '.repeat(Math.max(0, Math.floor((cols - strWidth(s)) / 2))) + s;

/** The ident on the black screen: it comes on, holds, and goes off like a set. */
class Splash implements Stage {
  private t = 0;
  private length = 0;
  private shown = -1;

  constructor(private readonly ident: Ident, private readonly returning: boolean) {}

  enter(m: Machine): void {
    clearGrid(m.grid);
    m.grid.cursor.visible = false;
    this.length = this.ident.length(this.returning, m.still);
    m.announce(this.ident.name);
    this.draw(m);
  }

  private draw(m: Machine): void {
    const at = Math.min(this.t, this.length), fps = this.ident.fps;
    const frame = m.still ? 0 : fps ? Math.ceil(at * fps) : at;
    if (frame === this.shown) return;
    this.shown = frame;
    const b = m.graphics();
    b.fill(0);
    this.ident.draw(b, at, this.length, m.still, this.returning);
    m.present();
  }

  tick(m: Machine, dt: number): boolean {
    this.t += dt;
    if (this.t >= this.length) { m.graphics().fill(0); m.present(); return true; }
    this.draw(m);
    return false;
  }

  skip(): void { this.t = this.length; }
}

/** Text at a line speed: the POST, the configuration table, DOS starting. */
class Typed implements Stage {
  private tty: Teletype | null = null;
  private done = false;

  constructor(private readonly write: (t: Teletype, m: Machine) => void, private readonly ident?: Ident) {}

  enter(m: Machine): void {
    clearGrid(m.grid);
    m.grid.cursor.visible = true;
    this.tty = new Teletype(m.grid, line => { if (line.trim()) m.announce(line); });
    if (this.ident) {
      // The maker's mark in the corner, as BIOS screens had.
      const b = m.graphics();
      b.fill(0);
      this.ident.badge(b, W - 56 - 16, 12, 56);
      m.present();
    } else m.setMode('text');
    this.write(this.tty, m);
    this.tty.call(() => { this.done = true; });
  }

  tick(m: Machine, dt: number): boolean {
    this.tty!.tick(m.still ? 99 : dt);
    return this.done;
  }

  skip(): void { this.tty?.skip(); this.done = true; }
}

/**
 * JR-DESK loading, for real: every picture it will show is read now, a few at a
 * time, while a segmented bar fills and the names go by.
 */
class Loader implements Stage {
  private items: PreloadItem[] = [];
  private reading: boolean[] = [];
  private settled: boolean[] = [];
  private at = 0;
  private dwell = 0;
  private total = 0;
  private log: string[] = [];

  constructor(private readonly script: BootScript, private readonly returning: boolean) {}

  enter(m: Machine): void {
    this.items = this.script.preload(m);
    this.reading = this.items.map(() => false);
    this.settled = this.items.map(it => !it.load);
    m.announce(`Loading ${this.script.product}.`);
    this.draw(m);
  }

  /** Reads ahead, three at a time. */
  private start(): void {
    let busy = this.reading.filter((r, i) => r && !this.settled[i]).length;
    for (let i = this.at; i < this.items.length && busy < 3; i++) {
      const load = this.items[i].load;
      if (this.reading[i] || !load) continue;
      this.reading[i] = true;
      busy++;
      load().then(() => { this.settled[i] = true; }, () => { this.settled[i] = true; this.log.push(`${this.items[i].name}  CRC ERROR`); });
    }
  }

  tick(m: Machine, dt: number): boolean {
    this.total += dt;
    this.dwell += dt;
    this.start();
    // Each name shows for a moment, even when the file was read long ago.
    const least = m.still ? 0 : this.returning ? 0.025 : 0.07;
    while (this.at < this.items.length && this.settled[this.at] && this.dwell >= least) {
      const it = this.items[this.at];
      this.log.push(`${it.name.padEnd(20)} ${String(it.size ?? '').padStart(7)}  OK`);
      this.at++;
      this.dwell = 0;
    }
    this.draw(m);
    // Give up waiting after a while: the rest goes on reading in the background.
    return this.at >= this.items.length || this.total > 8;
  }

  skip(): void { this.total = Infinity; }

  private draw(m: Machine): void {
    const g = m.grid, cols = g.cols;
    clearGrid(g);
    g.cursor.visible = false;
    const b = m.graphics();
    b.fill(0);
    this.script.ident.badge(b, Math.floor((W - 64) / 2), m.narrow ? 44 : 60, 64);
    m.present();
    const row = m.narrow ? 5 : 9;
    text(g, 0, row, center(this.script.product.split('').join(' '), cols), ATTR.bright);
    const width = m.narrow ? 30 : 50, done = this.items.length ? this.at / this.items.length : 1;
    const filled = Math.min(width, Math.floor(done * width)), left = Math.floor((cols - width - 2) / 2);
    text(g, left, row + 2, '[', ATTR.dim);
    text(g, left + 1, row + 2, '█'.repeat(filled) + (filled < width ? '▓' : ''));
    text(g, left + 2 + filled, row + 2, '░'.repeat(Math.max(0, width - filled - 1)), ATTR.dim);
    text(g, left + width + 1, row + 2, ']', ATTR.dim);
    const current = this.items[this.at];
    if (current) text(g, 0, row + 4, center(`Loading ${current.name} ...`, cols));
    // The phone's page has room for one line of the log above the hint.
    const lines = m.narrow ? 1 : 6, first = m.narrow ? row + 5 : row + 6;
    this.log.slice(-lines).forEach((l, i) => text(g, 0, first + i, center(l, cols), ATTR.dim));
    text(g, 0, g.rows - 1, center(m.t({ en: 'ESC skips', zh: 'ESC 跳过' }), cols), ATTR.dim);
  }
}

/**
 * The login: the user is filled in, and the password types itself, a star at a
 * time, unevenly, as a hand would. Nobody at the keyboard typed it.
 */
class Login implements Stage {
  private t = 0;
  private stars = 0;
  private next = 0.6;
  private pressed = -1;
  private said = '';

  constructor(private readonly script: BootScript) {}

  enter(m: Machine): void {
    clearGrid(m.grid);
    m.grid.cursor.visible = false;
    m.announce(m.t({ en: `Logging in as ${this.script.user}.`, zh: `以 ${this.script.user} 身份登录。` }));
    this.draw(m);
  }

  /** The first window the visitor sees: the desk behind it, the two fields, and OK. */
  private draw(m: Machine): void {
    const g = new Gfx(m.graphics(), m.glyphs!, m.scale);
    g.pattern({ x: 0, y: 0, w: g.width, h: g.height }, PATTERNS[m.theme.pattern], 'deskAlt', 'desk');
    const w = Math.min(300, g.width - 8), h = 132;
    const r = { x: Math.floor((g.width - w) / 2), y: Math.floor((g.height - h) / 2), w, h };
    drawFrame(g, r, this.script.product, { lit: true, shadow: true });
    const user = m.t({ en: 'User', zh: '用户' }), pass = m.t({ en: 'Password', zh: '密码' });
    const label = Math.max(strWidth(user), strWidth(pass)) * 8 + 16, x = r.x + 14, fw = r.w - 28 - label;
    const top = r.y + TITLE_H + 12;
    g.text(x, top + 3, user, 'faceText');
    const f1 = well(g, { x: x + label, y: top, w: fw, h: 22 }, 'field');
    g.text(f1.x + 3, f1.y + 1, this.script.user, 'fieldText');
    g.text(x, top + 33, pass, 'faceText');
    const f2 = well(g, { x: x + label, y: top + 30, w: fw, h: 22 }, 'field');
    const typed = g.text(f2.x + 3, f2.y + 1, '*'.repeat(this.stars), 'fieldText');
    if (this.pressed < 0) g.fill({ x: f2.x + 3 + typed, y: f2.y + 2, w: 2, h: 14 }, 'fieldText');
    const ok = { x: r.x + Math.floor((r.w - 80) / 2), y: r.y + r.h - 32, w: 80, h: 22 }, down = this.pressed >= 0;
    g.fill(ok, 'face'); g.rect(ok, 'frame');
    g.rect({ x: ok.x + 1, y: ok.y + 1, w: ok.w - 2, h: ok.h - 2 }, 'frame');
    g.bevel({ x: ok.x + 2, y: ok.y + 2, w: ok.w - 4, h: ok.h - 4 }, down ? 'pressed' : 'raised');
    g.text(ok.x + 32 + (down ? 1 : 0), ok.y + 3 + (down ? 1 : 0), 'OK', 'faceText');
    m.present();
    this.said = g.runs.map(r => r.text).join('\n');
  }

  describe(): string { return this.said; }

  tick(m: Machine, dt: number): boolean {
    this.t += dt;
    if (m.still) return true;
    if (this.stars < 8 && this.t >= this.next) {
      this.stars++;
      m.audio.sfx('key');
      // Uneven, as a hand types: some quick, some after a pause.
      this.next = this.t + 0.09 + ((this.stars * 7919) % 11) / 40;
      this.draw(m);
    } else if (this.stars === 8 && this.pressed < 0 && this.t >= this.next + 0.35) {
      this.pressed = this.t;
      m.audio.sfx('key', 'enter');
      this.draw(m);
    }
    return this.pressed >= 0 && this.t - this.pressed > 0.35;
  }

  skip(m: Machine): void { this.stars = 8; this.pressed = 0; this.t = 1; this.draw(m); }
}

/** Welcome back. Then the desk. */
class Greeting implements Stage {
  private t = 0;
  constructor(private readonly script: BootScript, private readonly previous: number | null) {}

  enter(m: Machine): void {
    clearGrid(m.grid);
    m.setMode('text');
    m.grid.cursor.visible = false;
    const top = Math.floor(m.rows / 2) - 2;
    const hello = m.t(this.script.greeting), call = m.t(this.script.lastCall(this.previous, Date.now()));
    text(m.grid, 0, top, center(hello, m.cols), ATTR.bright);
    // On the narrow page the last call takes two lines, split at its comma.
    const lines = strWidth(call) <= m.cols ? [call] : call.split(/(?<=[,，])\s*/);
    lines.forEach((line, i) => text(m.grid, 0, top + 2 + i, center(line, m.cols), ATTR.dim));
    m.announce(`${hello} ${call}`);
  }

  tick(m: Machine, dt: number): boolean { this.t += dt; return this.t > (m.still ? 0.8 : 2.2); }
  skip(): void { this.t = Infinity; }
}

const LOGIN = 5;

/**
 * Switching on: the mark, the BIOS, DOS, JR-DESK loading, the login, and a greeting.
 * Any key finishes the stage showing; ESC goes straight to the login. Returning
 * visitors get a shorter start; a visitor who asks for less motion, a short one.
 */
export class BootApp implements App {
  private stages: Stage[] = [];
  private index = -1;
  private visits = 0;
  private previous: number | null = null;

  constructor(private readonly script: BootScript) {}

  show(m: Machine): void {
    if (this.index >= 0) return;
    this.visits = m.store.get('visits', 0) + 1;
    this.previous = m.store.get<number | null>('lastVisit', null);
    m.store.set('visits', this.visits);
    m.store.set('lastVisit', Date.now());
    m.store.set('calls', [...m.store.get<number[]>('calls', []), Date.now()].slice(-30));
    const returning = this.visits > 1, s = this.script;
    this.stages = [
      new Splash(s.ident, returning),
      new Typed((t, mm) => post(t, mm, s, returning), s.ident),
      new Typed((t, mm) => {
        for (const line of s.config(mm)) t.print(line, line.includes(':') ? 0 : ATTR.dim, 2400);
        t.print('').print('Verifying DMI Pool Data ', 0, 900, false).print('........', 0, 18).print(' OK', 0, 900).pause(0.3);
      }),
      new Typed((t, mm) => {
        t.call(() => mm.audio.sfx('disk', '1.2'), false);
        for (const line of s.dos(mm)) t.print(line, 0, 900).pause(0.08);
        t.pause(0.4);
      }),
      new Loader(s, returning),
      new Login(s),
      new Greeting(s, this.previous),
    ];
    this.advance(m);
  }

  private advance(m: Machine): void {
    this.index++;
    const stage = this.stages[this.index];
    if (stage) stage.enter(m);
    else m.replace(this.script.next(m));
  }

  tick(m: Machine, dt: number): void {
    if (this.stages[this.index]?.tick(m, dt)) this.advance(m);
  }

  key(m: Machine, { key }: Key): void {
    this.stages[this.index]?.skip(m);
    // ESC: straight to the login; whatever is loading goes on loading.
    if (key === 'Escape' && this.index < LOGIN) this.index = LOGIN - 1;
    this.advance(m);
  }

  describe(): string { return this.stages[this.index]?.describe?.() ?? ''; }

  /** A click does what any key does: the stage showing finishes. */
  pointer(m: Machine, p: Pointer): void { if (p.phase === 'down') this.key(m, { key: ' ', ctrl: false }); }
}

/** The power-on self test, in the layout of the BIOS screens of the time. */
function post(t: Teletype, m: Machine, s: BootScript, returning: boolean): void {
  t.call(() => m.audio.sfx('beep'), false);
  for (const line of s.bios(m)) t.print(line, line.startsWith('JR') ? ATTR.bright : 0, 1200);
  if (returning || m.still) t.print('Memory Test :  7488K OK', 0, 1200);
  else {
    t.print('Memory Test : ', 0, 1200, false);
    for (let k = 0; k <= 7488; k += 512) {
      t.print(`${String(k).padStart(5)}K`, 0, 2000, false).pause(0.035);
      t.call(() => t.write('\b'.repeat(6)));
    }
    t.print(' 7488K OK', 0, 1200);
  }
  t.print('');
  t.call(() => m.audio.sfx('disk', '0.6'), false);
  for (const line of s.drives(m)) t.print(line, 0, 1200).pause(0.12);
  // The last two lines sit at the bottom of the screen, where the BIOS put them.
  t.call(() => {
    text(m.grid, 0, m.rows - 2, m.narrow ? 'DEL: SETUP' : 'Press DEL to enter SETUP', ATTR.dim);
    text(m.grid, 0, m.rows - 1, s.biosId, ATTR.dim);
  });
  t.pause(returning ? 0.3 : 0.8);
}

/** Leaving: the session closes and the tube goes dark. */
export class LogoffApp implements App {
  private tty: Teletype | null = null;
  show(m: Machine): void {
    this.tty = new Teletype(m.grid, line => { if (line.trim()) m.announce(line); });
    clearGrid(m.grid);
    m.setMode('text');
    m.audio.music(null);
    this.tty.print('').print(m.t({ en: '  Closing session...', zh: '  正在关闭会话……' }), 0, MODEM_CPS).pause(0.9)
      .call(() => m.exit());
  }
  tick(_m: Machine, dt: number): void { this.tty?.tick(dt); }
  key(): void { this.tty?.skip(); }
  pointer(_m: Machine, p: Pointer): void { if (p.phase === 'down') this.tty?.skip(); }
}
