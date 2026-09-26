import { HW, grey } from '../../crt/palette';
import { Frame } from '../../graphics/motion';
import type { Display } from '../../system/display';

/*
 * A channel that plays a real video: a <video> element off the page, each frame
 * drawn small (320 x 180), matched to the 16 colours the set knows with an ordered
 * dither, and laid on the page at two raster pixels a pixel, letterboxed. It plays
 * only while it is being drawn: tune away, or switch the set off, and within a
 * moment it pauses; its sound follows the machine's sound setting.
 */

const VW = 320, VH = 180;

/** The 16 colours as the card generator knows them (the tube draws them its own way). */
const VGA = [0x000000, 0x0000aa, 0x00aa00, 0x00aaaa, 0xaa0000, 0xaa00aa, 0xaa5500, 0xaaaaaa,
  0x555555, 0x5555ff, 0x55ff55, 0x55ffff, 0xff5555, 0xff55ff, 0xffff55, 0xffffff];

/**
 * For every colour (16 levels a channel), the two of the 16 that mix best to make it,
 * and how much of the second: a pink becomes white and light magenta side by side,
 * which from across the room is pink. Packed as first | second << 4 | share << 8.
 */
let mixes: Uint16Array | null = null;
function table(): Uint16Array {
  if (mixes) return mixes;
  mixes = new Uint16Array(16 * 16 * 16);
  const rgb = VGA.map(c => [c >> 16, (c >> 8) & 255, c & 255]);
  for (let r = 0; r < 16; r++) for (let g = 0; g < 16; g++) for (let b = 0; b < 16; b++) {
    const R = r * 17, G = g * 17, B = b * 17;
    let best = 0, bestE = Infinity;
    for (let i = 0; i < 16; i++) for (let j = i; j < 16; j++) {
      const ci = rgb[i], cj = rgb[j];
      // Far-apart pairs flicker as a pattern: they pay for it.
      const spread = ((ci[0] - cj[0]) ** 2 * 0.3 + (ci[1] - cj[1]) ** 2 * 0.59 + (ci[2] - cj[2]) ** 2 * 0.11) * 0.08;
      for (let k = 0; k <= 16; k++) {
        const a = k / 16;
        const dr = R - (ci[0] + (cj[0] - ci[0]) * a), dg = G - (ci[1] + (cj[1] - ci[1]) * a), db = B - (ci[2] + (cj[2] - ci[2]) * a);
        const e = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11 + spread * a * (1 - a) * 4;
        if (e < bestE) { bestE = e; best = i | (j << 4) | (k << 8); }
        if (i === j) break;
      }
    }
    mixes[(r << 8) | (g << 4) | b] = best;
  }
  return mixes;
}

/** Where each pixel sits in the 4 x 4 pattern: 0 to 15. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

type Player = { video: HTMLVideoElement; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; lastDraw: number; timer: number };
/** One player a video; null where there is no page to play it on (tests), so it is not tried again. */
const players = new Map<string, Player | null>();

function player(url: string): Player | null {
  if (players.has(url)) return players.get(url) ?? null;
  if (typeof document === 'undefined') { players.set(url, null); return null; }
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  canvas.width = VW; canvas.height = VH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || typeof video.play !== 'function') { players.set(url, null); return null; }
  video.src = url;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.volume = 0.55;
  const p: Player = { video, canvas, ctx, lastDraw: 0, timer: 0 };
  // Stops by itself once nobody draws it: tuned away, the set off, the window closed.
  p.timer = window.setInterval(() => {
    if (!video.paused && performance.now() - p.lastDraw > 300) video.pause();
  }, 150);
  players.set(url, p);
  return p;
}

/** A channel that shows the video at `url`. */
export function videoChannel(url: string): (d: Display, time: number) => void {
  return (d, time) => {
    const f = new Frame(d.graphics(), d.glyphs);
    f.clear(0);
    const p = player(url);
    if (!p) { f.snow(time, 1); d.present(); return; }
    p.lastDraw = performance.now();
    p.video.muted = !d.soundOn();
    if (p.video.paused) void p.video.play()?.catch(() => { /* not allowed yet: it tries again next frame */ });
    if (p.video.readyState >= 2) {
      p.ctx.drawImage(p.video, 0, 0, VW, VH);
      const px = p.ctx.getImageData(0, 0, VW, VH).data, mix = table(), b = f.b;
      const top = (400 - VH * 2) / 2;
      for (let y = 0; y < VH; y++) {
        for (let x = 0; x < VW; x++) {
          const i = (y * VW + x) * 4, m = mix[((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4)];
          // The second colour where the pattern's threshold is under its share.
          const v = (m >> 8) > BAYER[(y & 3) * 4 + (x & 3)] ? (m >> 4) & 15 : m & 15, at = (top + y * 2) * 640 + x * 2;
          b[at] = v; b[at + 1] = v; b[at + 640] = v; b[at + 641] = v;
        }
      }
    } else {
      // Still coming: the set's own card.
      f.snow(time, 0.5);
      f.centred(320, 192, d.t({ en: 'TUNING...', zh: '正在调谐……' }), HW.white);
    }
    // The broadcaster's corner mark.
    f.text(560, 16, 'JR-TV', grey(150));
    d.present();
  };
}
