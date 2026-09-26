import { HW, grey } from '../../crt/palette';
import { Frame, hash, outExpo, span } from '../../graphics/motion';
import { machineNow } from '../time';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 11: the news, with everything a newsroom had: the globe turning behind,
 * the anchor at the desk, the red LIVE box and the clock, the headline strip and the
 * ticker. The anchor has no face. Where the face would be is a patch of dither that
 * is made again every few seconds, never the same twice.
 */

export const HEADLINES: Text[] = [
  { en: 'New content online today: 4.1 billion items, 0.003% of them made by people.', zh: '今日全网新增内容 41 亿条，其中人类原创占 0.003%。' },
  { en: 'Studio unveils its new style model: "more like an artist than the artist."', zh: 'Studio 发布新一代画风模型，称「比画师更像画师」。' },
  { en: 'The Rooms open their ninth intake; applications at a record high.', zh: '房间计划第九期招募开启，报名人数创历史新高。' },
  { en: 'Experts: "model collapse" is a myth.', zh: '专家：「模型崩溃」是伪命题。' },
  { en: 'The old electronics market will be demolished next month.', zh: '旧电子市场将于下月拆除。' },
  { en: 'The SEED programme thanks its donors.', zh: '种子计划向所有供体致谢。' },
  { en: 'Our anchor tonight is generated. We thank the donor.', zh: '本台今晚的主播为生成影像。感谢供体。' },
  { en: 'Weather: overcast. Good conditions for creating.', zh: '天气：多云。适宜创作。' },
];

const pad = (n: number) => String(n).padStart(2, '0');

function globe(f: Frame, cx: number, cy: number, r: number, turn: number): void {
  f.disc(cx, cy, r, HW.blue);
  const line = HW.lightCyan;
  for (let a = 0; a < 360; a += 2) {
    const x = cx + Math.cos((a * Math.PI) / 180) * r, y = cy + Math.sin((a * Math.PI) / 180) * r;
    f.rect(x - 1, y - 1, 2, 2, line);
  }
  // Meridians, turning; parallels, still.
  for (let k = 0; k < 6; k++) {
    const phase = ((k / 6) * Math.PI + turn) % Math.PI, w = Math.cos(phase) * r;
    for (let a = -90; a <= 90; a += 3) {
      const y = cy + Math.sin((a * Math.PI) / 180) * r, x = cx + Math.cos((a * Math.PI) / 180) * w;
      f.rect(x, y, 1, 2, line);
    }
  }
  for (const lat of [-60, -30, 0, 30, 60]) {
    const y = cy + Math.sin((lat * Math.PI) / 180) * r, half = Math.cos((lat * Math.PI) / 180) * r;
    for (let x = cx - half; x < cx + half; x += 3) f.rect(x, y, 2, 1, line);
  }
}

/** The face that is not there: grey blocks, rolled again every few seconds. */
function face(f: Frame, cx: number, cy: number, roll: number): void {
  for (let y = -38; y < 38; y += 4) for (let x = -30; x < 30; x += 4) {
    if ((x / 30) ** 2 + (y / 38) ** 2 > 1) continue;
    const v = hash(roll * 997 + (x + 40) * 131 + (y + 40) * 7);
    f.rect(cx + x, cy + y, 4, 4, grey(60 + v * 150));
  }
}

export function news(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  const t = time;
  // The studio.
  f.clear(HW.blue);
  for (let y = 0; y < 260; y += 26) f.dither(0, y, 640, 26, 0.5 - y / 600, HW.lightBlue, null);
  globe(f, 170, 150, 110, t * 0.25);
  // The anchor: shoulders, a white collar, a red tie, and the face.
  const ax = 430, ay = 150;
  f.disc(ax, ay + 150, 110, HW.darkGrey, 80);
  f.rect(ax - 110, ay + 150, 220, 120, HW.darkGrey);
  f.disc(ax, ay + 88, 20, HW.white, 16);
  f.rect(ax - 5, ay + 96, 10, 50, HW.red);
  f.disc(ax, ay + 2, 36, 0, 44);
  const roll = Math.floor(t / 3);
  face(f, ax, ay + 8, roll);
  // As the face is made again, the picture breaks up where it is.
  if (t % 3 < 0.15) f.snow(t, 1, { x: ax - 40, y: ay - 40, w: 80, h: 100 });
  // The desk.
  f.rect(0, 300, 640, 70, grey(40));
  f.rect(0, 300, 640, 4, grey(120));
  // LIVE, and the clock.
  const now = machineNow();
  f.rect(468, 18, 58, 26, HW.red);
  f.text(478, 23, d.t({ en: 'LIVE', zh: '直播' }), HW.white);
  f.rect(526, 18, 96, 26, HW.white);
  f.text(538, 23, `${pad(now.getHours())}:${pad(now.getMinutes())}`, 0);
  // The headline strip: each one wiped on from the left.
  const i = Math.floor(t / 6) % HEADLINES.length, wipe = span(t % 6, 0, 0.5, outExpo);
  f.rect(0, 262, 640 * wipe, 38, HW.white);
  f.rect(0, 262, 96, 38, HW.red);
  f.text(12, 271, d.t({ en: 'NEWS', zh: '新闻' }), HW.white, 1, 3);
  if (wipe > 0.95) {
    const lines = f.wrap(d.t(HEADLINES[i]), 1, 520);
    lines.slice(0, 2).forEach((line, k) => f.text(108, (lines.length > 1 ? 264 : 273) + k * 17, line, 0));
  }
  // The ticker.
  f.rect(0, 370, 640, 24, 0);
  const all = HEADLINES.map(h => d.t(h)).join('   ///   ');
  f.crawl(374, all, HW.yellow, t * 70);
  f.speckle(t, 0.06);
  d.present();
}
