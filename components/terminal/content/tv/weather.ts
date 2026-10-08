import { HW, grey } from '../../crt/palette';
import { Frame, hash, outBack, outCubic, smooth, span } from '../../graphics/motion';
import { plate, pushIn, veil, water, type Box } from './footage';
import type { Picture } from '../../graphics/bitmap';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 3: tonight's weather, the way the local station did it: a character
 * generator, a map drawn once by hand, and the camera on the station's roof. The
 * title; the rooftops at dusk with each district's number; the map with the clouds
 * going over; the avenue in the rain under three cards for the night, the morning
 * and tomorrow; the harbour for the boats. Then an advisory nobody asked for: the
 * rooftops go dark and the camera closes in on one window still lit.
 */

const LOOP = 36;
const DIR = '/terminal/tv/weather';
const MAP = { x: 0, y: 34, w: 640, h: 366 };

type District = { x: number; y: number; name: Text; temp: number };
const DISTRICTS: District[] = [
  { x: 150, y: 110, name: { en: 'OLD TOWN', zh: '旧城' }, temp: 19 },
  { x: 300, y: 172, name: { en: 'MARKET', zh: '电子市场' }, temp: 20 },
  { x: 118, y: 250, name: { en: 'YOUR STREET', zh: '你住的街' }, temp: 18 },
  { x: 402, y: 96, name: { en: 'THE ROOMS', zh: '房间' }, temp: 23 },
];

// ── The map, worked out once: 0 sea, 1 land, 2 coast ─────────────────────────
let land: Uint8Array | null = null;
function map(): Uint8Array {
  if (land) return land;
  land = new Uint8Array(640 * 400);
  for (let y = 0; y < 400; y++) for (let x = 0; x < 640; x++) {
    const coast = x * 0.85 + y * 1.05 - 560 + 46 * Math.sin(y / 41) + 26 * Math.sin(x / 23 + 1) + 12 * Math.sin((x + y) / 9);
    const river = Math.abs(y - (60 + x * 0.42 + 16 * Math.sin(x / 38))) < 4 + x / 160;
    land[y * 640 + x] = coast < 0 && !river ? 1 : 0;
  }
  const edge = land.slice();
  for (let y = 1; y < 399; y++) for (let x = 1; x < 639; x++) {
    const i = y * 640 + x;
    if (land[i] && (!land[i - 1] || !land[i + 1] || !land[i - 640] || !land[i + 640])) edge[i] = 2;
  }
  land = edge;
  return land;
}

/** The map, looked at from `zoom` times closer at `focus`, placed at `at` on the screen; `night` from 0 to 1. */
function drawMap(f: Frame, zoom: number, focus: { x: number; y: number }, at: { x: number; y: number }, night: number): void {
  const m = map(), b = f.b;
  const sea = night > 0.5 ? 0 : HW.blue, seaLight = night > 0.5 ? HW.blue : HW.lightBlue;
  const ground = night > 0.5 ? HW.darkGrey : HW.green, groundLight = night > 0.5 ? 0 : HW.lightGreen;
  const coast = night > 0.5 ? grey(150) : HW.lightCyan;
  for (let y = MAP.y; y < MAP.y + MAP.h; y++) {
    const sy = Math.round(focus.y + (y - at.y) / zoom);
    for (let x = 0; x < 640; x++) {
      const sx = Math.round(focus.x + (x - at.x) / zoom);
      const v = sx < 0 || sy < 0 || sx >= 640 || sy >= 400 ? 0 : m[sy * 640 + sx];
      const d = ((x & 3) + (y & 3) * 4) % 7 === 0;
      b[y * 640 + x] = v === 2 ? coast : v === 1 ? (d ? groundLight : ground) : (d && (y & 1) ? seaLight : sea);
    }
  }
}

// ── Clouds and signs ─────────────────────────────────────────────────────────
const CLOUDS = [
  { x: 40, y: 90, s: 1.1 }, { x: 260, y: 60, s: 0.8 }, { x: 460, y: 140, s: 1.3 }, { x: 120, y: 210, s: 0.9 }, { x: 380, y: 260, s: 1 },
];

function cloud(f: Frame, x: number, y: number, s: number, shade: number, light: number): void {
  const puffs: [number, number, number][] = [[0, 8, 16], [18, 0, 20], [40, 6, 17], [56, 12, 12], [24, 14, 16]];
  for (const [dx, dy, r] of puffs) f.disc(x + dx * s, y + dy * s + 3, r * s, shade);
  for (const [dx, dy, r] of puffs) f.disc(x + dx * s, y + dy * s, r * s, light);
}

const MOON = ['..###.', '.##...', '##....', '##....', '.##...', '..###.'];
const RAIN = ['.####.', '######', '######', '.#.#.#', '#.#.#.', '.#.#.#'];
const SUN = ['#..#..#', '.#####.', '.#####.', '#######', '.#####.', '.#####.', '#..#..#'];

const CARDS: { when: Text; icon: string[]; colour: number; temp: string; says: Text }[] = [
  { when: { en: 'TONIGHT', zh: '今夜' }, icon: MOON, colour: HW.yellow, temp: '18°', says: { en: 'Cloudy', zh: '多云' } },
  { when: { en: 'MORNING', zh: '明早' }, icon: RAIN, colour: HW.lightCyan, temp: '16°', says: { en: 'Drizzle', zh: '小雨' } },
  { when: { en: 'TOMORROW', zh: '明天' }, icon: SUN, colour: HW.yellow, temp: '22°', says: { en: 'Good for creating', zh: '适宜创作' } },
];

const ADVISORY: Text[] = [
  { en: 'STAY INDOORS AT 3:07', zh: '凌晨 3:07 请留在室内' },
  { en: 'DO NOT LOOK AT THE LIGHTS', zh: '不要看窗外的灯' },
  { en: 'ONE WINDOW IS STILL LIT', zh: '有一扇窗还亮着' },
];

const SEA: Text[] = [
  { en: 'Inshore: wind force 2 to 3', zh: '近海：偏东风 2 到 3 级' },
  { en: 'Visibility good, haze at dawn', zh: '能见度良好，清晨有轻雾' },
  { en: 'Fishing boats may go out', zh: '渔船可正常出海' },
];

/** The rooftop camera: the lit window and the warning light on the mast, as fractions of the picture. */
const WINDOW = { x: 0.575, y: 0.63, w: 0.017, h: 0.034 };
const MAST = { x: 0.71, y: 0.314 };

function header(f: Frame, d: Display, colour: number, ink: number, title: Text, reveal: number): void {
  f.rect(0, 0, 640 * reveal, 34, colour);
  if (reveal > 0.6) {
    f.text(16, 1, d.t(title), ink, 2);
    f.text(520, 9, d.t({ en: 'CH 3', zh: '3 频道' }), ink);
  }
}

/** Where a point of the picture (fractions) lands on the screen, when `src` (fractions) fills it. */
const onScreen = (src: Box, x: number, y: number) => ({ x: ((x - src.x) / src.w) * 640, y: ((y - src.y) / src.h) * 400 });
const lerpBox = (a: Box, b: Box, k: number): Box => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k });

/** Rain, falling a little slanted, lit by the street. */
function rain(f: Frame, t: number): void {
  for (let i = 0; i < 260; i++) {
    const speed = 520 + hash(i * 3) * 260, x0 = hash(i * 7 + 1) * 700;
    const y = ((hash(i * 11 + 2) * 460 + t * speed) % 460) - 30, x = x0 - y * 0.18;
    f.line(x, y, x - 2, y + 9 + hash(i) * 6, grey(150 + hash(i * 5) * 80));
  }
}

/** Gulls over the water: two strokes each, wings beating. */
function gulls(f: Frame, t: number): void {
  for (let i = 0; i < 4; i++) {
    const x = ((hash(i * 13) * 640 + t * (14 + i * 5)) % 700) - 30, y = 70 + hash(i * 17) * 90 + Math.sin(t * 0.8 + i) * 6;
    const up = Math.sin(t * 6 + i * 2) > 0 ? 3 : 0;
    f.line(x - 6, y - up, x, y + 2, grey(40), 2);
    f.line(x, y + 2, x + 6, y - up, grey(40), 2);
  }
}

/** A caption band at the foot of a view: a label, then lines of the forecast. */
function band(f: Frame, d: Display, label: Text, lines: string[], k: number): void {
  if (k <= 0) return;
  const h = 30 + lines.length * 20;
  veil(f, { x: 0, y: 372 - h, w: 640 * k, h }, HW.black, 0.85);
  f.rect(0, 372 - h, 6, h, HW.yellow);
  if (k < 0.95) return;
  f.text(18, 378 - h, d.t(label), HW.yellow);
  lines.forEach((line, i) => f.text(18, 400 - h + i * 20, line, HW.white));
}

function title(f: Frame, d: Display, t: number): void {
  f.clear(HW.blue);
  for (let k = 0; k < 5; k++) {
    const w = span(t, 0.1 + k * 0.08, 0.7 + k * 0.08, outCubic) * 640;
    f.rect(0, 150 + k * 14, w, 8, [HW.yellow, HW.lightRed, HW.lightMagenta, HW.lightCyan, HW.lightGreen][k]);
  }
  const up = span(t, 0.6, 1.2, outBack);
  f.centred(320, 90 + (1 - up) * 40, d.t({ en: 'TONIGHT', zh: '今夜天气' }), HW.white, 3, 2);
  if (t > 1.1) f.centred(320, 240, d.t({ en: 'THE WEATHER, WITH NOBODY', zh: '天气预报 · 无人主持' }), HW.yellow, 1, 2);
}

/** The rooftops at dusk, each district's number down the left. */
function rooftops(f: Frame, d: Display, t: number, roof: Picture): void {
  const from = { x: 0.04, y: 0.08, w: 0.92, h: 0.92 }, to = { x: 0.1, y: 0.1, w: 0.84, h: 0.84 };
  const k = span(t, 2.6, 9.6, smooth);
  pushIn(f, roof, k, from, to);
  const mast = onScreen(lerpBox(from, to, k), MAST.x, MAST.y);
  if (Math.floor(t * 1.2) % 2 === 0) f.disc(mast.x, mast.y, 2, HW.lightRed);
  header(f, d, HW.yellow, 0, { en: "TONIGHT'S WEATHER", zh: '今夜天气' }, span(t, 2.6, 3.2, outCubic));
  DISTRICTS.forEach((dist, i) => {
    const r = span(t, 3.4 + i * 0.3, 4 + i * 0.3, outBack);
    if (r <= 0) return;
    const y = 64 + i * 50, x = 20 - (1 - r) * 220;
    veil(f, { x, y, w: 200, h: 40 }, HW.blue, 0.75);
    f.text(x + 10, y + 12, d.t(dist.name), HW.white);
    f.text(x + 132, y + 4, `${dist.temp}°`, HW.yellow, 2);
  });
}

/** The forecast map: clouds drifting east, every district's number on it. */
function forecastMap(f: Frame, d: Display, t: number): void {
  drawMap(f, 1, { x: 320, y: 200 }, { x: 320, y: 200 }, 0);
  for (const c of CLOUDS) {
    const x = ((c.x + t * 7 * c.s + 80) % 760) - 80;
    cloud(f, x, MAP.y + c.y, c.s, grey(120), HW.white);
  }
  DISTRICTS.forEach((dist, i) => {
    const k = span(t, 9.8 + i * 0.3, 10.4 + i * 0.3, outBack);
    if (k <= 0) return;
    f.rect(dist.x - 3, MAP.y + dist.y - 3, 6, 6, HW.white);
    const name = d.t(dist.name);
    f.text(dist.x + 9, MAP.y + dist.y - 7, name, 0);
    f.text(dist.x + 8, MAP.y + dist.y - 8, name, HW.white);
    const temp = `${dist.temp}°`, y = MAP.y + dist.y + 10 - (1 - k) * 16;
    f.text(dist.x + 10, y + 2, temp, 0, 2);
    f.text(dist.x + 8, y, temp, HW.yellow, 2);
  });
  header(f, d, HW.yellow, 0, { en: 'THE CITY', zh: '全市天气' }, 1);
}

/** The avenue in the rain, and the three cards rising over it. */
function avenue(f: Frame, d: Display, t: number, wet: Picture): void {
  pushIn(f, water(wet, t, 0.62, 0.7), span(t, 15.5, 22, smooth), { x: 0.02, y: 0.05, w: 0.9, h: 0.9 }, { x: 0.08, y: 0.08, w: 0.86, h: 0.86 });
  rain(f, t);
  header(f, d, HW.yellow, 0, { en: 'THE NEXT DAY', zh: '未来天气' }, 1);
  CARDS.forEach((c, i) => {
    const k = span(t, 16.2 + i * 0.16, 16.8 + i * 0.16, outBack) - span(t, 21.4, 21.9, smooth);
    if (k <= 0) return;
    const x = 40 + i * 196, y = 400 - k * 268;
    f.rect(x + 6, y + 6, 172, 160, 0);
    f.rect(x, y, 172, 160, HW.white);
    f.rect(x + 4, y + 4, 164, 30, HW.blue);
    f.centred(x + 86, y + 11, d.t(c.when), HW.white, 1, 2);
    f.sprite(c.icon, x + 86 - c.icon[0].length * 5, y + 44, 10, { '#': c.colour });
    f.centred(x + 86, y + 108, c.temp, HW.blue, 2);
    f.centred(x + 86, y + 138, d.t(c.says), 0);
  });
}

/** The harbour at dawn: the sea, for the boats. */
function harbour(f: Frame, d: Display, t: number, sea: Picture): void {
  pushIn(f, water(sea, t, 0.5, 0.9), span(t, 22, 27, smooth), { x: 0, y: 0.04, w: 0.92, h: 0.92 }, { x: 0.06, y: 0.06, w: 0.88, h: 0.88 });
  gulls(f, t);
  header(f, d, HW.yellow, 0, { en: 'AT SEA', zh: '海上天气' }, 1);
  band(f, d, { en: 'HARBOUR', zh: '港口' }, SEA.map(s => d.t(s)), span(t, 22.4, 23, outCubic));
}

/** The advisory: the rooftops gone dark, and the camera closing in on the one window still lit. */
function advisory(f: Frame, d: Display, t: number, roof: Picture): void {
  const k = span(t, 27.4, 33, smooth), dark = span(t, 27, 29.5, smooth);
  const from = { x: 0.1, y: 0.1, w: 0.84, h: 0.84 };
  const to = { x: WINDOW.x - 0.15, y: WINDOW.y - 0.16, w: 0.32, h: 0.32 };
  const src = lerpBox(from, to, k);
  f.picture(roof, { x: 0, y: 0, w: 640, h: 400 }, { x: src.x * roof.width, y: src.y * roof.height, w: src.w * roof.width, h: src.h * roof.height }, 1 - dark * 0.86);
  // The window keeps its light, now and then catching.
  const a = onScreen(src, WINDOW.x, WINDOW.y), b = onScreen(src, WINDOW.x + WINDOW.w, WINDOW.y + WINDOW.h);
  const lit = Math.floor(t * 1.3) % 6 !== 0;
  f.picture(roof, { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y },
    { x: WINDOW.x * roof.width, y: WINDOW.y * roof.height, w: WINDOW.w * roof.width, h: WINDOW.h * roof.height }, lit ? 1.15 : 0.5);
  header(f, d, HW.red, HW.white, { en: 'ADVISORY', zh: '气象提示' }, span(t, 27, 27.4, outCubic));
  if (t > 28) {
    const i = Math.min(ADVISORY.length - 1, Math.floor((t - 28) / 2.6));
    f.rect(0, 336, 640, 40, 0);
    f.centred(320, 340, d.t(ADVISORY[i]), HW.white, 2);
  }
}

export function weather(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  const t = time % LOOP;
  const roof = plate(d, `${DIR}/roof.jpg`), wet = plate(d, `${DIR}/avenue.jpg`), sea = plate(d, `${DIR}/harbour.jpg`);
  f.clear(0);
  if (t < 2.6) title(f, d, t);
  else if (t < 9.6) { if (roof) rooftops(f, d, t, roof); }
  else if (t < 15.5) forecastMap(f, d, t);
  else if (t < 22) { if (wet) avenue(f, d, t, wet); }
  else if (t < 27) { if (sea) harbour(f, d, t, sea); }
  else if (roof) advisory(f, d, t, roof);
  f.speckle(time, 0.02);
  d.present();
}
