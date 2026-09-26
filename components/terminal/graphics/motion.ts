import { GLYPH_H, GLYPH_W, charWidth, glyphCode } from '../crt/font';
import { GREY, grey } from '../crt/palette';
import { H, W, type Picture } from './bitmap';

/*
 * What the television's channels are drawn with: easing, a frame to draw on (palette
 * indices, 640 x 400), type at any size, pictures pushed in on, snow, and the faults
 * of a tape played too often.
 */

// ── Time ─────────────────────────────────────────────────────────────────────

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
export const outCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const inCubic = (t: number) => clamp01(t) ** 3;
export const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * clamp01(t)));
export const outBack = (t: number, s = 1.6) => { const x = clamp01(t) - 1; return 1 + x * x * ((s + 1) * x + s); };
/** 0 before `a`, 1 after `b`, eased between. */
export const span = (t: number, a: number, b: number, ease: (t: number) => number = smooth) => ease((t - a) / (b - a));

/** A number from 0 to 1 that is always the same for the same `n`. */
export function hash(n: number): number {
  let s = (Math.floor(n) * 2654435761) >>> 0;
  s ^= s >>> 15; s = Math.imul(s, 2246822519) >>> 0; s ^= s >>> 13; s = Math.imul(s, 3266489917) >>> 0; s ^= s >>> 16;
  return (s >>> 0) / 4294967296;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

// ── The frame ────────────────────────────────────────────────────────────────

export class Frame {
  constructor(readonly b: Uint8Array, readonly glyphs: Uint8Array | null) {}

  clear(v = 0): void { this.b.fill(v); }

  rect(x: number, y: number, w: number, h: number, v: number): void {
    const x0 = Math.max(0, Math.round(x)), x1 = Math.min(W, Math.round(x + w));
    const y0 = Math.max(0, Math.round(y)), y1 = Math.min(H, Math.round(y + h));
    if (x1 <= x0) return;
    for (let yy = y0; yy < y1; yy++) this.b.fill(v, yy * W + x0, yy * W + x1);
  }

  box(x: number, y: number, w: number, h: number, v: number, t = 1): void {
    this.rect(x, y, w, t, v); this.rect(x, y + h - t, w, t, v);
    this.rect(x, y, t, h, v); this.rect(x + w - t, y, t, h, v);
  }

  /** `a` over `b` in an ordered dither: `level` 0 is all `b`, 1 all `a`. The pattern is fixed to the screen. */
  dither(x: number, y: number, w: number, h: number, level: number, a: number, b: number | null): void {
    const x0 = Math.max(0, Math.round(x)), x1 = Math.min(W, Math.round(x + w));
    const y0 = Math.max(0, Math.round(y)), y1 = Math.min(H, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      if (level > BAYER[(yy & 3) * 4 + (xx & 3)]) this.b[yy * W + xx] = a;
      else if (b !== null) this.b[yy * W + xx] = b;
    }
  }

  /** A filled circle (or ellipse, with `ry`). */
  disc(cx: number, cy: number, r: number, v: number, ry = r): void {
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(H - 1, Math.ceil(cy + ry)); y++) {
      const k = 1 - ((y - cy) / ry) ** 2;
      if (k < 0) continue;
      const half = r * Math.sqrt(k);
      this.rect(cx - half, y, 2 * half, 1, v);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, v: number, width = 1): void {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) this.rect(x0 + ((x1 - x0) * i) / n - width / 2, y0 + ((y1 - y0) * i) / n - width / 2, width, width, v);
  }

  /** Width of a string at scale `k`, with `track` extra pixels after each character. */
  measure(s: string, k = 1, track = 0): number {
    let w = 0;
    for (const ch of s) w += charWidth(ch) * GLYPH_W * k + track;
    return Math.max(0, w - track);
  }

  /** VGA (and Chinese) type at `k` times its size, top left at (x, y). Returns the width. */
  text(x: number, y: number, s: string, v: number, k = 1, track = 0): number {
    const g = this.glyphs;
    let cx = Math.round(x);
    const top = Math.round(y);
    for (const ch of s) {
      const cells = charWidth(ch), code = glyphCode(ch);
      if (g) for (let c = 0; c < cells; c++) {
        const base = (code + c) * GLYPH_H;
        for (let gy = 0; gy < GLYPH_H; gy++) {
          const bits = g[base + gy];
          if (!bits) continue;
          for (let gx = 0; gx < GLYPH_W; gx++) if (bits & (0x80 >> gx)) this.rect(cx + (c * GLYPH_W + gx) * k, top + gy * k, k, k, v);
        }
      }
      cx += cells * GLYPH_W * k + track;
    }
    return cx - track - Math.round(x);
  }

  /** Type centred on `cx`. */
  centred(cx: number, y: number, s: string, v: number, k = 1, track = 0): number {
    const w = this.measure(s, k, track);
    this.text(cx - w / 2, y, s, v, k, track);
    return w;
  }

  /** Words (or Chinese characters) broken into lines no wider than `max` pixels at scale `k`. */
  wrap(s: string, k: number, max: number): string[] {
    const out: string[] = [];
    let line = '';
    const tokens = /[　-鿿＀-￯]/.test(s) ? Array.from(s) : s.split(/(?<= )/);
    for (const tok of tokens) {
      if (this.measure(line + tok, k) > max && line) { out.push(line.trimEnd()); line = tok.trimStart(); }
      else line += tok;
    }
    if (line) out.push(line);
    return out;
  }

  /** A line of type running right to left forever: `run` is how far it has gone, in pixels. */
  crawl(y: number, s: string, v: number, run: number, k = 1): void {
    const period = this.measure(s, k) + 48 * k;
    for (let x = -(run % period); x < W; x += period) this.text(x, y, s, v, k);
  }

  /** A picture's `src` part (default all of it) into `dst`, through the picture ramp; `lift` brightens, `gain` scales. */
  picture(p: Picture, dst: { x: number; y: number; w: number; h: number }, src = { x: 0, y: 0, w: p.width, h: p.height }, gain = 1, lift = 0): void {
    const x0 = Math.max(0, Math.round(dst.x)), x1 = Math.min(W, Math.round(dst.x + dst.w));
    const y0 = Math.max(0, Math.round(dst.y)), y1 = Math.min(H, Math.round(dst.y + dst.h));
    for (let y = y0; y < y1; y++) {
      const sy = Math.min(p.height - 1, Math.max(0, Math.floor(src.y + ((y - dst.y) / dst.h) * src.h)));
      for (let x = x0; x < x1; x++) {
        const sx = Math.min(p.width - 1, Math.max(0, Math.floor(src.x + ((x - dst.x) / dst.w) * src.w)));
        const v = p.data[sy * p.width + sx] * gain + lift;
        this.b[y * W + x] = GREY[v < 0 ? 0 : v > 255 ? 255 : v | 0];
      }
    }
  }

  /** Rows of characters, each a palette index from `inks` (anything else is left alone), `k` pixels a cell. */
  sprite(rows: readonly string[], x: number, y: number, k: number, inks: Readonly<Record<string, number>>): void {
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const v = inks[row[rx]];
        if (v !== undefined) this.rect(x + rx * k, y + ry * k, k, k, v);
      }
    });
  }

  /** Snow: the whole frame (or a part), grain by grain, as empty air shows. */
  snow(time: number, amount = 1, area = { x: 0, y: 0, w: W, h: H }): void {
    let s = (Math.floor(time * 60) * 2654435761 + 777) >>> 0 || 1;
    for (let y = area.y; y < area.y + area.h; y += 2) for (let x = area.x; x < area.x + area.w; x += 2) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      const r = (s & 0xffff) / 0xffff;
      if (r > amount) continue;
      const v = GREY[Math.round((r / Math.max(amount, 1e-3)) ** 3 * 230)];
      const i = y * W + x;
      this.b[i] = v; this.b[i + 1] = v;
      if (y + 1 < H) { this.b[i + W] = v; this.b[i + W + 1] = v; }
    }
  }

  /** Grains of light scattered over what is there: an old tape's dropouts. */
  speckle(time: number, amount: number): void {
    let s = (Math.floor(time * 30) * 1597334677 + 99) >>> 0 || 1;
    const n = Math.floor(amount * 900);
    for (let i = 0; i < n; i++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      const x = s % W; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      const y = s % H, len = 1 + (s >>> 20) % 7;
      this.rect(x, y, len, 1, grey(110 + ((s >>> 8) & 95)));
    }
  }

  /**
   * A tape's tracking going: a few bands of rows pulled sideways, and a ragged band of
   * noise near the bottom where the heads switch.
   */
  tracking(time: number, strength: number): void {
    if (strength <= 0) return;
    const b = this.b, row = new Uint8Array(W), frame = Math.floor(time * 30);
    const bands = 1 + Math.floor(strength * 3);
    for (let k = 0; k < bands; k++) {
      const y0 = Math.floor(hash(frame * 7 + k * 131) * H), h = 2 + Math.floor(hash(frame * 3 + k) * 10 * strength);
      const shift = Math.round((hash(frame * 11 + k * 17) - 0.5) * 40 * strength);
      for (let y = y0; y < Math.min(H, y0 + h); y++) {
        row.set(b.subarray(y * W, (y + 1) * W));
        for (let x = 0; x < W; x++) b[y * W + x] = row[Math.min(W - 1, Math.max(0, x - shift))];
      }
    }
    // The head switch: the last rows torn to the side.
    const tear = Math.round(6 + 10 * strength);
    for (let y = H - tear; y < H; y++) {
      const shift = Math.round(8 + hash(frame + y) * 20 * strength);
      row.set(b.subarray(y * W, (y + 1) * W));
      for (let x = 0; x < W; x++) b[y * W + x] = row[Math.max(0, x - shift)];
    }
  }

  /** The picture rolling: rows moved down by `offset` (wrapping), with a dark bar where the frames meet. */
  roll(offset: number, bar: number): void {
    const o = ((Math.round(offset) % H) + H) % H;
    if (o) { const copy = this.b.slice(); this.b.set(copy.subarray((H - o) * W), 0); this.b.set(copy.subarray(0, (H - o) * W), o * W); }
    if (bar > 0) this.rect(0, o - bar / 2, W, bar, 0);
  }
}

/** Pictures are read once, when first asked for; until then, null. */
const pictures = new Map<string, Picture | 'loading'>();
export function picture(load: (url: string) => Promise<Picture>, url: string): Picture | null {
  const hit = pictures.get(url);
  if (hit && hit !== 'loading') return hit;
  if (!hit) {
    pictures.set(url, 'loading');
    load(url).then(p => pictures.set(url, p)).catch(() => pictures.delete(url));
  }
  return null;
}
