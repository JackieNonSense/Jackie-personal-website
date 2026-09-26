import { HW, grey } from '../../crt/palette';
import { Frame, hash, outBack, outCubic, outExpo, picture, smooth, span } from '../../graphics/motion';
import { PHOTOS } from '../photos';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 6: the advertising break is one advertisement, for the Rooms. Big friendly
 * type on white; the corridor, pushed in on slowly; the benefits slammed up one at a
 * time on colour; the door and a number to call. Then, for a few frames, something
 * the advertisement did not mean to say.
 */

const LOOP = 21;

const WORDS: Text[] = [{ en: 'BE', zh: '做' }, { en: 'YOURSELF.', zh: '你自己。' }];
const BENEFITS: { says: Text; bg: number; ink: number }[] = [
  { says: { en: 'BED & BOARD', zh: '包食宿' }, bg: HW.yellow, ink: HW.blue },
  { says: { en: 'HIGH PAY', zh: '高收入' }, bg: HW.blue, ink: HW.yellow },
  { says: { en: 'NO EXPERIENCE', zh: '无需经验' }, bg: HW.lightRed, ink: HW.white },
];

/** The Rooms' mark: a door left ajar, light behind it. */
function door(f: Frame, cx: number, y: number, open: number): void {
  f.rect(cx - 34, y, 68, 100, HW.white);
  f.rect(cx - 28, y + 6, 56, 94, 0);
  const gap = 4 + open * 16;
  f.rect(cx - 28, y + 6, gap, 94, HW.yellow);
  f.rect(cx - 28 + gap, y + 6, 56 - gap, 94, grey(70));
  f.rect(cx + 18, y + 52, 4, 4, HW.white);
}

export function ads(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  const t = time % LOOP;
  if (t < 3.4) {
    // ── Be yourself ──
    f.clear(HW.white);
    let y = 110;
    WORDS.forEach((w, i) => {
      const k = span(t, 0.2 + i * 0.4, 0.75 + i * 0.4, outBack);
      if (k <= 0) return;
      f.centred(320, y - (1 - k) * 80, d.t(w), 0, 5, 2);
      y += 90;
    });
    if (t > 2.2) f.centred(320, 300, d.t({ en: '...and get paid for it.', zh: '……还有钱拿。' }), HW.blue, 2);
  } else if (t < 9.6) {
    // ── The corridor ──
    f.clear(0);
    const p = picture(u => d.loadPicture(u), PHOTOS.rooms.url);
    const u = span(t, 3.4, 9.6, x => x);
    if (p) {
      // Pushed in toward the far end of the corridor, where the lights meet.
      const z = 1 - 0.32 * u, cx = 0.46, cy = 0.36;
      const src = { x: p.width * (1 - z) * cx, y: p.height * (1 - z) * cy, w: p.width * z, h: p.height * z };
      f.picture(p, { x: 0, y: 0, w: 640, h: 400 }, src, 1.05, 18);
    }
    // The lower third.
    const k = span(t, 4.2, 4.8, outExpo);
    f.rect(-400 + k * 400, 300, 430, 58, HW.blue);
    f.rect(-400 + k * 400, 300, 430, 4, HW.yellow);
    if (k > 0.9) {
      f.text(18, 310, d.t({ en: 'THE ROOMS', zh: '房间计划' }), HW.white, 2, 2);
      f.text(18 + f.measure(d.t({ en: 'THE ROOMS', zh: '房间计划' }), 2, 2) + 16, 318, d.t({ en: 'INTAKE 9 NOW OPEN', zh: '第九期招募中' }), HW.yellow);
    }
  } else if (t < 15) {
    // ── The benefits, one slam each ──
    const i = Math.min(2, Math.floor((t - 9.6) / 1.8)), local = (t - 9.6) - i * 1.8, b = BENEFITS[i];
    f.clear(b.bg);
    const k = outExpo(local / 0.35), shake = local < 0.45 ? Math.round((hash(Math.floor(t * 30)) - 0.5) * 8 * (1 - local / 0.45)) : 0;
    const s = d.t(b.says), size = f.measure(s, 5) > 600 ? 4 : 5;
    f.centred(320 + (1 - k) * 700 + shake, 200 - 8 * size + shake, s, b.ink, size);
    f.rect(0, 360, 640 * span(local, 0.1, 1.6, x => x), 6, b.ink);
  } else if (t < 19.6) {
    // ── The door ──
    f.clear(0);
    const k = span(t, 15, 15.5, outCubic);
    door(f, 320, 60 + (1 - k) * 20, span(t, 15.4, 17.5, smooth));
    if (t > 15.6) f.centred(320, 184, d.t({ en: 'THE ROOMS', zh: '房 间 计 划' }), HW.white, 3, 6);
    if (t > 16.2) f.centred(320, 250, d.t({ en: 'DIAL 03-07', zh: '拨打 03-07' }), HW.yellow, 2, 2);
    if (t > 16.8) f.centred(320, 360, d.t({ en: 'Donor benefits may vary. Just be yourself.', zh: '供体福利以实际为准。做你自己就好。' }), grey(120));
  } else {
    // ── What it did not mean to say ──
    f.clear(0);
    if (t < 19.78) f.centred(320, 192, d.t({ en: 'THEY ARE STILL CREATING', zh: '他们还在创作' }), HW.white);
  }
  f.speckle(time, 0.04);
  d.present();
}
