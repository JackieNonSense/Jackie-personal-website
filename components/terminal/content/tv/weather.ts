import { HW, grey } from '../../crt/palette';
import { Frame, outBack, outCubic, smooth, span } from '../../graphics/motion';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 3: tonight's weather, the way the local station did it with a character
 * generator and a map drawn once by hand. The title; the city on its bay with the
 * clouds going over and the numbers on it; three cards for the night, the morning
 * and tomorrow. Then an advisory nobody asked for: the map goes dark and closes in
 * on one street, one building, one window still lit.
 */

const LOOP = 27;
const MAP = { x: 0, y: 34, w: 640, h: 330 };

type District = { x: number; y: number; name: Text; temp: number };
const DISTRICTS: District[] = [
  { x: 150, y: 110, name: { en: 'OLD TOWN', zh: '旧城' }, temp: 19 },
  { x: 300, y: 172, name: { en: 'MARKET', zh: '电子市场' }, temp: 20 },
  { x: 118, y: 250, name: { en: 'YOUR STREET', zh: '你住的街' }, temp: 18 },
  { x: 402, y: 96, name: { en: 'THE ROOMS', zh: '房间' }, temp: 23 },
];
const HOME = DISTRICTS[2];

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

function header(f: Frame, d: Display, colour: number, ink: number, title: Text, reveal: number): void {
  f.rect(0, 0, 640 * reveal, 34, colour);
  if (reveal > 0.6) {
    f.text(16, 1, d.t(title), ink, 2);
    f.text(520, 9, d.t({ en: 'CH 3', zh: '3 频道' }), ink);
  }
}

export function weather(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  const t = time % LOOP;
  f.clear(0);
  // ── The title ──
  if (t < 2.6) {
    f.clear(HW.blue);
    for (let k = 0; k < 5; k++) {
      const w = span(t, 0.1 + k * 0.08, 0.7 + k * 0.08, outCubic) * 640;
      f.rect(0, 150 + k * 14, w, 8, [HW.yellow, HW.lightRed, HW.lightMagenta, HW.lightCyan, HW.lightGreen][k]);
    }
    const up = span(t, 0.6, 1.2, outBack);
    f.centred(320, 90 + (1 - up) * 40, d.t({ en: 'TONIGHT', zh: '今夜天气' }), HW.white, 3, 2);
    if (t > 1.1) f.centred(320, 240, d.t({ en: 'THE WEATHER, WITH NOBODY', zh: '天气预报 · 无人主持' }), HW.yellow, 1, 2);
    d.present();
    return;
  }
  // ── The map ──
  const advisory = t >= 19, zoomT = span(t, 19.2, 23.5, smooth);
  const night = advisory ? 1 : 0;
  const zoom = 1 + zoomT * 5;
  const focus = { x: 320 + (HOME.x + 14 - 320) * zoomT, y: 200 + (HOME.y - 6 - 200) * zoomT };
  drawMap(f, zoom, focus, { x: 320, y: 200 }, night);
  const toScreen = (x: number, y: number) => ({ x: 320 + (x - focus.x) * zoom, y: 200 + (y - focus.y) * zoom });
  if (!advisory) {
    // Clouds, drifting east; their shadows a little below.
    for (const c of CLOUDS) {
      const x = ((c.x + t * 7 * c.s + 80) % 760) - 80;
      cloud(f, x, MAP.y + c.y, c.s, grey(120), HW.white);
    }
    // The districts and their numbers, one after another.
    DISTRICTS.forEach((dist, i) => {
      const k = span(t, 3 + i * 0.35, 3.6 + i * 0.35, outBack);
      if (k <= 0) return;
      f.rect(dist.x - 3, MAP.y + dist.y - 3, 6, 6, HW.white);
      const name = d.t(dist.name);
      f.text(dist.x + 9, MAP.y + dist.y - 7, name, 0);
      f.text(dist.x + 8, MAP.y + dist.y - 8, name, HW.white);
      const temp = `${dist.temp}°`, y = MAP.y + dist.y + 10 - (1 - k) * 16;
      f.text(dist.x + 10, y + 2, temp, 0, 2);
      f.text(dist.x + 8, y, temp, HW.yellow, 2);
    });
    header(f, d, HW.yellow, 0, { en: "TONIGHT'S WEATHER", zh: '今夜天气' }, span(t, 2.6, 3.2, outCubic));
    // ── The cards ──
    if (t > 13) {
      CARDS.forEach((c, i) => {
        const k = span(t, 13.1 + i * 0.16, 13.7 + i * 0.16, outBack) - span(t, 18.4, 18.9, smooth);
        const x = 40 + i * 196, y = 400 - k * 290;
        f.rect(x + 6, y + 6, 172, 176, 0);
        f.rect(x, y, 172, 176, HW.white);
        f.rect(x + 4, y + 4, 164, 30, HW.blue);
        f.centred(x + 86, y + 11, d.t(c.when), HW.white, 1, 2);
        f.sprite(c.icon, x + 86 - c.icon[0].length * 5, y + 48, 10, { '#': c.colour });
        f.centred(x + 86, y + 116, c.temp, HW.blue, 2);
        f.centred(x + 86, y + 150, d.t(c.says), 0);
      });
    }
  } else {
    // ── The advisory: one building on your street, one window lit ──
    const home = toScreen(HOME.x + 8, HOME.y - 16);
    const s = zoom * 0.9;
    f.rect(home.x, home.y, 22 * s, 30 * s, grey(40));
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      const lit = r === 3 && c === 1;
      const on = lit ? (Math.floor(t * 1.3) % 5 !== 0) : false;
      f.rect(home.x + (2 + c * 7) * s, home.y + (3 + r * 5.4) * s, 4 * s, 3 * s, on ? HW.yellow : grey(18));
    }
    header(f, d, HW.red, HW.white, { en: 'ADVISORY', zh: '气象提示' }, span(t, 19, 19.4, outCubic));
    const i = Math.min(ADVISORY.length - 1, Math.floor((t - 19.6) / 2.4));
    if (t > 19.6) {
      f.rect(0, 318, 640, 40, 0);
      f.centred(320, 322, d.t(ADVISORY[i]), HW.white, 2);
    }
  }
  f.speckle(time, 0.12);
  d.present();
}
