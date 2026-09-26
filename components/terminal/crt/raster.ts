import { GLYPH_H, GLYPH_W } from './font';
import { ATTR, COLS, ROWS, type Grid } from './grid';
import { GREY, INK } from './palette';

/** What the beam draws for one frame: 640 x 400 palette indices (crt/palette.ts), row 0 at the top. */
export const RASTER_W = COLS * GLYPH_W;
export const RASTER_H = ROWS * GLYPH_H;

/** VGA blinks the cursor every 16 frames and blinking text every 32, at 70 Hz. */
export const CURSOR_PERIOD = 32 / 70;
export const BLINK_PERIOD = 64 / 70;
const CURSOR_ROWS = [14, 15];

export type RasterMode = 'text' | 'static';

export function blinkPhase(time: number): number {
  return (Math.floor(time / (CURSOR_PERIOD / 2)) & 1) | ((Math.floor(time / (BLINK_PERIOD / 2)) & 1) << 1);
}

/** The colour an attribute gives a character. */
function lit(attr: number): number {
  return attr & ATTR.accent ? INK.tmAccent : attr & ATTR.bright ? INK.tmBright : attr & ATTR.dim ? INK.tmDim : INK.tmText;
}

/**
 * Draws the page into the raster. Zoom 2 is the 40-column mode: every glyph pixel is
 * doubled both ways, and the page is centred in whatever rows remain. When
 * `transparent`, blank cells are skipped so the page lies over what is already drawn.
 */
export function rasterizeText(grid: Grid, glyphs: Uint8Array, out: Uint8Array, time: number, zoom: 1 | 2 = 1, transparent = false): void {
  const phase = blinkPhase(time), cursorOn = (phase & 1) === 0, blinkOn = (phase & 2) === 0;
  const cw = GLYPH_W * zoom, ch = GLYPH_H * zoom;
  const ox = (RASTER_W - grid.cols * cw) >> 1, oy = (RASTER_H - grid.rows * ch) >> 1;
  if ((ox || oy) && !transparent) out.fill(INK.tmBg);
  for (let cy = 0; cy < grid.rows; cy++) for (let cx = 0; cx < grid.cols; cx++) {
    const i = cy * grid.cols + cx, attr = grid.attrs[i];
    const cursorHere = grid.cursor.visible && grid.cursor.x === cx && grid.cursor.y === cy;
    if (transparent && grid.codes[i] === 32 && !(attr & (ATTR.inverse | ATTR.underline)) && !cursorHere) continue;
    // Inverse lights the cell and leaves the character dark.
    const on = lit(attr), inverse = attr & ATTR.inverse;
    const ink = inverse ? INK.tmInvText : on, paper = inverse ? on : INK.tmBg;
    const hidden = attr & ATTR.blink && !blinkOn;
    const glyph = grid.codes[i] * GLYPH_H;
    const cursor = cursorHere && cursorOn;
    for (let y = 0; y < ch; y++) {
      const gy = (y / zoom) | 0;
      let bits = hidden ? 0 : glyphs[glyph + gy], fg = ink;
      if (attr & ATTR.underline && gy === GLYPH_H - 1) bits = 0xff;
      if (cursor && CURSOR_ROWS.includes(gy)) { bits = 0xff; fg = on; }
      const row = (oy + cy * ch + y) * RASTER_W + ox + cx * cw;
      for (let x = 0; x < cw; x++) out[row + x] = bits & (0x80 >> ((x / zoom) | 0)) ? fg : paper;
    }
  }
}

/** Off-air snow: no sync, so coarse noise stretched along the scan, with a drifting band. */
export function rasterizeStatic(out: Uint8Array, time: number, seed: number): void {
  let s = (seed ^ Math.floor(time * 60) * 2654435761) >>> 0 || 1;
  const band = ((time * 0.23) % 1.2 - 0.1) * RASTER_H;
  const GRAIN_W = 3, GRAIN_H = 2;
  for (let y = 0; y < RASTER_H; y += GRAIN_H) {
    const lift = Math.exp(-(((y - band) / 38) ** 2)) * 0.35;
    for (let x = 0; x < RASTER_W; x += GRAIN_W) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      const r = (s & 0xffff) / 0xffff;
      const v = GREY[Math.min(255, Math.round((r ** 5 + lift * r * r) * 255))];
      for (let dy = 0; dy < GRAIN_H; dy++) out.fill(v, (y + dy) * RASTER_W + x, (y + dy) * RASTER_W + Math.min(RASTER_W, x + GRAIN_W));
    }
  }
}
