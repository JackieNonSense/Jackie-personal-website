import { HW } from '../../crt/palette';
import { Frame, picture } from '../../graphics/motion';
import type { Picture } from '../../graphics/bitmap';
import type { Display } from '../../system/display';

/*
 * What the station's programmes are made of: photographed plates (prepared from the
 * masters in terminal-art-lab, see its prep.py), the camera's slow push-in on a
 * still, water that moves inside a still, and the station's own graphics laid over
 * them: the corner bug, the clock, the caption band.
 */

export type Box = { x: number; y: number; w: number; h: number };

/** A plate, once it has loaded; null until then. */
export const plate = (d: Display, url: string): Picture | null => picture(u => d.loadPicture(u), url);

/**
 * A still filling `dst`, pushed in on slowly: at `k` 0 it is framed `from`, at 1
 * framed `to`, each a part of the picture in fractions (x, y, w, h).
 */
export function pushIn(f: Frame, p: Picture, k: number, from: Box, to: Box, dst: Box = { x: 0, y: 0, w: 640, h: 400 }): void {
  const lerp = (a: number, b: number) => a + (b - a) * k;
  f.picture(p, dst, {
    x: p.width * lerp(from.x, to.x), y: p.height * lerp(from.y, to.y),
    w: p.width * lerp(from.w, to.w), h: p.height * lerp(from.h, to.h),
  });
}

/** Frames a second the water moves at, as the station's own effects box managed. */
const WATER_FPS = 12;
type Rippled = { frame: number; out: Picture };
const rippled = new WeakMap<Picture, Rippled>();

/**
 * Water inside a still: the rows below `from` (a fraction of the height) drawn from
 * a little to the side, more so nearer the camera, with the glints brightened and
 * dimmed as they travel. Everything above stays exactly as photographed.
 */
export function water(p: Picture, time: number, from: number, strength = 1): Picture {
  const frame = Math.floor(time * WATER_FPS);
  let r = rippled.get(p);
  if (r && r.frame === frame) return r.out;
  if (!r) {
    r = { frame: -1, out: { width: p.width, height: p.height, data: p.data.slice(), rgb: p.rgb?.slice() } };
    rippled.set(p, r);
  }
  r.frame = frame;
  const { width: w, height: h } = p, out = r.out, t = frame / WATER_FPS, top = Math.floor(h * from);
  for (let y = top; y < h; y++) {
    const depth = (y - top) / Math.max(1, h - top);
    const amp = strength * (0.6 + depth * 2.4);
    for (let x = 0; x < w; x++) {
      const wave = Math.sin(x * 0.035 + y * 0.31 - t * 2.1 + Math.sin(y * 0.05 + t * 0.7) * 1.4);
      const sx = Math.min(w - 1, Math.max(0, x + Math.round(wave * amp)));
      const glint = 1 + wave * 0.05 * strength;
      const i = y * w + x, s = y * w + sx;
      out.data[i] = Math.min(255, p.data[s] * glint);
      if (p.rgb && out.rgb) for (let c = 0; c < 3; c++) out.rgb[i * 3 + c] = Math.min(255, p.rgb[s * 3 + c] * glint);
    }
  }
  return out;
}

/** A panel half seen through, as a vision mixer laid one: `v` over every other pixel. */
export function veil(f: Frame, b: Box, v: number, level = 0.5): void {
  f.dither(b.x, b.y, b.w, b.h, level, v, null);
}

/** The station's corner bug: the channel's name in a small translucent box. */
export function bug(f: Frame, name: string): void {
  const w = f.measure(name) + 16;
  veil(f, { x: 20, y: 18, w, h: 22 }, HW.black, 0.5);
  f.text(28, 21, name, HW.white);
}

/** The clock in the other corner, as a station showed it. */
export function clock(f: Frame, now: Date, live?: string): void {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  let x = 620 - f.measure(time) - 12;
  veil(f, { x, y: 18, w: f.measure(time) + 12, h: 22 }, HW.black, 0.5);
  f.text(x + 6, 21, time, HW.white);
  if (live) {
    const w = f.measure(live) + 12;
    x -= w;
    f.rect(x, 18, w, 22, HW.red);
    f.text(x + 6, 21, live, HW.white);
  }
}
