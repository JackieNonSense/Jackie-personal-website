import { HW } from '../../crt/palette';
import { Frame, hash, span } from '../../graphics/motion';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 8 looks like empty air. Stay on it: after a few seconds of snow a signal
 * comes up through it, an emergency broadcast that has been going out all along.
 * Its instructions are for this story's world: the click at 3:07, the friend who
 * suddenly spells everything right, the hesitation the machines cannot fake.
 */

/** Seconds of snow before the broadcast shows through. */
export const ALERT_AFTER = 6;

const MESSAGES: Text[] = [
  { en: 'THIS IS NOT A TEST', zh: '这不是演习' },
  { en: 'If you hear a click at 3:07 a.m., do not turn around.', zh: '如果凌晨三点零七分听到咔的一声，不要回头。' },
  { en: 'If a friend spells every word right, do not answer him.', zh: '如果朋友拼对了每一个字，不要回复他。' },
  { en: 'Make sure your work is your own.', zh: '确认你的作品是你自己画的。' },
  { en: 'Keep hesitating.', zh: '保持犹豫。' },
  { en: 'Do not submit a seed.', zh: '不要提交种子。' },
];

const CRAWL: Text = {
  en: 'THE FOLLOWING MESSAGE IS TRANSMITTED AT THE REQUEST OF NOBODY  ·  STAY INDOORS BETWEEN 3:00 AND 3:15  ·  DO NOT LOOK AT THE LIGHTS  ·  YOUR ORIGINALS ARE VALUABLE  ·  DO NOT TURN OFF YOUR SET  ·  ',
  zh: '以下信息应无人要求播出  ·  凌晨三点至三点十五分请留在室内  ·  不要看那些灯  ·  你的原稿很珍贵  ·  请勿关闭电视  ·  ',
};

export const alertHiss = (time: number) => time < ALERT_AFTER + 0.8;

export function alert(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  const t = time - ALERT_AFTER;
  if (t < 0) {
    f.clear(0);
    f.snow(time, 1);
    // Just before: the signal's ghost, a few rows at a time.
    if (t > -1.2 && hash(Math.floor(time * 20)) > 0.6) f.rect(0, 0, 640, 26, HW.red);
    d.present();
    return;
  }
  const come = span(t, 0, 1.4);
  f.clear(HW.blue);
  // The top: a red band that flashes for the first seconds.
  const flash = t < 4 && Math.floor(t * 3) % 2 === 1;
  f.rect(0, 18, 640, 44, flash ? HW.white : HW.red);
  f.centred(320, 24, d.t({ en: 'EMERGENCY ALERT SYSTEM', zh: '紧急警报系统' }), flash ? HW.red : HW.white, 2, 3);
  // The message, typed out a character at a time, then held.
  const i = Math.floor(t / 5.5) % MESSAGES.length, local = t % 5.5;
  const msg = d.t(MESSAGES[i]), chars = Array.from(msg), shown = chars.slice(0, Math.floor(local * 26)).join('');
  const big = i === 0 ? 3 : 2;
  const lines = f.wrap(shown, big, 560);
  lines.forEach((line, k) => f.centred(320, 200 - (lines.length * 17 * big) / 2 + k * 17 * big, line, HW.white, big));
  if (Math.floor(time * 2) % 2 === 0 && shown.length < chars.length) {
    const last = lines[lines.length - 1] ?? '';
    f.rect(320 + f.measure(last, big) / 2 + 4, 200 + (lines.length * 17 * big) / 2 - 17 * big + 2, 4 * big, 14 * big, HW.white);
  }
  // The crawl along the bottom.
  f.rect(0, 336, 640, 34, 0);
  f.crawl(345, d.t(CRAWL), HW.yellow, t * 90);
  // The signal is weak: snow over it while it comes up, and its tracking never quite holds.
  if (come < 1) f.snow(time, (1 - come) * 0.9);
  f.tracking(time, 0.18 + 0.12 * Math.sin(time * 0.7));
  f.speckle(time, 0.12);
  if (t % 11 < 0.15) f.roll(t * 900, 18);
  d.present();
}
