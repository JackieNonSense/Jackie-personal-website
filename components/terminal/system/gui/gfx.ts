import { GLYPH_H, GLYPH_W, charWidth, glyphCode } from '../../crt/font';
import { GREY, ink, type Ink } from '../../crt/palette';
import type { Picture } from '../../graphics/bitmap';
import { intersect, type Rect } from './geometry';

/**
 * Drawing for the pixel desk, in logical pixels: 640 x 400 on a desk, 320 x 200 on
 * a phone, where every logical pixel is two by two on the raster. Everything is
 * clipped; text never shows half of a Chinese character.
 */

/** Eight rows of eight bits, most significant on the left: a fill pattern. */
export type Pattern = readonly number[];
export const PATTERNS = {
  solid: [255, 255, 255, 255, 255, 255, 255, 255],
  half: [0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55],
  quarter: [0x88, 0x00, 0x22, 0x00, 0x88, 0x00, 0x22, 0x00],
  sparse: [0x80, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00],
  lines: [0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00],
} as const satisfies Record<string, Pattern>;

/**
 * A small picture: rows of characters, each a colour from `ink` (a role or a
 * hardware colour); anything not in `ink` is transparent.
 */
export type Icon = { w: number; h: number; rows: readonly string[]; ink: Readonly<Record<string, Ink>> };

/** Text as it was drawn: what tests and screen readers are told is on the screen. */
export type TextRun = { x: number; y: number; w: number; h: number; text: string };

/** An icon's rows as runs of one character, worked out the first time it is drawn. */
const iconRuns = new WeakMap<Icon, { x: number; y: number; n: number; ch: string }[]>();
function runsOf(ic: Icon): { x: number; y: number; n: number; ch: string }[] {
  let runs = iconRuns.get(ic);
  if (!runs) {
    const out: { x: number; y: number; n: number; ch: string }[] = [];
    ic.rows.forEach((row, y) => {
      for (let x = 0, n = 1; x < row.length; x += n, n = 1) {
        while (x + n < row.length && row[x + n] === row[x]) n++;
        out.push({ x, y, n, ch: row[x] });
      }
    });
    iconRuns.set(ic, (runs = out));
  }
  return runs;
}

export class Gfx {
  readonly width: number;
  readonly height: number;
  /** Every string drawn since the last `reset`, where it landed. */
  readonly runs: TextRun[] = [];
  private ox = 0;
  private oy = 0;
  private clipRect: Rect;
  private readonly stack: { ox: number; oy: number; clip: Rect }[] = [];
  /** A fill pattern's eight rows, each drawn out across the page once and then copied down. */
  private readonly patternRows: Uint8Array[];

  constructor(
    readonly page: Uint8Array,
    readonly glyphs: Uint8Array,
    readonly scale: 1 | 2,
    readonly pageW = 640,
    readonly pageH = 400,
  ) {
    this.width = pageW / scale;
    this.height = pageH / scale;
    this.clipRect = { x: 0, y: 0, w: this.width, h: this.height };
    this.patternRows = Array.from({ length: 8 }, () => new Uint8Array(pageW));
  }

  reset(): void {
    this.ox = 0; this.oy = 0;
    this.clipRect = { x: 0, y: 0, w: this.width, h: this.height };
    this.stack.length = 0;
    this.runs.length = 0;
  }

  save(): void { this.stack.push({ ox: this.ox, oy: this.oy, clip: this.clipRect }); }
  restore(): void { const s = this.stack.pop(); if (s) { this.ox = s.ox; this.oy = s.oy; this.clipRect = s.clip; } }
  translate(dx: number, dy: number): void { this.ox += dx; this.oy += dy; }
  /** Narrows drawing to `r` (in current coordinates). */
  clip(r: Rect): void {
    this.clipRect = intersect(this.clipRect, { x: r.x + this.ox, y: r.y + this.oy, w: r.w, h: r.h }) ?? { x: 0, y: 0, w: 0, h: 0 };
  }
  get clipBox(): Rect { return { ...this.clipRect, x: this.clipRect.x - this.ox, y: this.clipRect.y - this.oy }; }

  // ── Shapes ───────────────────────────────────────────────────────────────────

  fill(r: Rect, colour: Ink): void { this.block(r.x, r.y, r.w, r.h, ink(colour)); }
  pixel(x: number, y: number, colour: Ink): void { this.block(x, y, 1, 1, ink(colour)); }
  hline(x: number, y: number, w: number, colour: Ink): void { this.block(x, y, w, 1, ink(colour)); }
  vline(x: number, y: number, h: number, colour: Ink): void { this.block(x, y, 1, h, ink(colour)); }

  /** A clipped block of one palette index; everything solid is drawn through here. */
  private block(x: number, y: number, w: number, h: number, v: number): void {
    // Clipped, then onto the raster: on a phone half a pixel is a pixel of the raster.
    const c = this.clipRect, s = this.scale, X = x + this.ox, Y = y + this.oy;
    const a = Math.floor(Math.max(X, c.x) * s), b = Math.floor(Math.min(X + w, c.x + c.w) * s);
    const top = Math.floor(Math.max(Y, c.y) * s), bottom = Math.floor(Math.min(Y + h, c.y + c.h) * s);
    if (a >= b || top >= bottom) return;
    const W = this.pageW, page = this.page;
    for (let ry = top; ry < bottom; ry++) {
      const row = ry * W;
      // Short runs (the edges of things, and icons) are quicker written than filled.
      if (b - a > 16) page.fill(v, row + a, row + b);
      else for (let i = row + a; i < row + b; i++) page[i] = v;
    }
  }

  /** A one-pixel outline just inside `r`. */
  rect(r: Rect, colour: Ink): void {
    this.hline(r.x, r.y, r.w, colour); this.hline(r.x, r.y + r.h - 1, r.w, colour);
    this.vline(r.x, r.y + 1, r.h - 2, colour); this.vline(r.x + r.w - 1, r.y + 1, r.h - 2, colour);
  }

  line(x0: number, y0: number, x1: number, y1: number, colour: Ink): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.pixel(x0, y0, colour);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** `a` where the pattern has a bit, `b` elsewhere (or nothing, when `b` is null). The pattern is fixed to the screen. */
  pattern(r: Rect, p: Pattern, a: Ink, b: Ink | null): void {
    const c = intersect(this.clipRect, { x: r.x + this.ox, y: r.y + this.oy, w: r.w, h: r.h });
    if (!c) return;
    const va = ink(a), vb = b === null ? -1 : ink(b), s = this.scale, W = this.pageW, page = this.page;
    if (vb >= 0) {
      // Two colours (a desk, a scroll track): each row of the pattern once, then copied.
      for (let k = 0; k < 8; k++) {
        const bits = p[k], row = this.patternRows[k];
        for (let x = c.x; x < c.x + c.w; x++) {
          const v = bits & (0x80 >> (x & 7)) ? va : vb;
          row[x * s] = v;
          if (s === 2) row[x * s + 1] = v;
        }
      }
      for (let y = c.y; y < c.y + c.h; y++) {
        const src = this.patternRows[y & 7].subarray(c.x * s, (c.x + c.w) * s);
        for (let yy = 0; yy < s; yy++) page.set(src, (y * s + yy) * W + c.x * s);
      }
      return;
    }
    for (let y = c.y; y < c.y + c.h; y++) {
      const bits = p[y & 7];
      for (let yy = 0; yy < s; yy++) {
        const row = (y * s + yy) * W;
        for (let x = c.x; x < c.x + c.w; x++) {
          const v = bits & (0x80 >> (x & 7)) ? va : vb;
          if (v < 0) continue;
          const at = row + x * s;
          page[at] = v;
          if (s === 2) page[at + 1] = v;
        }
      }
    }
  }

  /** The edges of a raised or sunken face. */
  bevel(r: Rect, style: 'raised' | 'sunken' | 'pressed'): void {
    const [tl, br]: [Ink, Ink] = style === 'raised' ? ['light', 'shadow'] : ['shadow', 'light'];
    this.hline(r.x, r.y, r.w - 1, tl); this.vline(r.x, r.y, r.h - 1, tl);
    this.hline(r.x + 1, r.y + r.h - 1, r.w - 1, br); this.vline(r.x + r.w - 1, r.y + 1, r.h - 1, br);
  }

  // ── Text ─────────────────────────────────────────────────────────────────────

  /** Width in logical pixels: 8 a character, 16 a Chinese one. */
  measure(s: string): number {
    let w = 0;
    for (const ch of s) w += charWidth(ch) * GLYPH_W;
    return w;
  }

  /**
   * One line of VGA text with its top left at (x, y); returns the width drawn.
   * `maxW` cuts it short; `bold` draws it twice, a pixel apart.
   */
  text(x: number, y: number, s: string, colour: Ink, o: { bold?: boolean; maxW?: number; underline?: boolean } = {}): number {
    const v = ink(colour), max = o.maxW ?? Infinity, c = this.clipRect, ay = Math.floor(y + this.oy);
    let cx = 0, n = 0;
    for (const ch of s) {
      const cells = charWidth(ch), w = cells * GLYPH_W;
      if (cx + w > max) break;
      // A character is drawn whole or not at all: a clip never leaves half a glyph.
      const ax = x + cx + this.ox;
      if (ax >= c.x && ax + w <= c.x + c.w) {
        const code = glyphCode(ch);
        this.glyph(code, ax, ay, v, o.bold);
        if (cells === 2) this.glyph(code + 1, ax + GLYPH_W, ay, v, o.bold);
      }
      n += ch.length;
      cx += w;
    }
    const shown = s.slice(0, n);
    if (o.underline) this.hline(x, y + GLYPH_H - 1, cx, v);
    if (shown.trim()) {
      const box = intersect(this.clipRect, { x: x + this.ox, y: y + this.oy, w: cx, h: GLYPH_H });
      if (box) this.runs.push({ ...box, text: shown });
    }
    return cx;
  }

  /** One glyph with its top left at (x, y) on the page, already known to fit across the clip. */
  private glyph(code: number, x: number, y: number, v: number, bold = false): void {
    const s = this.scale, W = this.pageW, c = this.clipRect, page = this.page, glyphs = this.glyphs;
    const base = code * GLYPH_H, left = Math.floor(x * s);
    for (let gy = Math.max(0, c.y - y), end = Math.min(GLYPH_H, c.y + c.h - y); gy < end; gy++) {
      let bits = glyphs[base + gy];
      if (bold) bits |= bits >> 1;
      const row = (y + gy) * s * W + left;
      for (let at = row; bits; bits = (bits << 1) & 0xff, at += s) {
        if (!(bits & 0x80)) continue;
        page[at] = v;
        if (s === 2) { page[at + 1] = v; page[at + W] = v; page[at + W + 1] = v; }
      }
    }
  }

  // ── Pictures ─────────────────────────────────────────────────────────────────

  icon(ic: Icon, x: number, y: number, override?: Readonly<Record<string, Ink>>): void {
    for (const run of runsOf(ic)) {
      const c = override?.[run.ch] ?? ic.ink[run.ch];
      if (c !== undefined) this.block(x + run.x, y + run.y, run.n, 1, ink(c));
    }
  }

  /**
   * A grey picture into `dst`, scaled to fit (`contain`) or to fill (`cover`),
   * through the picture ramp. On a phone's doubled pixels it uses the raster's own
   * resolution, so a photograph keeps its detail.
   */
  picture(p: Picture, dst: Rect, fit: 'contain' | 'cover' = 'contain'): Rect {
    const s = this.scale, W = this.pageW;
    const k = fit === 'contain' ? Math.min(dst.w / p.width, dst.h / p.height) : Math.max(dst.w / p.width, dst.h / p.height);
    const w = Math.round(p.width * k), h = Math.round(p.height * k);
    const at = { x: dst.x + Math.floor((dst.w - w) / 2), y: dst.y + Math.floor((dst.h - h) / 2), w, h };
    const c = intersect(intersect(this.clipRect, { x: dst.x + this.ox, y: dst.y + this.oy, w: dst.w, h: dst.h }) ?? { x: 0, y: 0, w: 0, h: 0 },
      { x: at.x + this.ox, y: at.y + this.oy, w, h });
    if (!c) return at;
    const left = (at.x + this.ox) * s, top = (at.y + this.oy) * s, kk = k * s;
    for (let ry = c.y * s; ry < (c.y + c.h) * s; ry++) {
      const py = Math.min(p.height - 1, Math.floor((ry - top) / kk));
      for (let rx = c.x * s; rx < (c.x + c.w) * s; rx++) {
        const px = Math.min(p.width - 1, Math.floor((rx - left) / kk));
        this.page[ry * W + rx] = GREY[p.data[py * p.width + px]];
      }
    }
    return at;
  }

  /**
   * A whole frame of palette indices (a second screen), shrunk into `dst`: each pixel
   * takes the colour in its part of the frame that glows nearest that part's average,
   * so fields of colour keep their colour and snow stays grey snow.
   */
  shrink(src: Uint8Array, level: Uint8Array, dst: Rect, srcW = 640, srcH = 400): void {
    const c = intersect(this.clipRect, { x: dst.x + this.ox, y: dst.y + this.oy, w: dst.w, h: dst.h });
    if (!c) return;
    const s = this.scale, W = this.pageW;
    const left = (dst.x + this.ox) * s, top = (dst.y + this.oy) * s, dw = dst.w * s, dh = dst.h * s;
    for (let ry = c.y * s; ry < (c.y + c.h) * s; ry++) {
      const sy0 = Math.floor(((ry - top) * srcH) / dh), sy1 = Math.max(sy0 + 1, Math.floor(((ry - top + 1) * srcH) / dh));
      for (let rx = c.x * s; rx < (c.x + c.w) * s; rx++) {
        const sx0 = Math.floor(((rx - left) * srcW) / dw), sx1 = Math.max(sx0 + 1, Math.floor(((rx - left + 1) * srcW) / dw));
        let sum = 0, n = 0;
        for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) { sum += level[src[y * srcW + x]]; n++; }
        const mean = sum / n;
        let best = src[sy0 * srcW + sx0], gap = Infinity;
        for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
          const v = src[y * srcW + x], d = Math.abs(level[v] - mean);
          if (d < gap) { gap = d; best = v; }
        }
        this.page[ry * W + rx] = best;
      }
    }
  }

  /** A grid of palette indices (a drawing), scaled into `dst` at the raster's own resolution. */
  canvas(data: Uint8Array, w: number, h: number, dst: Rect): void {
    const c = intersect(this.clipRect, { x: dst.x + this.ox, y: dst.y + this.oy, w: dst.w, h: dst.h });
    if (!c) return;
    const s = this.scale, W = this.pageW;
    const left = (dst.x + this.ox) * s, top = (dst.y + this.oy) * s, dw = dst.w * s, dh = dst.h * s;
    for (let ry = c.y * s; ry < (c.y + c.h) * s; ry++) {
      const sy = Math.min(h - 1, Math.floor(((ry - top) * h) / dh)) * w;
      for (let rx = c.x * s; rx < (c.x + c.w) * s; rx++) this.page[ry * W + rx] = data[sy + Math.min(w - 1, Math.floor(((rx - left) * w) / dw))];
    }
  }

  /** Palette indices, one per logical pixel; `key` is transparent. */
  indexed(src: { width: number; height: number; data: Uint8Array }, x: number, y: number, key = -1): void {
    for (let sy = 0; sy < src.height; sy++) for (let sx = 0; sx < src.width; sx++) {
      const v = src.data[sy * src.width + sx];
      if (v !== key) this.pixel(x + sx, y + sy, v);
    }
  }
}
