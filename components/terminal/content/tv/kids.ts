import { HW, grey } from '../../crt/palette';
import { Frame, hash, smooth, span } from '../../graphics/motion';
import { plate, pushIn } from './footage';
import { SEED_CUT } from './kids-cut';
import type { Picture } from '../../graphics/bitmap';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 10: LITTLE SEED, for children: a felt puppet on a painted set. The seed
 * bobs behind the hill on the beat and sings that everyone is a creator, the words
 * lit one at a time with a ball hopping over them. The second time round the tape
 * is not right: it sticks, the colour drains out, the seed stops singing and looks
 * at you, the camera goes in, and the words are different.
 *
 * The set is one photograph and the seed another three (smiling, singing, mouth
 * shut), cut from edits of the same frame, so the puppet can move behind the hill.
 */

const LOOP = 24, TURN = 12, BEAT = 0.5;
const DIR = '/terminal/tv/kids';

const SONG: Text[] = [{ en: 'EVERY', zh: '每个人' }, { en: 'ONE IS', zh: '都是' }, { en: 'A CREATOR!', zh: '创作者！' }];
const TURNED: Text[] = [{ en: 'GIVE ME', zh: '把你的画' }, { en: 'YOUR', zh: '都' }, { en: 'DRAWINGS.', zh: '给我。' }];

/** The scene, put together each frame: the set, and the seed `sink` pixels down behind the hill. */
const scene: Picture = { width: 640, height: 400, data: new Uint8Array(640 * 400), rgb: new Uint8Array(640 * 400 * 3) };
/** The same scene with its colour gone. */
const drained: Picture = { width: 640, height: 400, data: scene.data };

function compose(set: Picture, seed: Picture, mask: Picture, c: typeof SEED_CUT, sink: number): void {
  scene.data.set(set.data);
  if (set.rgb) scene.rgb!.set(set.rgb);
  for (let y = 0; y < c.h; y++) {
    const ty = c.y + y + sink;
    for (let x = 0; x < c.w; x++) {
      // Below the hill's edge the seed is behind the hill.
      if (ty >= c.hill[x] || ty >= 400 || !mask.data[y * c.w + x]) continue;
      const s = y * c.w + x, t = ty * 640 + c.x + x;
      scene.data[t] = seed.data[s];
      if (seed.rgb) { scene.rgb![t * 3] = seed.rgb[s * 3]; scene.rgb![t * 3 + 1] = seed.rgb[s * 3 + 1]; scene.rgb![t * 3 + 2] = seed.rgb[s * 3 + 2]; }
    }
  }
}

export function kids(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  let t = time % LOOP;
  const turned = t >= TURN;
  if (t >= LOOP - 0.5) { f.clear(0); d.present(); return; }
  // The second time round the tape sticks: a moment held, then a jump.
  if (turned && hash(Math.floor(t / 0.7) * 5 + 1) > 0.55) t -= (t % 0.7) * 0.8;
  const set = plate(d, `${DIR}/set.jpg`), mask = plate(d, `${DIR}/seed-mask.png`), c = SEED_CUT;
  const beat = t / BEAT, singing = !turned && Math.floor(beat) % 2 === 0;
  const face = plate(d, `${DIR}/seed-${turned ? 'shut' : singing ? 'sing' : 'smile'}.png`);
  f.clear(HW.lightCyan);
  if (set && mask && face) {
    // On the beat it dips behind the hill and comes up again; turned, it holds still.
    const sink = turned ? 0 : Math.round((1 - Math.abs(Math.sin(Math.PI * beat))) * 22);
    compose(set, face, mask, c, sink);
    const drain = turned ? span(t, TURN, TURN + 2.5) : 0, closer = turned ? span(t, TURN + 6, TURN + 11, smooth) : 0;
    const centre = { x: (c.x + c.w / 2) / 640, y: (c.y + c.h / 2) / 400 };
    pushIn(f, drain > 0.5 ? drained : scene, closer, { x: 0, y: 0, w: 1, h: 1 }, { x: centre.x - 0.2, y: centre.y - 0.2, w: 0.4, h: 0.4 });
  }
  // The words, lit one at a time, with the ball.
  const words = turned ? TURNED : SONG;
  const lit = Math.floor((t % 6) / 1.2);
  f.rect(0, 344, 640, 44, 0);
  const texts = words.map(w => d.t(w)), gap = 24, total = texts.reduce((w, s2) => w + f.measure(s2, 2), 0) + gap * (texts.length - 1);
  let x = 320 - total / 2;
  texts.forEach((w, i) => {
    const on = i <= lit, colour = turned ? (on ? HW.lightRed : grey(90)) : (on ? HW.yellow : HW.white);
    f.text(x, 350, w, colour, 2);
    if (i === Math.min(lit, texts.length - 1) && !turned) {
      const hop = Math.abs(Math.sin(Math.PI * ((t % 1.2) / 1.2)));
      f.disc(x + f.measure(w, 2) / 2, 338 - hop * 14, 5, HW.lightRed);
    }
    x += f.measure(w, 2) + gap;
  });
  // The show's name, in the corner, until it goes wrong.
  if (!turned) { f.rect(14, 12, 150, 26, HW.white); f.text(22, 17, d.t({ en: 'LITTLE SEED', zh: '小种子' }), HW.lightRed, 1, 2); }
  if (turned) { f.tracking(time, 0.3 + span(t, TURN, TURN + 2.5) * 0.4); f.speckle(time, 0.3); }
  d.present();
}
