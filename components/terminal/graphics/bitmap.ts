import { GLYPH_H, GLYPH_W, glyphCells } from '../crt/font';
import { RASTER_H, RASTER_W } from '../crt/raster';
import { GREY, HW, grey, ink, type Ink } from '../crt/palette';

/**
 * The graphics page: 640 x 400 palette indices (crt/palette.ts), row 0 at the top.
 * Pictures are kept as grey intensities, 0..255, prepared offline
 * (scripts/build-terminal-picture.py) as dithered greyscale in the four levels the
 * tube shows well, PC-98 style; they land on the page through the picture ramp.
 */
export const W = RASTER_W;
export const H = RASTER_H;
export const LEVELS = [0, 104, 188, 255] as const;

export type Picture = { width: number; height: number; data: Uint8Array };

export function fillRect(b: Uint8Array, x: number, y: number, w: number, h: number, colour: Ink): void {
  const v = ink(colour);
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.floor(x + w)), y1 = Math.min(H, Math.floor(y + h));
  for (let yy = y0; yy < y1; yy++) b.fill(v, yy * W + x0, yy * W + x1);
}

export function frameRect(b: Uint8Array, x: number, y: number, w: number, h: number, colour: Ink): void {
  fillRect(b, x, y, w, 1, colour); fillRect(b, x, y + h - 1, w, 1, colour);
  fillRect(b, x, y, 1, h, colour); fillRect(b, x + w - 1, y, 1, h, colour);
}

/** VGA text drawn at any pixel position, optionally scaled up. */
export function drawText(b: Uint8Array, glyphs: Uint8Array, x: number, y: number, s: string, colour: Ink = 'tmBright', scale = 1): void {
  const v = ink(colour);
  let cx = Math.floor(x);
  for (const ch of s) for (const code of glyphCells(ch)) {
    const g = code * GLYPH_H;
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const bits = glyphs[g + gy];
      if (!bits) continue;
      for (let gx = 0; gx < GLYPH_W; gx++) if (bits & (0x80 >> gx)) fillRect(b, cx + gx * scale, y + gy * scale, scale, scale, v);
    }
    cx += GLYPH_W * scale;
  }
}

/** How sprite characters draw by default: '#' bright, '+' normal, '.' dim; anything else is transparent. */
const SPRITE_INKS: Readonly<Record<string, Ink>> = { '#': 'tmBright', '+': 'tmText', '.': 'tmDim' };

/** A sprite from rows of text, each character a colour from `inks`. */
export function drawSprite(b: Uint8Array, rows: readonly string[], x: number, y: number, scale = 1, inks: Readonly<Record<string, Ink>> = SPRITE_INKS): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = inks[row[rx]];
      if (c !== undefined) fillRect(b, x + rx * scale, y + ry * scale, scale, scale, c);
    }
  });
}

/** A picture onto the page, through the picture ramp. */
export function blit(b: Uint8Array, p: Picture, x: number, y: number): void {
  for (let py = 0; py < p.height; py++) {
    const ty = y + py;
    if (ty < 0 || ty >= H) continue;
    for (let px = 0; px < p.width; px++) {
      const tx = x + px;
      if (tx >= 0 && tx < W) b[ty * W + tx] = GREY[p.data[py * p.width + px]];
    }
  }
}

/** Decodes a prepared picture from RGBA pixels (the red channel carries the level). */
export function pictureFromRgba(rgba: Uint8ClampedArray, width: number, height: number): Picture {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
  return { width, height, data };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function quantise(v: number, x: number, y: number): number {
  const t = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  const scaled = (v / 255) * (LEVELS.length - 1);
  const lo = Math.floor(scaled);
  return LEVELS[Math.min(LEVELS.length - 1, lo + (scaled - lo > t ? 1 : 0))];
}

/** Grey levels for thumbnails: finer than the illustrations' four, so photos still read small. */
const THUMB_LEVELS = 8;

/**
 * A picture made small enough for a pane: each pixel averages the area it covers,
 * then ordered dithering to a few grey levels, as a viewer of the period would.
 * Keeps the aspect ratio and fits inside `w` x `h`.
 */
export function thumbnail(p: Picture, w: number, h: number): Picture {
  const scale = Math.min(w / p.width, h / p.height, 1);
  const tw = Math.max(1, Math.round(p.width * scale)), th = Math.max(1, Math.round(p.height * scale));
  const data = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) {
    const y0 = Math.floor((y * p.height) / th), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * p.height) / th));
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor((x * p.width) / tw), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * p.width) / tw));
      let sum = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) sum += p.data[yy * p.width + xx];
      const v = sum / ((y1 - y0) * (x1 - x0));
      const t = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16, scaled = (v / 255) * (THUMB_LEVELS - 1), lo = Math.floor(scaled);
      data[y * tw + x] = Math.round((Math.min(THUMB_LEVELS - 1, lo + (scaled - lo > t ? 1 : 0)) / (THUMB_LEVELS - 1)) * 255);
    }
  }
  return { width: tw, height: th, data };
}

/**
 * A copy of a copy: every generation blurs, drifts and re-dithers the picture a
 * little more, until nothing of the original is left but its average.
 */
export function degrade(p: Picture, generations: number, seed = 1): Picture {
  let data: Float32Array = Float32Array.from(p.data);
  const { width: w, height: h } = p;
  let s = seed >>> 0 || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const R = 2;
  for (let g = 0; g < generations; g++) {
    // Each copy smears a little sideways (the drift) and a little every way (the loss).
    const dx = Math.round((rand() - 0.5) * 4);
    const across = new Float32Array(w * h), next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let o = -R; o <= R; o++) sum += data[y * w + Math.min(w - 1, Math.max(0, x + o + dx))];
      across[y * w + x] = sum / (2 * R + 1);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let o = -R; o <= R; o++) sum += across[Math.min(h - 1, Math.max(0, y + o)) * w + x];
      // The copies drift toward the same dull, dark grey.
      next[y * w + x] = (sum / (2 * R + 1)) * 0.9 + 22 * 0.1;
    }
    data = next;
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = quantise(data[y * w + x], x, y);
  return { width: w, height: h, data: out };
}

/**
 * Channel 2 when nothing else is on: a line-up card drawn for this tube. The top
 * row is the 16 colours the card generator knows, so it shows what the tube makes
 * of them; below, the grey steps.
 */
export function testCard(b: Uint8Array, glyphs: Uint8Array | null, time: number): void {
  b.fill(HW.black);
  const line = grey(60);
  for (let x = 0; x < W; x += 40) fillRect(b, x, 0, 1, H, line);
  for (let y = 0; y < H; y += 40) fillRect(b, 0, y, W, 1, line);
  for (let i = 0; i < 16; i++) fillRect(b, 120 + i * 25, 120, 25, 60, i);
  const bars = LEVELS.length * 2;
  for (let i = 0; i < bars; i++) fillRect(b, 120 + i * 50, 180, 50, 70, grey((i / (bars - 1)) * 255));
  for (let a = 0; a < 720; a++) {
    const t = (a / 720) * Math.PI * 2;
    fillRect(b, 320 + Math.cos(t) * 170, 200 + Math.sin(t) * 170, 2, 2, grey(255));
  }
  if (glyphs) {
    fillRect(b, 264, 296, 112, 64, HW.black);
    drawText(b, glyphs, 280, 300, 'JR-TV', grey(255), 2);
    drawText(b, glyphs, 300, 336, (time % 60).toFixed(1).padStart(4, '0'), grey(188));
  }
}
