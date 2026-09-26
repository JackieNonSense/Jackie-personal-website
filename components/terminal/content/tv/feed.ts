import { HW, grey } from '../../crt/palette';
import { Frame } from '../../graphics/motion';
import { CITY_PICTURE, generation } from './copies';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 13: the feed, for you. Works "in the style of JR" come up the screen in
 * three columns faster than anyone could look at them, each one another copy of the
 * same city he drew in his first year, each with its likes going up.
 */

const TITLES: Text[] = [
  { en: 'Lighthouse', zh: '灯塔' }, { en: 'Rooftop, night', zh: '天台，夜' }, { en: 'Girl on a water tower', zh: '水塔上的女孩' },
  { en: 'Fall', zh: '坠落' }, { en: 'A city, first year', zh: '城市，大一' }, { en: 'Hands', zh: '手' },
];
const GENS = [1, 3, 5, 8, 11];
const CARD = { w: 196, h: 164, gap: 12 };

const count = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

export function feed(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  f.clear(grey(28));
  const speed = 46, left = (640 - 3 * CARD.w - 2 * CARD.gap) / 2, pitch = CARD.h + CARD.gap;
  for (let col = 0; col < 3; col++) {
    // Each column at its own pace, so they never line up.
    const run = time * speed * (1 + col * 0.18) + col * 70, first = Math.floor(run / pitch);
    for (let k = -1; k < 4; k++) {
      const n = first + k, y = 40 + k * pitch - (run % pitch), x = left + col * (CARD.w + CARD.gap);
      if (y > 400 || y + CARD.h < 34) continue;
      const id = n * 3 + col;
      f.rect(x, y, CARD.w, CARD.h, HW.white);
      const p = generation(d, CITY_PICTURE, GENS[((id % GENS.length) + GENS.length) % GENS.length]);
      if (p) f.picture(p, { x: x + 4, y: y + 4, w: CARD.w - 8, h: 110 }, { x: (id * 37) % 80, y: 0, w: p.width - 80, h: p.height }, 1, 10);
      const title = d.t(TITLES[((id * 7) % TITLES.length + TITLES.length) % TITLES.length]);
      f.text(x + 6, y + 118, title, 0);
      f.text(x + 6, y + 138, `#${40211 + id}`, grey(110));
      const likes = `♥ ${count(Math.floor(1200 + ((id * 7919) % 90000) + time * 37 * (1 + (id % 5))))}`;
      f.text(x + CARD.w - 6 - f.measure(likes), y + 138, likes, HW.lightRed);
    }
  }
  // The header stays put.
  f.rect(0, 0, 640, 34, HW.lightRed);
  f.text(16, 9, d.t({ en: 'FOR YOU', zh: '推荐 · 为你' }), HW.white, 1, 2);
  f.text(160, 9, d.t({ en: 'in the style of JR', zh: 'JR 风格' }), HW.white);
  f.text(440, 9, d.t({ en: 'new: 41,208/s', zh: '新作品 41,208/秒' }), HW.white);
  d.present();
}
