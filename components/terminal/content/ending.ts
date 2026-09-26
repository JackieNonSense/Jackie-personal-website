import { ATTR, clearGrid } from '../crt/grid';
import { charWidth } from '../crt/font';
import { LogoffApp } from '../system/apps/boot';
import { strWidth } from '../system/screen';
import { MODEM_CPS, Teletype } from '../system/teletype';
import { ButtonTracker, drawButtons, type OverlayButton } from '../system/gui/overlay';
import type { Gfx } from '../system/gui/gfx';
import { drawings, loadDrawing } from './paint';
import { CANVAS } from '../graphics/paint';
import type { App, Key, Machine, Pointer } from '../system/machine';

/*
 * The end. Once the visitor has read the seed log, the line will not drop until
 * they give it something. Whatever they type is scored, accepted and numbered;
 * the number is the password the homepage asks for.
 */

/** Seen the log: from now on, logging off asks for a seed first (once). */
export function seedPending(m: Machine): boolean {
  return m.has('file:SYSTEM/SEED.LOG') && !m.has('seeded');
}

/** The session is already ending: the seed is being asked for, or the line is closing. */
export const ending = (m: Machine): boolean => m.top instanceof SeedApp || m.top instanceof LogoffApp;

/** Log off, by way of the seed when one is owed. */
export function logOff(m: Machine): void {
  m.push(seedPending(m) ? new SeedApp() : new LogoffApp());
}

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

function group(n: number): string {
  let out = '';
  for (let i = 0; i < 4; i++) { out += ALPHABET[n & 31]; n >>>= 5; }
  return out;
}

/**
 * The seed number: JR-XXXX-XXXX-CCCC. CCCC is a check on the rest, so the homepage
 * can tell a number this machine gave from one somebody made up.
 */
export function seedNumber(seed: string, keystrokes: number): string {
  const a = group(fnv(`${seed}|${keystrokes}`)), b = group(fnv(`${keystrokes}|${seed}`));
  return `JR-${a}-${b}-${check(a, b)}`;
}

const check = (a: string, b: string) => group(fnv(`${a}${b}|seed`));

export function validSeedNumber(code: string): boolean {
  const match = /^JR-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z]{4})$/.exec(code.trim().toUpperCase());
  return Boolean(match) && check(match![1], match![2]) === match![3];
}

/** How OS-Score rates the visitor: hesitation is what it looks for. */
function score(m: Machine, seed: string): string {
  if (!seed.trim()) return '0.000';
  const intent = Math.min(1, m.hesitations / Math.max(1, m.keystrokes / 12));
  return (0.9 + 0.099 * intent).toFixed(3);
}

class SeedApp implements App {
  private tty: Teletype | null = null;
  private stage: 'asking' | 'typing' | 'scoring' | 'done' = 'asking';
  private seed = '';
  private readonly buttons = new ButtonTracker();
  /** A drawing from C:\DRAFTS to go with the seed, if the visitor made one and chose it. */
  private attached: { name: string; data: Uint8Array } | null = null;

  line(): string { return this.stage === 'typing' ? this.seed : ''; }

  /** Under the line being typed: the button that sends it, and one to bring a drawing along. */
  private controls(m: Machine): OverlayButton[] {
    if (this.stage !== 'typing') return [];
    const width = 640 / m.scale, y = 400 / m.scale - 44;
    const submit = { en: 'SUBMIT', zh: '提交' }, attach = this.attached ? { en: `WITH ${this.attached.name}`, zh: `附上 ${this.attached.name}` } : { en: 'ATTACH A DRAWING', zh: '附上一幅画' };
    const ws = strWidth(m.t(submit)) * 8 + 32, wa = strWidth(m.t(attach)) * 8 + 24;
    const out: OverlayButton[] = [];
    if (drawings(m).length) {
      const total = ws + wa + 12, x = Math.floor((width - total) / 2);
      out.push({ id: 'attach', rect: { x, y, w: wa, h: 22 }, label: attach });
      out.push({ id: 'submit', rect: { x: x + wa + 12, y, w: ws, h: 22 }, label: submit });
    } else out.push({ id: 'submit', rect: { x: Math.floor((width - ws) / 2), y, w: ws, h: 22 }, label: submit });
    return out;
  }

  overlay(m: Machine, g: Gfx): void {
    drawButtons(g, m, this.controls(m), this.buttons.hover, this.buttons.down);
    // The drawing that goes with it, small, above the buttons.
    if (this.attached && this.stage === 'typing') {
      const w = 128, h = 80, x = Math.floor((g.width - w) / 2), y = g.height - 52 - h;
      g.rect({ x: x - 2, y: y - 2, w: w + 4, h: h + 4 }, 'frame');
      g.canvas(this.attached.data, CANVAS.w, CANVAS.h, { x, y, w, h });
    }
  }

  /** The next drawing in C:\DRAFTS, then none, then the first again. */
  private cycle(m: Machine): void {
    const all = drawings(m);
    const at = this.attached ? all.findIndex(d => d.name === this.attached!.name) : -1;
    const next = all[at + 1];
    const data = next ? loadDrawing(m, next.name) : null;
    this.attached = next && data ? { name: next.name, data } : null;
    m.redraw();
  }

  pointer(m: Machine, p: Pointer): void {
    const used = this.buttons.pointer(m, p, this.controls(m), id => (id === 'attach' ? this.cycle(m) : this.submit(m)));
    if (used || p.phase !== 'up') return;
    if (this.stage === 'done') m.replace(new LogoffApp());
    else if (this.stage === 'asking') this.tty?.skip();
  }

  show(m: Machine): void {
    this.tty = new Teletype(m.grid, line => { if (line.trim()) m.announce(line); });
    clearGrid(m.grid);
    m.grid.cursor.visible = true;
    m.audio.music(null);
    const t = this.tty, chars = m.keystrokes.toLocaleString('en-US'), clicks = m.clicks.toLocaleString('en-US');
    const say = m.lang === 'zh'
      ? ['', '线路仍在连接。', '', `本次会话产出    ${chars} 个字符，${clicks} 次点击`, `犹豫            ${m.hesitations} 次`, '', '断线之前，还有一件事。', '请提交一颗种子。写什么都可以。', '']
      : ['', 'THE LINE IS STILL OPEN.', '', `SESSION OUTPUT     ${chars} CHARS, ${clicks} CLICKS`, `HESITATIONS        ${m.hesitations}`, '', 'BEFORE THE LINE DROPS, ONE MORE THING.', 'SUBMIT A SEED. ANYTHING YOU LIKE.', ''];
    t.pause(0.8);
    for (const line of say) t.print(line ? '  ' + line : '', line.includes('SEED') || line.includes('种子') ? ATTR.bright : 0, MODEM_CPS).pause(0.15);
    t.call(() => { this.stage = 'typing'; t.write('  > '); m.refreshInput(); m.redraw(); });
  }

  tick(_m: Machine, dt: number): void { this.tty?.tick(dt); }

  key(m: Machine, { key, ctrl }: Key): void {
    const t = this.tty!;
    if (this.stage === 'done') { m.replace(new LogoffApp()); return; }
    if (this.stage !== 'typing') { if (this.stage === 'asking') t.skip(); return; }
    if (ctrl) return;
    if (key === 'Enter') { this.submit(m); return; }
    if (key === 'Backspace') {
      const chars = Array.from(this.seed), last = chars.pop();
      if (last) { this.seed = chars.join(''); t.write('\b'.repeat(charWidth(last))); }
      return;
    }
    if (Array.from(key).length === 1 && strWidth(this.seed + key) <= m.cols - 6) { this.seed += key; t.write(key); }
  }

  private submit(m: Machine): void {
    const t = this.tty!;
    this.stage = 'scoring';
    m.redraw();
    m.refreshInput();
    // The machine thinks it over: the disk works for a long moment.
    m.audio.sfx('disk', '2.2');
    // A drawing goes in with the words: its name, and what its pixels add up to.
    const seed = this.attached ? `${this.seed}|PCX:${this.attached.name}:${fnv(Array.from(this.attached.data).join(','))}` : this.seed;
    if (this.attached) t.write(`   + ${this.attached.name}`);
    const code = seedNumber(seed, m.output);
    m.store.set('seed', { code, at: Date.now() });
    m.mark('seeded');
    t.write('\n');
    const zh = m.lang === 'zh';
    t.print('').print(zh ? `  评分中 ........ ${score(m, this.seed)}` : `  SCORING ........ ${score(m, this.seed)}`, 0, 12).pause(0.6)
      .print(zh ? '  种子已接收。' : '  SEED ACCEPTED.', ATTR.bright, MODEM_CPS).pause(0.8)
      .print('')
      .print(zh ? '  你的种子编号' : '  YOUR SEED NUMBER', ATTR.dim, MODEM_CPS)
      .print('      ' + code, ATTR.bright, MODEM_CPS / 3).pause(0.6)
      .print('')
      .print(zh ? '  记住它。它能在别的地方打开一样东西。' : '  KEEP IT. IT OPENS SOMETHING, SOMEWHERE ELSE.', 0, MODEM_CPS).pause(1.4)
      .print('')
      .print('  Welcome back, Jackie.', ATTR.dim, MODEM_CPS / 2)
      .call(() => { this.stage = 'done'; m.grid.cursor.visible = false; m.announce(code); });
  }
}
