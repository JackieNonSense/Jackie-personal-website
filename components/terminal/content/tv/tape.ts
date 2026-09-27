import { HW } from '../../crt/palette';
import { Frame, hash } from '../../graphics/motion';
import type { Display } from '../../system/display';

/*
 * Channel 15: the video recorder's input. With no tape in, the recorder's own blue
 * screen. With the tape from the night market, somebody's camcorder on a harbour wall
 * the night the year turned 2000: the countdown, the fireworks, the date stamp in the
 * corner rolling over. A thing a person held up and filmed; it plays round and round.
 */

export const TAPE_FLAG = 'bought:tape';

const LOOP = 44;
/** Seconds into the loop that are midnight. */
const MIDNIGHT = 20;
const W = 640, H = 400, SEA = 300;

/** Bright, then what it fades to. */
const COLOURS: [number, number][] = [
  [HW.lightRed, HW.red], [HW.yellow, HW.brown], [HW.lightCyan, HW.cyan],
  [HW.lightMagenta, HW.magenta], [HW.lightGreen, HW.green], [HW.white, HW.grey],
];

type Shell = { at: number; x: number; top: number; colour: [number, number]; size: number; kind: number };

/** Every rocket on the tape: a few before midnight, then the sky full. */
const SHELLS: Shell[] = (() => {
  const out: Shell[] = [];
  let t = 1.5, i = 0;
  while (t < LOOP - 4) {
    const r = (k: number) => hash(i * 97 + k * 13 + 5);
    out.push({ at: t, x: 90 + r(1) * 460, top: 70 + r(2) * 110, colour: COLOURS[Math.floor(r(3) * COLOURS.length)], size: 50 + r(4) * 50, kind: Math.floor(r(5) * 3) });
    // Midnight: they go up together.
    t += t > MIDNIGHT - 0.5 && t < MIDNIGHT + 9 ? 0.25 + r(6) * 0.35 : 1.4 + r(6) * 1.6;
    i++;
  }
  return out;
})();

const RISE = 1.1, BURST = 2.2;

/** What the harbour front looks like: the towers, and which windows are lit. */
const TOWERS = Array.from({ length: 22 }, (_, i) => {
  const w = 18 + Math.floor(hash(i * 7 + 1) * 26), h = 24 + Math.floor(hash(i * 5 + 2) ** 2 * 90);
  return { w, h };
});

/** The towers along the water, moved with the camera by (`sx`, `sy`). */
function skyline(f: Frame, sx: number, sy: number): void {
  let x = -6;
  TOWERS.forEach((t, i) => {
    f.rect(x + sx, SEA - t.h + sy, t.w, t.h, HW.black);
    for (let wy = SEA - t.h + 4; wy < SEA - 4; wy += 6) for (let wx = x + 3; wx < x + t.w - 3; wx += 5) {
      if (hash(i * 1000 + wx * 3 + wy) > 0.62) f.rect(wx + sx, wy + sy, 2, 2, hash(wx + wy * 7) > 0.8 ? HW.yellow : HW.brown);
    }
    x += t.w + 2;
  });
}

/** A shell, at `age` seconds after it went up; `mirror` draws it upside down on the water. */
function shell(f: Frame, s: Shell, age: number, mirror: boolean): void {
  const y = (v: number) => (mirror ? SEA + (SEA - v) * 0.55 + Math.sin(v * 0.3 + age * 6) * 2 : v);
  const [bright, dim] = s.colour;
  if (age < RISE) {
    const p = age / RISE, py = SEA - (SEA - s.top) * (1 - (1 - p) ** 2);
    if (!mirror) for (let k = 0; k < 6; k++) f.rect(s.x + (hash(k + age * 60) - 0.5) * 2, py + k * 5, 1, 3, k < 2 ? HW.white : HW.yellow);
    else f.dither(s.x, y(py), 1, 3, 0.5, HW.yellow, null);
    return;
  }
  const b = age - RISE;
  if (b > BURST) return;
  const p = b / BURST, n = s.kind === 2 ? 36 : 56;
  const reach = s.size * (1 - (1 - Math.min(1, b / 0.8)) ** 3);
  // First the flash, then the stars flying out on streaks, then falling and going out one by one.
  if (!mirror && b < 0.07) f.disc(s.x, s.top, 14, HW.white);
  else if (!mirror && b < 0.14) f.disc(s.x, s.top, 7, HW.yellow);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hash(k + s.at * 10) * 0.15;
    const inner = s.kind === 1 && k % 2 === 0;
    const rr = reach * (inner ? 0.55 : 1) * (0.88 + hash(k * 3 + s.at) * 0.24);
    const droop = b * b * 16, cx = Math.cos(a), cy = Math.sin(a) * 0.9;
    const px = s.x + cx * rr, py = s.top + cy * rr + droop;
    const colour = inner ? HW.white : p < 0.5 ? bright : dim;
    if (mirror) {
      if (p < 0.8 && py < SEA && hash(k * 5 + Math.floor(age * 24)) < 0.6) f.rect(px, y(py), 2, 1, dim);
      continue;
    }
    if (p < 0.5) {
      // The streak behind each star, shorter as it slows.
      const tail = Math.min(12, rr * 0.35) * (1 - p * 1.4);
      f.line(px - cx * tail, py - cy * tail - 1, px, py, colour);
      f.rect(px - 1, py - 1, 2, 2, b < 0.3 ? HW.white : colour);
    } else if (hash(k * 7 + Math.floor(age * 20)) < 1 - (p - 0.5) / 0.5) {
      // Going out: each star twinkles, and fewer of them each moment.
      f.rect(px - 1, py - 1, 2, 2, colour);
    }
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The recorder with nothing in it. */
function noTape(f: Frame, d: Display, time: number): void {
  f.clear(HW.blue);
  f.text(40, 36, 'AV', HW.white, 3);
  f.text(40, 84, 'VIDEO 1', HW.white, 2);
  if (Math.floor(time * 1.2) % 2 === 0) f.centred(W / 2, 184, d.t({ en: 'NO TAPE', zh: '无录像带' }), HW.white, 3);
  f.centred(W / 2, 330, d.t({ en: 'INSERT A CASSETTE', zh: '请放入录像带' }), HW.lightCyan, 1);
  d.present();
}

export function tape(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  if (!d.has(TAPE_FLAG)) { noTape(f, d, time); return; }
  const t = time % LOOP;
  // The first moments of every play are the tape finding its picture.
  if (t < 0.6) { f.snow(time, 1); d.present(); return; }

  // A hand holding the camera: the scene drifts a few pixels, all together.
  const sx = Math.round(Math.sin(time * 0.9) * 3 + Math.sin(time * 2.3) * 1.5), sy = Math.round(Math.sin(time * 1.3 + 1) * 2);
  f.clear(HW.black);
  // Night sky, lighter down by the city.
  f.dither(0, 150 + sy, W, 60, 0.12, HW.blue, null);
  f.dither(0, 210 + sy, W, SEA - 210, 0.3, HW.blue, null);
  f.dither(0, SEA + sy, W, H - SEA, 0.2, HW.blue, null);
  // A burst lights the sky for a moment.
  const glow = SHELLS.some(s => t - s.at > RISE && t - s.at < RISE + 0.15);
  if (glow) f.dither(0, 0, W, SEA + sy, 0.18, HW.blue, null);

  const live = SHELLS.filter(s => t >= s.at && t < s.at + RISE + BURST);
  for (const s of live) {
    const moved = { ...s, x: s.x + sx, top: s.top + sy };
    shell(f, moved, t - s.at, true);
    shell(f, moved, t - s.at, false);
  }
  // The city in front of it all, then the heads of the crowd on the harbour wall.
  skyline(f, sx, sy);
  for (let x = -20; x < W + 20; x += 26) {
    const h = 14 + hash(x * 3) * 10;
    f.disc(x + sx + (hash(x) - 0.5) * 8, H - 8 + sy, 13, HW.black, h);
  }

  // What the camcorder writes on the picture.
  const clock = 23 * 3600 + 59 * 60 + 40 + Math.floor(t);
  const s = clock % 86400, after = clock >= 86400;
  f.text(24, 20, '► PLAY', HW.white, 2);
  f.text(W - 24 - f.measure('SP', 2), 20, 'SP', HW.white, 2);
  const date = after ? 'JAN. 1 2000' : 'DEC.31 1999';
  const hms = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  f.text(W - 24 - f.measure(date, 2), H - 60, date, HW.white, 2);
  f.text(W - 24 - f.measure(hms, 2), H - 36, hms, HW.white, 2);
  // The last ten seconds, counted down by the crowd; then the title the camera can type.
  const left = MIDNIGHT - t;
  if (left > 0 && left <= 10) f.centred(W / 2 + sx, 150 + sy, String(Math.ceil(left)), HW.white, 5);
  if (t >= MIDNIGHT && t < MIDNIGHT + 7 && Math.floor((t - MIDNIGHT) * 2) % 4 !== 3) {
    f.centred(W / 2, 176, d.t({ en: 'HAPPY NEW YEAR', zh: '新年快乐' }), HW.yellow, 3);
    f.centred(W / 2, 232, '2000', HW.yellow, 3);
  }
  // An old tape: a few dropouts, and now and then the tracking goes.
  f.speckle(time, 0.04);
  const bad = hash(Math.floor(time * 4) * 7 + 3);
  f.tracking(time, bad > 0.93 ? 0.7 : 0.12);
  d.present();
}
