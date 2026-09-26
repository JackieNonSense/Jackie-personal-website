/**
 * A drawing: 256 x 160 pixels, each one of the 16 hardware colours (crt/palette.ts),
 * so the same drawing comes out green on the green tube and in colour on a colour
 * one. The tools and eight steps of undo; nothing here knows about the screen.
 */
export const CANVAS = { w: 256, h: 160 } as const;
export const PAPER = 0;

export type Tool = 'pencil' | 'brush' | 'line' | 'rect' | 'box' | 'ellipse' | 'fill' | 'spray' | 'eraser';
export const TOOLS: readonly Tool[] = ['pencil', 'brush', 'spray', 'eraser', 'line', 'rect', 'box', 'ellipse', 'fill'];
/** Tools that draw a shape from where the press began to where it ends. */
export const SHAPES: ReadonlySet<Tool> = new Set(['line', 'rect', 'box', 'ellipse']);

const UNDO = 8;

export class PaintDoc {
  readonly w = CANVAS.w;
  readonly h = CANVAS.h;
  data: Uint8Array = new Uint8Array(CANVAS.w * CANVAS.h).fill(PAPER);
  private readonly history: Uint8Array[] = [];
  /** Changed since it was last saved. */
  dirty = false;

  /** Before each stroke: what undo goes back to. */
  begin(): void {
    this.history.push(this.data.slice());
    if (this.history.length > UNDO) this.history.shift();
    this.dirty = true;
  }

  undo(): boolean {
    const last = this.history.pop();
    if (!last) return false;
    this.data = last;
    return true;
  }

  get canUndo(): boolean { return this.history.length > 0; }

  load(data: Uint8Array): void { this.data = data.slice(); this.history.length = 0; this.dirty = false; }

  clear(colour = PAPER): void { this.begin(); this.data.fill(colour); }

  pixel(x: number, y: number, c: number): void {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c;
  }

  /** A round dab of radius `r` (0 is a single pixel). */
  dab(x: number, y: number, c: number, r = 0): void {
    if (r <= 0) { this.pixel(x, y, c); return; }
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) this.pixel(x + dx, y + dy, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number, r = 0): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.dab(x0, y0, c, r);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  rect(x0: number, y0: number, x1: number, y1: number, c: number, filled: boolean): void {
    const [a, b] = [Math.min(x0, x1), Math.max(x0, x1)], [t, u] = [Math.min(y0, y1), Math.max(y0, y1)];
    if (filled) { for (let y = t; y <= u; y++) for (let x = a; x <= b; x++) this.pixel(x, y, c); return; }
    this.line(a, t, b, t, c); this.line(a, u, b, u, c); this.line(a, t, a, u, c); this.line(b, t, b, u, c);
  }

  /** The ellipse inside the box from (x0, y0) to (x1, y1). */
  ellipse(x0: number, y0: number, x1: number, y1: number, c: number): void {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
    if (rx < 0.5 || ry < 0.5) { this.line(x0, y0, x1, y1, c); return; }
    const steps = Math.max(24, Math.ceil((rx + ry) * 3));
    let px = cx + rx, py = cy;
    for (let i = 1; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      this.line(px, py, x, y, c);
      px = x; py = y;
    }
  }

  /** Floods the area of one colour under (x, y) with another. */
  fill(x: number, y: number, c: number): void {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const from = this.data[y * this.w + x];
    if (from === c) return;
    const stack = [y * this.w + x];
    while (stack.length) {
      const i = stack.pop()!;
      if (this.data[i] !== from) continue;
      this.data[i] = c;
      const px = i % this.w;
      if (px > 0) stack.push(i - 1);
      if (px < this.w - 1) stack.push(i + 1);
      if (i >= this.w) stack.push(i - this.w);
      if (i < this.data.length - this.w) stack.push(i + this.w);
    }
  }

  /** A puff of paint: `n` dots scattered in a circle of radius `r`. */
  spray(x: number, y: number, c: number, random: () => number, r = 6, n = 10): void {
    for (let i = 0; i < n; i++) {
      const a = random() * Math.PI * 2, d = Math.sqrt(random()) * r;
      this.pixel(x + Math.cos(a) * d, y + Math.sin(a) * d, c);
    }
  }
}
