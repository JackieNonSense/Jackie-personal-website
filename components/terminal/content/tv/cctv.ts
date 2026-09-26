import { HW, grey } from '../../crt/palette';
import { Frame, hash, picture } from '../../graphics/motion';
import { PHOTOS } from '../photos';
import type { Display } from '../../system/display';
import type { Text } from '../../system/i18n';

/*
 * Channel 12: ROOMS LIVE. Four cameras on one screen, the way a guard's monitor shows
 * them: the corridor where the donors sit, and three rooms. Every so often one camera
 * takes the whole screen. The fourth room is Jackie's; its clock does not move.
 */

type Cam = { photo: string; label: Text; date: string; frozen?: boolean };
const CAMS: Cam[] = [
  { photo: 'rooms', label: { en: 'CAM 01  CORRIDOR', zh: 'CAM 01  走廊' }, date: '2030-04-02' },
  { photo: 'room_001', label: { en: 'CAM 02  ROOM 118', zh: 'CAM 02  118 房' }, date: '2030-06-30' },
  { photo: 'room_002', label: { en: 'CAM 03  ROOM 207', zh: 'CAM 03  207 房' }, date: '2030-07-02' },
  { photo: 'room_004', label: { en: 'CAM 04  J.R.', zh: 'CAM 04  J.R.' }, date: '2030-07-09', frozen: true },
];

const CYCLE = 12, ALONE = 4;
const pad = (n: number) => String(n).padStart(2, '0');

function feed(f: Frame, d: Display, cam: Cam, i: number, r: { x: number; y: number; w: number; h: number }, time: number, big: boolean): void {
  const p = picture(u => d.loadPicture(u), PHOTOS[cam.photo].url);
  f.rect(r.x, r.y, r.w, r.h, 0);
  if (p) {
    // Each camera shakes a little, on its own.
    const jx = (hash(Math.floor(time * 8) + i * 31) - 0.5) * 3, jy = (hash(Math.floor(time * 8) + i * 57) - 0.5) * 2;
    f.picture(p, r, { x: 6 + jx, y: 4 + jy, w: p.width - 12, h: p.height - 8 }, 1.1, 10);
  }
  const k = big ? 2 : 1;
  f.text(r.x + 8, r.y + 6, `${d.t(cam.label)}`, HW.white, k);
  // The time: 03:07, and the seconds running (except in one room).
  const s = cam.frozen ? 0 : Math.floor(time + i * 13) % 60;
  f.text(r.x + 8, r.y + r.h - 16 * k - 4, `${cam.date} 03:07:${pad(s)}`, HW.white, k);
  if (Math.floor(time * 2) % 2 === 0) {
    const rx = r.x + r.w - 44 * k;
    f.disc(rx, r.y + 12 * k, 4 * k, HW.lightRed);
    f.text(rx + 8 * k, r.y + 5 * k, 'REC', HW.white, k);
  }
}

export function cctv(d: Display, time: number): void {
  const f = new Frame(d.graphics(), d.glyphs);
  f.clear(grey(20));
  const round = Math.floor(time / CYCLE), local = time % CYCLE;
  if (local > CYCLE - ALONE) {
    const i = round % CAMS.length;
    feed(f, d, CAMS[i], i, { x: 0, y: 0, w: 640, h: 400 }, time, true);
  } else {
    CAMS.forEach((cam, i) => feed(f, d, cam, i, { x: (i % 2) * 321, y: Math.floor(i / 2) * 201, w: 319, h: 199 }, time, false));
  }
  // The recorder's own lines and grain.
  for (let y = Math.floor((time * 40) % 8); y < 400; y += 8) f.dither(0, y, 640, 1, 0.25, grey(8), null);
  f.speckle(time, 0.15);
  if (hash(Math.floor(time * 10) * 3) > 0.97) f.tracking(time, 0.6);
  d.present();
}
