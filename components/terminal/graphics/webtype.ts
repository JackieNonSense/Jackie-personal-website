import { charWidth } from '../crt/font';
import { BODY, SERIF, SMALL, type BitmapFace } from './webtype-data';
import { rasterGlyph, type GlyphMask } from './outline';
import type { Gfx } from '../system/gui/gfx';

/*
 * The type NAVIGATOR sets pages in:
 *   body   Fusion Pixel 12px, proportional, Chinese and Latin: the text of a page
 *   small  Fusion Pixel 8px, monospaced: dates, small print, kickers
 *   song   the machine's own ROM (VGA 8x16, HZK16 song): headings, the way old pages had them
 *   serif  Gentilis from its outlines, at any size: mastheads and big headlines
 * A character the small face does not have (Chinese) is set in the body face; one
 * neither has falls back to the ROM.
 */

export type Face = 'body' | 'small' | 'song' | 'serif';

/** How far down the line box a face's glyphs start, and how tall its lines are by default. */
export const LEAD: Record<Face, number> = { body: 16, small: 11, song: 18, serif: 0 };

const masks = new Map<string, { w: number; h: number; data: Uint8Array } | null>();

function bitmapMask(face: BitmapFace, key: string, ch: string): { w: number; h: number; data: Uint8Array } | null {
  const id = `${key}${ch}`;
  const hit = masks.get(id);
  if (hit !== undefined) return hit;
  const g = face.glyphs[ch];
  if (!g) { masks.set(id, null); return null; }
  const digits = Math.ceil(face.cols / 4), data = new Uint8Array(face.cols * face.rows);
  for (let y = 0; y < face.rows; y++) {
    const bits = parseInt(g[1].slice(y * digits, (y + 1) * digits), 16);
    for (let x = 0; x < face.cols; x++) if (bits & (1 << (face.cols - 1 - x))) data[y * face.cols + x] = 1;
  }
  const m = { w: face.cols, h: face.rows, data };
  masks.set(id, m);
  return m;
}

const faceOf = (face: Face): BitmapFace | null => (face === 'body' ? BODY : face === 'small' ? SMALL : null);

/** A character's advance in a face (`size` for serif: pixels to the em). */
export function advance(face: Face, ch: string, size = 0): number {
  if (face === 'serif') {
    const g = SERIF.glyphs[ch];
    return g ? (g[0] * size) / SERIF.units : charWidth(ch) * 8;
  }
  const b = faceOf(face);
  const g = b?.glyphs[ch] ?? (face === 'small' ? BODY.glyphs[ch] : undefined);
  if (g) return g[0];
  // Not in the face: the ROM's glyph stands in.
  return charWidth(ch) * 8;
}

export function measure(face: Face, s: string, size = 0, bold = false): number {
  let w = 0;
  for (const ch of s) w += advance(face, ch, size);
  return Math.round(w) + (bold ? 1 : 0);
}

const serifGlyphs = new Map<string, { mask: GlyphMask; left: number } | null>();

function serifGlyph(ch: string, size: number): { mask: GlyphMask; left: number } | null {
  const id = `${size}|${ch}`;
  const hit = serifGlyphs.get(id);
  if (hit !== undefined) return hit;
  const g = SERIF.glyphs[ch];
  if (!g || !g[1].length) { serifGlyphs.set(id, null); return null; }
  let minX = Infinity;
  for (const c of g[1]) for (let i = 0; i < c.length; i += 2) minX = Math.min(minX, c[i]);
  const cap = (SERIF.capHeight * size) / SERIF.units;
  const mask = rasterGlyph({ advance: g[0], contours: g[1] }, cap, SERIF.capHeight, 0);
  const out = { mask, left: (minX * size) / SERIF.units };
  serifGlyphs.set(id, out);
  return out;
}

/**
 * A line of text with its top at (x, y) in a face; returns the width drawn. For
 * serif, `y` is the top of the capitals and `size` the pixels to the em.
 */
export function drawText(g: Gfx, face: Face, x: number, y: number, s: string, colour: number, o: { size?: number; bold?: boolean } = {}): number {
  let pen = x;
  for (const ch of s) {
    const w = advance(face, ch, o.size ?? 0);
    if (face === 'serif') {
      const gl = serifGlyph(ch, o.size ?? 16);
      if (gl) {
        const cap = Math.round((SERIF.capHeight * (o.size ?? 16)) / SERIF.units);
        g.mask(gl.mask.data, gl.mask.width, gl.mask.height, Math.round(pen + gl.left) - gl.mask.pad, Math.round(y + cap) - gl.mask.baseline, colour);
      } else if (ch !== ' ') g.text(Math.round(pen), Math.round(y), ch, colour);
    } else {
      const b = faceOf(face);
      let m = b ? bitmapMask(b, face, ch) : null, dy = 0;
      // Chinese in small print: the body face's glyph, raised to sit on the same line.
      if (!m && face === 'small') { m = bitmapMask(BODY, 'body', ch); dy = -2; }
      if (m) {
        g.mask(m.data, m.w, m.h, Math.round(pen), Math.round(y) + dy, colour);
        if (o.bold) g.mask(m.data, m.w, m.h, Math.round(pen) + 1, Math.round(y) + dy, colour);
      } else if (ch !== ' ') {
        // The ROM: 16 lines tall, set so its middle sits where the face's would.
        g.text(Math.round(pen), Math.round(y) - (face === 'small' ? 4 : face === 'body' ? 1 : 0), ch, colour, { bold: o.bold });
      }
    }
    pen += w;
  }
  g.note(x, y, pen - x, lineHeight(face, o.size), s);
  return Math.round(pen - x) + (o.bold ? 1 : 0);
}

/** How tall a line of a face stands, for noting where its words are. */
export const lineHeight = (face: Face, size = 16) => (face === 'serif' ? size : LEAD[face]);

/** Whether a face has every character of `s` (the tests check the pages' own text). */
export function covers(face: 'body' | 'small', s: string): string[] {
  const b = faceOf(face)!;
  return [...new Set(Array.from(s).filter(ch => ch.charCodeAt(0) >= 32 && !b.glyphs[ch]))];
}
