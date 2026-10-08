import { HW, grey } from '../../crt/palette';
import { Frame, hash, outCubic, outExpo, smooth, span } from '../../graphics/motion';
import { machineNow } from '../time';
import { bug, clock, plate, pushIn, veil, water, type Box } from './footage';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 11: the city's evening news, made as a small station made it. A title,
 * then the anchor at her desk reading each item, a picture over her shoulder, and
 * for the items they had a crew for, the footage. The pool, the bus, the washing:
 * nothing in it is wrong. The administrative items are read in the same voice.
 *
 * The anchor's frame is one photograph; she blinks and her mouth moves because two
 * small patches, cut from edits of that same frame, are laid over it in turn.
 */

const DIR = '/terminal/tv/news';
/** Where the patches sit on the anchor's frame (public/terminal/tv/news/patches.json). */
const MOUTH = { x: 184, y: 114, w: 34, h: 24 };
const EYES = { x: 176, y: 88, w: 52, h: 22 };

type Story = { headline: Text; footage?: { url: string; label: Text; from: Box; to: Box; water?: number } };

export const HEADLINES: Text[] = [
  { en: 'The community pool reopens Monday. Existing passes remain valid.', zh: '社区泳馆周一恢复开放，原有月卡继续有效。' },
  { en: 'Bus 4 returns to its usual route after road repairs.', zh: '道路维修结束，4 路公交恢复原线行驶。' },
  { en: 'Away from your account? Saved replies can keep conversations going.', zh: '账户服务提醒：离线期间，保存的回复可继续用于会话。' },
  { en: 'The Rooms open intake nine. Bring recent work to reception.', zh: '房间计划第九期开放登记，请携近期作品至接待处咨询。' },
  { en: 'Electronics market to close next month. Online shops will stay open.', zh: '旧电子市场下月闭市，各商户线上店铺照常营业。' },
  { en: 'Archive service: an earlier posting date will be kept when records merge.', zh: '档案服务说明：同名作品合并后，保留较早的发布日期。' },
  { en: 'Studio confirms scheduled posts will continue during donor leave.', zh: 'Studio 表示，供体休假期间，已排期作品将照常发布。' },
  { en: 'Tomorrow: overcast. Take washing in before the evening rain.', zh: '明日多云，傍晚有雨，请提前收好晾晒衣物。' },
];

const STORIES: Story[] = HEADLINES.map(headline => ({ headline }));
STORIES[0].footage = {
  url: `${DIR}/pool.jpg`, label: { en: 'NORTH DISTRICT POOL', zh: '北区游泳馆' },
  from: { x: 0.06, y: 0.08, w: 0.88, h: 0.88 }, to: { x: 0.1, y: 0.12, w: 0.8, h: 0.8 }, water: 0.55,
};
STORIES[1].footage = {
  url: `${DIR}/bus.jpg`, label: { en: 'ROUTE 4, ZHONGSHAN ROAD', zh: '中山路 4 路站' },
  from: { x: 0.18, y: 0.1, w: 0.8, h: 0.8 }, to: { x: 0.1, y: 0.08, w: 0.84, h: 0.84 },
};
STORIES[2].footage = {
  url: `${DIR}/replies.jpg`, label: { en: 'SERVICE NOTICE', zh: '服务提示' },
  from: { x: 0.12, y: 0.14, w: 0.8, h: 0.8 }, to: { x: 0.24, y: 0.3, w: 0.6, h: 0.6 },
};
STORIES[3].footage = {
  url: `${DIR}/rooms.jpg`, label: { en: 'THE ROOMS, RECEPTION', zh: '房间计划 · 接待处' },
  from: { x: 0.04, y: 0.06, w: 0.9, h: 0.9 }, to: { x: 0.14, y: 0.08, w: 0.8, h: 0.8 },
};
STORIES[4].footage = {
  url: `${DIR}/market.jpg`, label: { en: 'ELECTRONICS MARKET', zh: '旧电子市场' },
  from: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, to: { x: 0.18, y: 0.12, w: 0.7, h: 0.7 },
};
STORIES[5].footage = {
  url: `${DIR}/archive.jpg`, label: { en: 'CITY ARCHIVE', zh: '市档案馆' },
  from: { x: 0.06, y: 0.06, w: 0.88, h: 0.88 }, to: { x: 0.16, y: 0.1, w: 0.76, h: 0.76 },
};
STORIES[6].footage = {
  url: `${DIR}/studio.jpg`, label: { en: 'STUDIO HEADQUARTERS', zh: 'Studio 总部' },
  from: { x: 0.08, y: 0.06, w: 0.86, h: 0.86 }, to: { x: 0.12, y: 0.02, w: 0.8, h: 0.8 }, water: 0.82,
};
STORIES[7].footage = {
  url: `${DIR}/laundry.jpg`, label: { en: 'WEATHER', zh: '天气' },
  from: { x: 0.1, y: 0.16, w: 0.8, h: 0.8 }, to: { x: 0.1, y: 0.04, w: 0.8, h: 0.8 },
};

const TITLE = 4;
const ITEM = 7;
/** Seconds into an item when it cuts from the anchor to the footage. */
const CUT = 3.2;
export const NEWS_LOOP = TITLE + STORIES.length * ITEM;

const NAME: Text = { en: 'CITY NEWS', zh: '城市新闻' };

/** The opening: the city at dusk drifting under the station's blue, light sweeping across, and the name set on it. */
function title(f: Frame, d: Display, t: number): void {
  const city = plate(d, `${DIR}/anchor.jpg`);
  f.clear(HW.blue);
  // The skyline from behind the desk, dimmed, gliding sideways under a blue veil.
  if (city) pushIn(f, city, t / TITLE, { x: 0.36, y: 0.12, w: 0.5, h: 0.5 }, { x: 0.46, y: 0.14, w: 0.46, h: 0.46 });
  veil(f, { x: 0, y: 0, w: 640, h: 400 }, HW.blue, 0.5);
  // Streaks of light crossing, each with a fading tail.
  for (let k = 0; k < 5; k++) {
    const y = 70 + k * 64 + Math.sin(k * 1.7) * 18, run = span(t, 0.1 + k * 0.12, 1.6 + k * 0.12, outCubic);
    const head = -80 + run * 800;
    for (let tail = 0; tail < 6; tail++) f.rect(head - tail * 34, y, 30, 2, tail < 2 ? HW.white : HW.lightCyan);
  }
  const k = span(t, 1.2, 2.2, outExpo), name = d.t(NAME);
  if (k > 0) {
    const w = f.measure(name, 3, 8);
    f.text(320 - w / 2, 150, name, HW.white, 3, 8);
    f.rect(320 - (w / 2) * k, 206, w * k, 3, HW.yellow);
    f.centred(320, 222, d.t({ en: 'EVENING EDITION', zh: '晚间版' }), HW.lightCyan, 1, 4);
  }
  if (t > 3.6) f.rect(0, 0, 640, 400, HW.black);
}

/** The anchor at her desk, her mouth moving while she reads. */
function anchor(f: Frame, d: Display, t: number, story: Story, into: number): void {
  const base = plate(d, `${DIR}/anchor.jpg`), mouth = plate(d, `${DIR}/mouth.png`), eyes = plate(d, `${DIR}/eyes.png`);
  if (!base) { f.clear(HW.blue); return; }
  f.picture(base, { x: 0, y: 0, w: 640, h: 400 });
  // Reading: the mouth opens and closes on syllables, never quite regularly.
  const syllable = Math.floor(t * 7);
  if (mouth && into > 0.4 && into < CUT + 2.6 && hash(syllable) > 0.45) f.picture(mouth, MOUTH);
  // A blink every few seconds.
  if (eyes && (t % 3.7) < 0.14) f.picture(eyes, EYES);
  // The station's name on the front of the desk.
  f.centred(305, 364, d.t(NAME), HW.white, 1, 6);
  // Over her shoulder: the item's picture, or the station's card.
  const box = { x: 404, y: 52, w: 196, h: 124 }, k = span(into, 0.15, 0.6, outExpo);
  if (k > 0) {
    const shown = { x: box.x + box.w * (1 - k), y: box.y, w: box.w * k, h: box.h };
    const shot = story.footage && plate(d, story.footage.url);
    if (shot) f.picture(shot, shown, { x: shot.width * 0.1, y: shot.height * 0.1, w: shot.width * 0.8, h: shot.height * 0.8 });
    else {
      f.rect(shown.x, shown.y, shown.w, shown.h, HW.blue);
      veil(f, shown, HW.lightBlue, 0.25);
      if (k > 0.95) f.centred(box.x + box.w / 2, box.y + 54, d.t(NAME), HW.white, 1, 2);
    }
    f.box(shown.x, shown.y, shown.w, shown.h, HW.white, 2);
  }
  lowerThird(f, d, story.headline, into);
}

/** The headline band, wiped on from the left. */
function lowerThird(f: Frame, d: Display, text: Text, into: number): void {
  const wipe = span(into, 0.3, 0.8, outExpo);
  if (wipe <= 0) return;
  f.rect(0, 300, 640 * wipe, 42, HW.white);
  f.rect(0, 300, 92 * Math.min(1, wipe * 3), 42, HW.red);
  if (wipe < 0.95) return;
  f.text(14, 313, d.t({ en: 'NEWS', zh: '新闻' }), HW.white, 1, 3);
  const lines = f.wrap(d.t(text), 1, 524);
  lines.slice(0, 2).forEach((line, i) => f.text(104, (lines.length > 1 ? 304 : 313) + i * 17, line, HW.black));
}

/** An item's footage, pushed in on, with where it was filmed. */
function footage(f: Frame, d: Display, t: number, story: Story, into: number): void {
  const shot = story.footage!, p = plate(d, shot.url);
  if (!p) { f.clear(0); return; }
  const k = smooth((into - CUT) / (ITEM - CUT));
  pushIn(f, shot.water ? water(p, t, shot.water) : p, k, shot.from, shot.to);
  const tag = d.t(shot.label), w = f.measure(tag) + 20;
  veil(f, { x: 0, y: 300, w: w + 14, h: 26 }, HW.black, 0.5);
  f.rect(0, 300, 6, 26, HW.yellow);
  f.text(16, 305, tag, HW.white);
}

export function news(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  const t = time % NEWS_LOOP;
  if (t < TITLE) {
    title(f, d, t);
  } else {
    const at = t - TITLE, story = STORIES[Math.floor(at / ITEM)], into = at % ITEM;
    if (story.footage && into >= CUT) footage(f, d, t, story, into);
    else anchor(f, d, t, story, into);
    bug(f, d.t({ en: 'CH 11', zh: '11 频道' }));
    clock(f, machineNow(), d.t({ en: 'LIVE', zh: '直播' }));
    // The ticker: every item, round and round.
    f.rect(0, 380, 640, 20, grey(20));
    f.crawl(382, HEADLINES.map(h => d.t(h)).join('   ///   '), HW.yellow, time * 60);
  }
  f.speckle(time, 0.01);
  d.present();
}
