import { CAP_HEIGHT, GLYPHS } from './mark-glyphs';
import { rasterGlyph, type GlyphMask } from '../graphics/outline';
import { H, W } from '../graphics/bitmap';
import { INK } from '../crt/palette';
import type { Icon } from '../system/gui/gfx';
import type { Ident } from '../system/apps/boot';

/*
 * The mark: a nameplate. A light frame with a deeper band along its foot, a field of
 * colour, and J R across the field cut into slats, the way broadcast idents cut their
 * letters; J&R small on the band. It comes on the way a station ident did, and goes
 * off the way a set does: squeezed to a line, then to a point.
 *
 * Its three colours are the palette roles plate, plateField and plateInk, so every
 * tube shows it in its own way.
 */

/** The plate's parts at one size, worked out once. */
type Plate = {
  size: number;
  frame: number;
  band: number;
  field: { x: number; y: number; w: number; h: number };
  /** J and R, one byte a pixel over the plate's square. */
  letters: Uint8Array;
  /** The rows of each slat, top to bottom. */
  slats: [number, number][];
  /** J&R on the band, when the plate is big enough to read it. */
  word: Uint8Array | null;
};

const SLATS = 7;
const plates = new Map<number, Plate>();

function stampMask(into: Uint8Array, size: number, g: GlyphMask, x: number, baseline: number): void {
  const ox = Math.round(x) - g.pad, oy = Math.round(baseline - g.baseline);
  for (let y = 0; y < g.height; y++) {
    const ty = oy + y;
    if (ty < 0 || ty >= size) continue;
    for (let xx = 0; xx < g.width; xx++) {
      const tx = ox + xx;
      if (tx >= 0 && tx < size && g.data[y * g.width + xx]) into[ty * size + tx] = 1;
    }
  }
}

function plate(size: number): Plate {
  const hit = plates.get(size);
  if (hit) return hit;
  const S = size, frame = Math.max(1, Math.round(S * 0.047)), band = Math.max(frame + 2, Math.round(S * 0.19));
  const field = { x: frame, y: frame, w: S - 2 * frame, h: S - frame - band };
  const cap = Math.round(S * 0.55), bold = S * 0.0147;
  const J = rasterGlyph(GLYPHS.J, cap, CAP_HEIGHT, bold), R = rasterGlyph(GLYPHS.R, cap, CAP_HEIGHT, bold);
  const gap = Math.round(S * 0.034), total = J.ink + gap + R.ink;
  const left = field.x + (field.w - total) / 2 - 2, baseline = field.y + field.h - Math.round(S * 0.052);
  const letters = new Uint8Array(S * S);
  stampMask(letters, S, J, left, baseline);
  stampMask(letters, S, R, left + J.ink + gap, baseline);
  const top = baseline - cap - Math.round(S * 0.017), bottom = baseline + Math.round(S * 0.017);
  const step = (bottom - top) / SLATS, cut = Math.max(1, Math.round(S * 0.013));
  const slats = Array.from({ length: SLATS }, (_, s) => [Math.round(top + s * step), Math.round(top + (s + 1) * step) - cut] as [number, number]);
  let word: Uint8Array | null = null;
  if (S >= 100) {
    word = new Uint8Array(S * S);
    const small = Math.round(S * 0.095), letters3 = (['J', '&', 'R'] as const).map(c => rasterGlyph(GLYPHS[c], small, CAP_HEIGHT, S * 0.0047));
    const spacing = Math.round(S * 0.03), width = letters3.reduce((w, g) => w + g.ink, 0) + 2 * spacing;
    let x = (S - width) / 2;
    for (const g of letters3) { stampMask(word, S, g, x, S - Math.round((band - frame) / 2) + Math.round(small / 2) - frame); x += g.ink + spacing; }
  }
  const p: Plate = { size: S, frame, band, field, letters, slats, word };
  plates.set(size, p);
  return p;
}

/** How far along each part of the plate is. */
type PlateState = {
  /** The frame, drawn clockwise edge by edge: 0 to 4. */
  frame: number;
  /** The band at the foot, growing up from the bottom edge: 0 to 1. */
  band: number;
  /** The field, let down like a blind: 0 to 1. */
  roll: number;
  /** Each slat's offset, in plate widths from its place (null: not in yet). */
  slat(s: number): number | null;
  word: boolean;
};

const WHOLE: PlateState = { frame: 4, band: 1, roll: 1, slat: () => 0, word: true };

/*
 * The plate is drawn the way the machine could have drawn it: in 320 x 200, each of
 * its pixels two by two on the page, and moved at 12.5 frames a second, so it
 * steps rather than glides and has the same grain as the text that follows it.
 */
const LO = 2;
const LW = W / LO, LH = H / LO;
const FPS = 12.5;
const low = new Uint8Array(W * H);
/** The low page as it was, for the squeeze at switch-off. */
const before = new Uint8Array(LH * W);

/** The low page's `w` x `h` from (x0, y0), doubled onto the page at (x, y). */
function blowUp(b: Uint8Array, x0: number, y0: number, w: number, h: number, x: number, y: number): void {
  for (let yy = 0; yy < h; yy++) {
    const from = (y0 + yy) * W + x0;
    for (let d = 0; d < LO; d++) {
      const ty = y + yy * LO + d;
      if (ty < 0 || ty >= H) continue;
      for (let xx = 0; xx < w; xx++) {
        const tx = x + xx * LO, v = low[from + xx];
        if (tx >= 0 && tx + 1 < W) { b[ty * W + tx] = v; b[ty * W + tx + 1] = v; }
      }
    }
  }
}

function fill(b: Uint8Array, x: number, y: number, w: number, h: number, v: number): void {
  const x0 = Math.max(0, Math.round(x)), x1 = Math.min(W, Math.round(x + w));
  const y0 = Math.max(0, Math.round(y)), y1 = Math.min(H, Math.round(y + h));
  if (x1 <= x0) return;
  for (let yy = y0; yy < y1; yy++) b.fill(v, yy * W + x0, yy * W + x1);
}

function drawPlate(b: Uint8Array, px: number, py: number, p: Plate, st: PlateState): void {
  const S = p.size, F = p.frame, light = INK.plate;
  // The frame: top, right, bottom, left, each growing from where the last ended.
  const edge = (k: number) => Math.max(0, Math.min(1, st.frame - k));
  fill(b, px, py, S * edge(0), F, light);
  fill(b, px + S - F, py, F, S * edge(1), light);
  fill(b, px + S * (1 - edge(2)), py + S - F, S * edge(2), F, light);
  fill(b, px, py + S * (1 - edge(3)), F, S * edge(3), light);
  if (st.band > 0) { const h = (p.band - F) * st.band; fill(b, px, py + S - F - h, S, h, light); }
  const f = p.field;
  if (st.roll > 0) fill(b, px + f.x, py + f.y, f.w, Math.round(f.h * st.roll), INK.plateField);
  if (st.roll >= 1) {
    p.slats.forEach(([top, bottom], s) => {
      const offset = st.slat(s);
      if (offset === null) return;
      const shift = Math.round(offset * S);
      for (let y = top; y < bottom; y++) {
        const ty = py + y;
        if (ty < 0 || ty >= H) continue;
        for (let x = f.x; x < f.x + f.w; x++) {
          const sx = x - shift;
          if (sx < 0 || sx >= S || !p.letters[y * S + sx]) continue;
          const tx = px + x;
          if (tx >= 0 && tx < W) b[ty * W + tx] = light;
        }
      }
    });
  }
  if (st.word && p.word) {
    for (let y = S - p.band; y < S; y++) for (let x = 0; x < S; x++) {
      if (!p.word[y * S + x]) continue;
      const tx = px + x, ty = py + y;
      if (tx >= 0 && tx < W && ty >= 0 && ty < H) b[ty * W + tx] = INK.plateInk;
    }
  }
}

// ── Timing ───────────────────────────────────────────────────────────────────

const clamp = (t: number) => Math.max(0, Math.min(1, t));
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * clamp(t)));
const inCubic = (t: number) => clamp(t) ** 3;
const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
const outBack = (t: number, s = 1.3) => { const x = clamp(t) - 1; return 1 + x * x * ((s + 1) * x + s); };

/** Seconds of the going: the slats out, the blind up, the set switched off. */
const OUT = 1.0;
/** In low pixels: 232 on the page. */
const SIZE = 116;

/**
 * The ident at `t` of `length` seconds. Coming on (about 1.6 seconds, quicker for a
 * visitor who has been before): the frame drawn clockwise, the band, the blind let
 * down, the slats sliding in from alternate sides. Going: the slats out, the blind
 * up, and the picture squeezed to a line and a point.
 */
function drawIdent(b: Uint8Array, t: number, length: number, still: boolean, quick: boolean): void {
  const p = plate(SIZE), px = Math.round((LW - SIZE) / 2), py = Math.round((LH - SIZE) / 2);
  low.fill(0);
  if (still) { drawPlate(low, px, py, p, WHOLE); blowUp(b, 0, 0, LW, LH, 0, 0); return; }
  t = Math.min(length, Math.ceil(t * FPS) / FPS);
  const a = t * (quick ? 1.45 : 1), out = t - (length - OUT);
  const frame = outExpo((a - 0.05) / 0.6) * 4;
  const st: PlateState = {
    frame,
    band: outExpo((frame - 3.2) / 0.8),
    roll: outExpo((a - 0.5) / 0.45) * (1 - smooth((out - 0.3) / 0.3)),
    slat: s => {
      const come = outBack((a - 0.9 - s * 0.05) / 0.42), go = inCubic((out - s * 0.03) / 0.3);
      if (come <= 0) return null;
      return (s % 2 ? 1 : -1) * ((1 - come) + go);
    },
    word: outExpo((frame - 3.2) / 0.8) > 0.9,
  };
  drawPlate(low, px, py, p, st);
  // Switched off: squeezed to a line through the middle, then the line to a point.
  const off = clamp((t - (length - 0.42)) / 0.42);
  if (off > 0) {
    const cy = py + SIZE / 2;
    if (off < 0.58) {
      const sq = Math.max(0.003, 1 - smooth(off * 1.7));
      before.set(low.subarray(0, LH * W));
      for (let y = 0; y < LH; y++) {
        const from = Math.round(cy + (y - cy) / sq);
        if (Math.abs(y - cy) > Math.max(1, (SIZE * sq) / 2) || from < 0 || from >= LH) low.fill(0, y * W, (y + 1) * W);
        else low.set(before.subarray(from * W, (from + 1) * W), y * W);
      }
    } else {
      low.fill(0);
      const k = smooth((off - 0.58) / 0.42), half = (SIZE / 2) * (1 - k) + 1;
      fill(low, LW / 2 - half, cy - 1, 2 * half, 1 + k, INK.plate);
    }
  }
  blowUp(b, 0, 0, LW, LH, 0, 0);
}

/** The plate alone, `size` page pixels square, in the same doubled pixels. */
function drawBadge(b: Uint8Array, x: number, y: number, size: number): void {
  const s = Math.round(size / LO);
  low.fill(0, 0, s * W);
  drawPlate(low, 0, 0, plate(s), WHOLE);
  blowUp(b, 0, 0, s, s, x, y);
}

export const IDENT: Ident = {
  name: 'J&R.',
  fps: FPS,
  length: (returning, still) => (still ? 1.2 : returning ? 3.0 : 4.6),
  draw: (b, t, length, still, returning) => drawIdent(b, t, length, still, returning),
  badge: drawBadge,
};

/**
 * The plate in 16 pixels, for the top bar: drawn by hand, a pixel at a time, since
 * nothing so small survives being scaled down.
 */
export const MARK_ICON: Icon = {
  w: 16, h: 16,
  rows: [
    '################',
    '#..............#',
    '#...###.####...#',
    '#.....#.#...#..#',
    '#.....#.#...#..#',
    '#.....#.####...#',
    '#.#...#.#.#....#',
    '#.#...#.#..#...#',
    '#..###..#...#..#',
    '#..............#',
    '################',
    '################',
    '################',
    '################',
    '################',
    '################',
  ],
  ink: { '#': 'plate', '.': 'plateField' },
};
