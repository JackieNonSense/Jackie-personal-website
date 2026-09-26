import type { OutlineGlyph } from '../content/mark-glyphs';

/** One byte a pixel, 1 where there is ink. */
export type Mask = { width: number; height: number; data: Uint8Array };

/** A glyph as a mask: `baseline` is the row it stands on, `pad` the empty columns before its ink, `ink` the ink's width. */
export type GlyphMask = Mask & { baseline: number; pad: number; ink: number };

const SS = 4;

/**
 * A glyph's outline filled (even-odd), `cap` pixels to its capital height. Every
 * pixel is sampled 4 x 4 and is ink when half of it is; `bold` thickens each
 * stroke by that many pixels a side. `capHeight` is the font's, in its units.
 */
export function rasterGlyph(g: OutlineGlyph, cap: number, capHeight: number, bold = 0): GlyphMask {
  const k = cap / capHeight;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of g.contours) for (let i = 0; i < c.length; i += 2) {
    minX = Math.min(minX, c[i]); maxX = Math.max(maxX, c[i]);
    minY = Math.min(minY, c[i + 1]); maxY = Math.max(maxY, c[i + 1]);
  }
  const pad = Math.ceil(bold) + 1;
  const width = Math.ceil((maxX - minX) * k) + 2 * pad, height = Math.ceil((maxY - minY) * k) + 2 * pad;
  const sw = width * SS, sh = height * SS, samples = new Uint8Array(sw * sh);
  // Font units to sample coordinates: y turned over, the ink box inset by the pad.
  const sx = (x: number) => ((x - minX) * k + pad) * SS, sy = (y: number) => ((maxY - y) * k + pad) * SS;
  const xs: number[] = [];
  for (let row = 0; row < sh; row++) {
    const y = row + 0.5;
    xs.length = 0;
    for (const c of g.contours) {
      const n = c.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const y0 = sy(c[i * 2 + 1]), y1 = sy(c[j * 2 + 1]);
        if ((y0 <= y) === (y1 <= y)) continue;
        const x0 = sx(c[i * 2]), x1 = sx(c[j * 2]);
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.max(0, Math.ceil(xs[i] - 0.5)), b = Math.min(sw, Math.ceil(xs[i + 1] - 0.5));
      samples.fill(1, row * sw + a, row * sw + b);
    }
  }
  if (bold > 0) dilate(samples, sw, sh, Math.round(bold * SS));
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let n = 0;
    for (let yy = 0; yy < SS; yy++) for (let xx = 0; xx < SS; xx++) n += samples[(y * SS + yy) * sw + x * SS + xx];
    data[y * width + x] = n * 2 >= SS * SS ? 1 : 0;
  }
  return { width, height, data, baseline: Math.round(maxY * k + pad), pad, ink: (maxX - minX) * k };
}

/** Grows the ink by `r` samples each way (a square pen: horizontal, then vertical). */
function dilate(s: Uint8Array, w: number, h: number, r: number): void {
  const t = new Uint8Array(s.length);
  for (let y = 0; y < h; y++) {
    let last = -Infinity;
    for (let x = 0; x < w; x++) if (s[y * w + x]) last = x; else if (x - last <= r) t[y * w + x] = 1;
    last = Infinity;
    for (let x = w - 1; x >= 0; x--) if (s[y * w + x]) last = x; else if (last - x <= r) t[y * w + x] = 1;
  }
  for (let i = 0; i < s.length; i++) s[i] |= t[i];
  t.fill(0);
  for (let x = 0; x < w; x++) {
    let last = -Infinity;
    for (let y = 0; y < h; y++) if (s[y * w + x]) last = y; else if (y - last <= r) t[y * w + x] = 1;
    last = Infinity;
    for (let y = h - 1; y >= 0; y--) if (s[y * w + x]) last = y; else if (last - y <= r) t[y * w + x] = 1;
  }
  for (let i = 0; i < s.length; i++) s[i] |= t[i];
}
