import { contains, inset, type Rect } from './geometry';
import { PATTERNS, type Gfx } from './gfx';
import { GLYPH } from './icons';
import type { DrawState, GuiHost, Widget, WindowSpec } from './widget';
import type { Machine } from '../machine';

/** The title bar's height; the buttons in it are a little less. */
export const TITLE_H = 18;
const BOX = { w: 18, h: 14 };
const GRIP = 12;

export type WindowPart = 'close' | 'max' | 'title' | 'grip' | 'content';

/**
 * A window's frame: the dithered shadow, the face, the edge and the title bar with
 * its title. What goes inside, and the boxes in the corner, are the caller's.
 */
export function drawFrame(g: Gfx, r: Rect, title: string, o: { lit: boolean; shadow: boolean; titleRoom?: number }): void {
  if (o.shadow) {
    // A dithered shadow: the desk shows through, as it did on screens of the time.
    g.pattern({ x: r.x + 4, y: r.y + r.h, w: r.w, h: 3 }, PATTERNS.half, 'dropShadow', null);
    g.pattern({ x: r.x + r.w, y: r.y + 4, w: 3, h: r.h - 1 }, PATTERNS.half, 'dropShadow', null);
  }
  g.fill(r, 'face');
  g.rect(r, 'frame');
  const bar = { x: r.x + 1, y: r.y + 1, w: r.w - 2, h: TITLE_H };
  g.fill(bar, o.lit ? 'titleOn' : 'titleOff');
  g.hline(r.x, bar.y + bar.h, r.w, 'frame');
  const room = { x: bar.x + 4, y: bar.y, w: (o.titleRoom ?? bar.w) - 8, h: bar.h };
  const w = g.measure(title);
  g.save(); g.clip(room);
  g.text(room.x + Math.max(0, Math.floor((room.w - w) / 2)), bar.y + 1, title, o.lit ? 'titleOnText' : 'titleOffText', { bold: o.lit });
  g.restore();
}

/**
 * A window: a frame, a title bar with a close box (and a maximise box when it can
 * be resized), and the widget inside. Windows are made once and kept, so closing
 * one and opening it again finds it as it was left.
 */
export class Window {
  readonly content: Widget;
  r: Rect;
  maximised = false;
  private before: Rect | null = null;
  /** Where the keys went last time this window was active. */
  focus: Widget | null = null;
  /** Counts down after a click outside a modal window: the title flashes. */
  flash = 0;

  constructor(readonly spec: WindowSpec, host: GuiHost, r: Rect) {
    this.r = r;
    this.content = spec.content(host);
    this.content.attach(host);
    this.layout();
  }

  get id(): string { return this.spec.id; }
  title(m: Machine): string { const t = this.spec.title; return m.t(typeof t === 'function' ? t(m) : t); }

  get titleBar(): Rect { return { x: this.r.x + 1, y: this.r.y + 1, w: this.r.w - 2, h: TITLE_H }; }
  get closeBox(): Rect { const t = this.titleBar; return { x: t.x + t.w - BOX.w - 2, y: t.y + 2, w: BOX.w, h: BOX.h }; }
  get maxBox(): Rect | null { if (!this.spec.resizable) return null; const c = this.closeBox; return { x: c.x - BOX.w - 2, y: c.y, w: BOX.w, h: BOX.h }; }
  get grip(): Rect | null { return this.spec.resizable && !this.maximised ? { x: this.r.x + this.r.w - GRIP - 1, y: this.r.y + this.r.h - GRIP - 1, w: GRIP, h: GRIP } : null; }
  get body(): Rect { return { x: this.r.x + 1, y: this.r.y + TITLE_H + 2, w: this.r.w - 2, h: this.r.h - TITLE_H - 3 }; }

  layout(): void { this.content.place(this.body); }

  moveTo(x: number, y: number): void { this.r = { ...this.r, x: Math.round(x), y: Math.round(y) }; this.layout(); }
  resize(w: number, h: number): void {
    const min = this.spec.min ?? { w: 160, h: 90 };
    this.r = { ...this.r, w: Math.round(Math.max(min.w, w)), h: Math.round(Math.max(min.h, h)) };
    this.layout();
  }

  /** Fills the desk, or goes back to where it was. */
  maximise(desk: Rect, on = !this.maximised): void {
    if (on === this.maximised) return;
    if (on) { this.before = this.r; this.r = { ...desk }; } else if (this.before) this.r = this.before;
    this.maximised = on;
    this.layout();
  }

  part(x: number, y: number): WindowPart | null {
    if (!contains(this.r, x, y)) return null;
    if (contains(this.closeBox, x, y)) return 'close';
    const max = this.maxBox;
    if (max && contains(max, x, y)) return 'max';
    if (contains(this.titleBar, x, y)) return 'title';
    const grip = this.grip;
    if (grip && contains(grip, x, y)) return 'grip';
    return 'content';
  }

  paint(g: Gfx, s: DrawState): void {
    const lit = s.active && !(this.flash > 0 && Math.floor(this.flash * 8) % 2 === 1);
    const boxes = [this.closeBox, this.maxBox].filter(Boolean) as Rect[];
    drawFrame(g, this.r, this.title(s.m), { lit, shadow: !this.maximised, titleRoom: boxes[boxes.length - 1].x - this.titleBar.x });
    const box = (b: Rect, glyph: typeof GLYPH.close) => {
      g.fill(b, 'face'); g.rect(b, 'frame'); g.bevel(inset(b, 1), 'raised');
      g.icon(glyph, b.x + Math.floor((b.w - glyph.w) / 2), b.y + Math.floor((b.h - glyph.h) / 2));
    };
    box(this.closeBox, GLYPH.close);
    const max = this.maxBox;
    if (max) box(max, this.maximised ? GLYPH.restore : GLYPH.maximise);
    this.content.paint(g, s);
    const grip = this.grip;
    if (grip) g.icon(GLYPH.grip, grip.x + 1, grip.y + 1, { '#': 'shadow' });
  }
}
