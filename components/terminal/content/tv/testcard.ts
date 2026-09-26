import { HW, grey } from '../../crt/palette';
import { Frame, hash } from '../../graphics/motion';
import { machineNow } from '../time';
import type { Display } from '../../system/display';

/*
 * Channel 2 between programmes: a line-up card after the ones broadcasters left up
 * all night. A grey field ruled in white, and a circle holding the colour bars, the
 * grey steps and the fine gratings, with the station's box in the middle and its
 * clock. Once in a long while, for two frames, the box says something else.
 */

const CX = 320, CY = 200, R = 158;
const pad = (n: number) => String(n).padStart(2, '0');

/** A band across the circle, filled a column at a time by `colour(x)`. */
function band(f: Frame, y0: number, y1: number, colour: (x: number) => number): void {
  for (let y = y0; y < y1; y++) {
    const k = R * R - (y - CY) ** 2;
    if (k <= 0) continue;
    const half = Math.sqrt(k);
    for (let x = Math.ceil(CX - half); x < CX + half; x++) f.b[y * 640 + x] = colour(x);
  }
}

export function testCard(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  const field = grey(96), rule = grey(230);
  f.clear(field);
  for (let x = 20; x < 640; x += 40) f.rect(x, 0, 2, 400, rule);
  for (let y = 0; y < 400; y += 40) f.rect(0, y, 640, 2, rule);
  // The corners: black and white blocks, for the set's edges.
  for (const [x, y] of [[0, 0], [600, 0], [0, 360], [600, 360]]) { f.rect(x, y, 40, 40, 0); f.rect(x + 10, y + 10, 20, 20, HW.white); }
  f.disc(CX, CY, R + 3, HW.white);
  f.disc(CX, CY, R, 0);
  // Top: castellations; then the colour bars; the grey steps; the gratings; the bottom bar.
  const top = CY - R;
  band(f, top, top + 44, x => (Math.floor((x - CX) / 22) & 1 ? HW.white : 0));
  const bars = [HW.yellow, HW.lightCyan, HW.lightGreen, HW.lightMagenta, HW.lightRed, HW.lightBlue, HW.white, 0];
  band(f, top + 44, top + 118, x => bars[Math.min(7, Math.max(0, Math.floor(((x - (CX - R)) / (2 * R)) * 8)))]);
  band(f, top + 118, top + 150, x => grey(Math.round(Math.min(5, Math.max(0, Math.floor(((x - (CX - R)) / (2 * R)) * 6))) * 51)));
  band(f, top + 214, top + 256, x => {
    // Finer and finer: 8, 4, 2 and 1 pixel lines, as far as the tube can resolve.
    const u = (x - (CX - R)) / (2 * R), w = u < 0.25 ? 8 : u < 0.5 ? 4 : u < 0.75 ? 2 : 1;
    return Math.floor(x / w) & 1 ? HW.white : 0;
  });
  band(f, top + 256, top + 2 * R, x => (x < CX ? HW.red : HW.blue));
  // The station's box.
  const glitch = hash(Math.floor(time / 0.12) * 13 + 5) > 0.992;
  f.rect(CX - 112, top + 150, 224, 64, 0);
  f.box(CX - 112, top + 150, 224, 64, HW.white);
  const now = machineNow();
  if (glitch) {
    f.centred(CX, top + 166, d.t({ en: 'HE IS WATCHING', zh: '他在看' }), HW.lightRed, 2);
  } else {
    f.centred(CX, top + 156, 'JR-TV', HW.white, 2, 4);
    f.centred(CX, top + 192, `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`, grey(200));
  }
  d.present();
}
