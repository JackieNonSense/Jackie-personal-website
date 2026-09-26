import { ATTR } from '../crt/grid';
import { H, W, blit } from '../graphics/bitmap';
import { Frame } from '../graphics/motion';
import { strWidth, text, wrap } from '../system/screen';
import { CITY_PICTURE, generation } from './tv/copies';
import { testCard } from './tv/testcard';
import { weather } from './tv/weather';
import { ads } from './tv/ads';
import { alert, alertHiss } from './tv/alert';
import { kids } from './tv/kids';
import { news } from './tv/news';
import { cctv } from './tv/cctv';
import { feed } from './tv/feed';
import { videoChannel } from './tv/video';
import type { Text } from '../system/i18n';
import type { Channel } from '../system/apps/tv';

export { CITY_PICTURE };

/*
 * What the generated world broadcasts, channel by channel (the programmes are in
 * content/tv/). Channels 4, 5, 7 and 9 show one picture as a copy of a copy, each
 * several generations further gone, the tape worse each time: a city Jackie drew in
 * his first year at university.
 */

function pictureChannel(number: number, name: Text, generations: number, note?: { when: string; text: Text }): Channel {
  return {
    number, name,
    draw(d, time) {
      const f = new Frame(d.graphics(), d.glyphs);
      f.clear(0);
      const pic = generation(d, CITY_PICTURE, generations);
      if (pic) {
        // A slow drift, as if the picture were never quite held still.
        const y = Math.floor((H - pic.height) / 2 + Math.sin(time * 0.4) * 2);
        blit(f.b, pic, Math.floor((W - pic.width) / 2), y);
      }
      // Each copy was made from a worse tape.
      const wear = generations / 14;
      f.tracking(time, wear * 0.7);
      f.speckle(time, wear * 0.5);
      d.present();
      // Jackie's note, on a strip of tape at the bottom of the set.
      if (note && d.has(note.when)) {
        const lines = wrap(d.t(note.text), d.cols - 4);
        lines.forEach((line, i) => text(d.grid, Math.max(1, d.cols - strWidth(line) - 2), d.rows - 2 - lines.length + i, line, ATTR.inverse));
      }
    },
  };
}

export const CHANNELS: Channel[] = [
  { number: 2, name: { en: 'LINE-UP', zh: '测试卡' }, draw: testCard },
  { number: 3, name: { en: 'WEATHER', zh: '天气' }, draw: weather },
  pictureChannel(4, { en: 'CITY / ORIGINAL', zh: '城市 / 原图' }, 0),
  pictureChannel(5, { en: 'CITY / COPY', zh: '城市 / 复制' }, 2),
  { number: 6, name: { en: 'ADS', zh: '广告' }, draw: ads },
  pictureChannel(7, { en: 'CITY / COPY OF COPY', zh: '城市 / 复制的复制' }, 6, {
    when: 'file:DIARY/0004.TXT',
    text: { en: 'JR: I drew this. First year. By 9 you cannot tell.', zh: 'JR：这是我大一画的。到第 9 台就认不出来了。' },
  }),
  // Channel 8 has no name on the set: it looks like nothing is there.
  { number: 8, name: { en: '', zh: '' }, draw: alert, hiss: alertHiss },
  pictureChannel(9, { en: 'CITY', zh: '城市' }, 14),
  { number: 10, name: { en: 'LITTLE SEED', zh: '小种子' }, draw: kids },
  { number: 11, name: { en: 'NEWS', zh: '新闻' }, draw: news },
  { number: 12, name: { en: 'ROOMS LIVE', zh: '房间直播' }, draw: cctv },
  { number: 13, name: { en: 'FEED', zh: '推荐' }, draw: feed },
  // A real tape: Caramelldansen, the Japanese version of 2008, played round and round.
  { number: 14, name: { en: 'MUSIC', zh: '音乐' }, draw: videoChannel('/terminal/tv/caramelldansen.mp4') },
];
