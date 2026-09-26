import { HW, grey } from '../../crt/palette';
import { Frame, hash, span, smooth } from '../../graphics/motion';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 10: LITTLE SEED, for children. The seed bounces on the beat and sings that
 * everyone is a creator, the words lit one at a time with a ball hopping over them.
 * The second time round the tape is not right: it sticks, the colour drains out, the
 * seed stops and looks at you, and the words are different.
 */

const LOOP = 24, TURN = 12, BEAT = 0.5;

const SONG: Text[] = [{ en: 'EVERY', zh: '每个人' }, { en: 'ONE IS', zh: '都是' }, { en: 'A CREATOR!', zh: '创作者！' }];
const TURNED: Text[] = [{ en: 'GIVE ME', zh: '把你的画' }, { en: 'YOUR', zh: '都' }, { en: 'DRAWINGS.', zh: '给我。' }];

type Look = { body: number; light: number; leaf: number; cheek: number; eye: number; pupil: number };
const COLOUR: Look = { body: HW.brown, light: HW.yellow, leaf: HW.lightGreen, cheek: HW.lightRed, eye: HW.white, pupil: 0 };
const GREY_LOOK: Look = { body: grey(70), light: grey(140), leaf: grey(120), cheek: grey(90), eye: grey(210), pupil: 0 };

/** The seed: a round body, a sprout with two leaves, and a face. */
function seed(f: Frame, cx: number, cy: number, s: number, look: Look, face: { stare: number; singing: boolean; squash: number }): void {
  const w = 70 * s * (1 + face.squash * 0.12), h = 84 * s * (1 - face.squash * 0.12);
  // The sprout.
  f.rect(cx - 2 * s, cy - h - 28 * s, 4 * s, 30 * s, look.leaf);
  f.disc(cx - 16 * s, cy - h - 26 * s, 14 * s, look.leaf, 7 * s);
  f.disc(cx + 16 * s, cy - h - 30 * s, 14 * s, look.leaf, 7 * s);
  f.disc(cx, cy - h / 2 - 12 * s, w / 2 + 4 * s, 0, h / 2 + 4 * s);
  f.disc(cx, cy - h / 2 - 12 * s, w / 2, look.body, h / 2);
  f.disc(cx - 22 * s, cy - h * 0.86 - 12 * s, 5 * s, look.light, 8 * s);
  // The face: eyes that grow and hold still when it stares.
  const ey = cy - h * 0.55 - 12 * s, r = (11 + face.stare * 7) * s, pr = (5 + face.stare * 5) * s;
  for (const side of [-1, 1]) {
    f.disc(cx + side * 17 * s, ey, r, look.eye, r * 1.2);
    f.disc(cx + side * 17 * s + (1 - face.stare) * 3 * s, ey + (1 - face.stare) * 2 * s, pr, look.pupil, pr * 1.2);
    if (face.stare < 0.5) f.disc(cx + side * 17 * s + 3 * s, ey - 4 * s, 2 * s, look.eye);
    f.disc(cx + side * 30 * s, ey + 18 * s, 6 * s, look.cheek, 4 * s);
  }
  const my = ey + 26 * s;
  if (face.stare > 0.5) f.rect(cx - 10 * s, my, 20 * s, 2 * s, 0);
  else if (face.singing) f.disc(cx, my + 2 * s, 9 * s, 0, 7 * s);
  else for (let i = -8; i <= 8; i++) f.rect(cx + i * s, my + (1 - (i / 8) ** 2) * 5 * s, 2 * s, 2 * s, 0);
}

export function kids(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  let t = time % LOOP;
  const turned = t >= TURN;
  if (t >= LOOP - 0.5) { f.clear(0); d.present(); return; }
  // The second time round the tape sticks: a moment held, then a jump.
  if (turned && hash(Math.floor(t / 0.7) * 5 + 1) > 0.55) t -= (t % 0.7) * 0.8;
  const drain = turned ? span(t, TURN, TURN + 2.5) : 0, look = drain > 0.5 ? GREY_LOOK : COLOUR;
  const c = (v: number, g: number) => (drain > 0.5 ? grey(g) : v);
  // The set: sky, sun, hills, a chequered floor.
  f.clear(c(HW.lightCyan, 150));
  f.dither(0, 150, 640, 110, 0.5, c(HW.white, 190), c(HW.lightCyan, 150));
  const sun = { x: 540, y: 70 };
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + (turned ? 0 : t * 0.6);
    f.line(sun.x + Math.cos(a) * 44, sun.y + Math.sin(a) * 44, sun.x + Math.cos(a) * 62, sun.y + Math.sin(a) * 62, c(HW.yellow, 200), 4);
  }
  f.disc(sun.x, sun.y, 36, c(HW.yellow, 210));
  f.disc(140, 330, 220, c(HW.green, 90), 120);
  f.disc(520, 340, 260, c(HW.lightGreen, 120), 110);
  for (let y = 300; y < 400; y += 20) for (let x = 0; x < 640; x += 20) f.rect(x, y, 20, 20, ((x + y) / 20) & 1 ? c(HW.lightMagenta, 110) : c(HW.white, 220));
  // The seed, on the beat; or still, and closer, staring.
  const beat = t / BEAT, bounce = turned ? 0 : Math.abs(Math.sin(Math.PI * beat)), squash = turned ? 0 : Math.max(0, 1 - bounce * 4);
  const stare = turned ? span(t, TURN + 3, TURN + 5) : 0, closer = turned ? span(t, TURN + 8, TURN + 11, smooth) : 0;
  const s = 1.2 + closer * 2.2;
  seed(f, 320, 300 - bounce * 36 + closer * 240, s, look, { stare, singing: !turned && Math.floor(beat) % 2 === 0, squash });
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
  if (turned) { f.tracking(time, 0.3 + drain * 0.4); f.speckle(time, 0.3); }
  d.present();
}
