import { writeText, type Grid } from '../crt/grid';

/**
 * Output that arrives at a line speed: characters per second, pauses, and actions
 * run in order (a sound, a screen change). Used by boot and by the DOS shell.
 */
type Op =
  | { kind: 'text'; text: string; attr: number; cps: number }
  | { kind: 'pause'; seconds: number }
  | { kind: 'call'; fn: () => void; onSkip: boolean };

export const TYPE_CPS = 1400;
/** 2400 baud, 10 bits a character. */
export const MODEM_CPS = 240;

export class Teletype {
  private queue: Op[] = [];
  private budget = 0;
  private pending = '';

  constructor(private readonly grid: Grid, private readonly onLine: (text: string) => void = () => {}) {}

  get busy(): boolean { return this.queue.length > 0; }

  print(text: string, attr = 0, cps = TYPE_CPS, newline = true): this {
    this.queue.push({ kind: 'text', text: newline ? text + '\n' : text, attr, cps });
    return this;
  }
  pause(seconds: number): this { this.queue.push({ kind: 'pause', seconds }); return this; }
  /** `onSkip`: whether the action still happens when the queue is skipped (screen changes do; sounds don't). */
  call(fn: () => void, onSkip = true): this { this.queue.push({ kind: 'call', fn, onSkip }); return this; }

  /** Immediate output, bypassing the queue. */
  write(text: string, attr = 0): void {
    writeText(this.grid, text, attr);
    for (const ch of text) {
      if (ch === '\n') { this.onLine(this.pending); this.pending = ''; }
      else if (ch === '\b') this.pending = this.pending.slice(0, -1);
      else this.pending += ch;
    }
  }

  /**
   * Finish what is queued now, at once; anything its actions queue in turn plays
   * normally. `active` is asked after each action; when it says no (the action
   * opened another program), the rest waits for a later tick.
   */
  skip(active: () => boolean = () => true): void {
    this.budget = 0;
    for (let n = this.queue.length; n > 0 && this.queue.length; n--) {
      const op = this.queue.shift()!;
      if (op.kind === 'text') this.write(op.text, op.attr);
      else if (op.kind === 'call' && op.onSkip) { op.fn(); if (!active()) return; }
    }
  }

  clear(): void { this.queue = []; this.budget = 0; }

  tick(dt: number, active: () => boolean = () => true): void {
    this.budget += dt;
    while (this.queue.length) {
      const op = this.queue[0];
      if (op.kind === 'pause') {
        if (this.budget < op.seconds) return;
        this.budget -= op.seconds; this.queue.shift(); continue;
      }
      if (op.kind === 'call') {
        this.queue.shift(); op.fn();
        if (!active()) { this.budget = 0; return; }
        continue;
      }
      const chars = Math.floor(this.budget * op.cps);
      if (chars <= 0 && op.text.length) return;
      const piece = op.text.slice(0, chars);
      this.budget -= piece.length / op.cps;
      this.write(piece, op.attr);
      op.text = op.text.slice(piece.length);
      if (op.text.length) return;
      this.queue.shift();
    }
    this.budget = 0;
  }
}
