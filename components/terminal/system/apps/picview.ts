import { ATTR, clearGrid } from '../../crt/grid';
import { RASTER_H, RASTER_W } from '../../crt/raster';
import { H, W, drawText, fillRect, type Picture } from '../../graphics/bitmap';
import { GREY, grey } from '../../crt/palette';
import { statusBar, strWidth, text } from '../screen';
import { ButtonTracker, closeBox, drawButtons } from '../gui/overlay';
import type { Gfx } from '../gui/gfx';
import type { App, Key, Machine, Pointer } from '../machine';

/** One picture on the disk, as PICVIEW needs it. */
export type Slide = {
  name: string;
  url: string;
  /** "2030-07-02 03:07", or null for a picture taken now. */
  taken: string | null;
  /** Loading pauses at this fraction of the picture. */
  stall?: number;
  /** A quad in the picture (TL, TR, BR, BL) where the terminal's own screen appears. */
  screen?: () => Promise<[number, number][] | null>;
  flag?: string;
};

/** Rows of picture read per second: a slow disk and a slow decoder. */
const ROWS_PER_SECOND = 240;
const STALL_TIME = 1.6;
/** A picture with the screen in it closes in on that screen, like enhancing a tape. */
const ZOOM_WAIT = 1.6, ZOOM_TIME = 6;

/** A finger must travel this far (CSS pixels) to turn the page. */
const SWIPE = 40;

/**
 * PICVIEW: a picture viewer of the period. Pictures come off the disk a line at a
 * time, top to bottom. A click on the left half turns back, on the right half on;
 * the box in the corner closes. ←→ and ESC do the same.
 */
export class PicViewApp implements App {
  private index: number;
  private picture: Picture | 'loading' | 'failed' = 'loading';
  private shown = 0;
  private stalled = 0;
  private stallDone = false;
  /** The frame on the screen when the viewer started, and where the eye was on it. */
  private seen: { page: Uint8Array; u: number; v: number } | null = null;
  private token = 0;
  private readonly buttons = new ButtonTracker();
  private press: { x: number; y: number } | null = null;
  /** For a picture that shows this screen: where, and the page it shows. */
  private live: { photo: Picture; quad: [number, number][]; page: Uint8Array } | null = null;
  private since = 0;

  constructor(private readonly slides: Slide[], start = 0) {
    this.index = Math.max(0, Math.min(slides.length - 1, start));
  }

  show(m: Machine): void {
    // What was on the screen when the viewer started, for a picture that shows it.
    if (!this.seen) this.seen = seenScreen(m);
    this.open(m, this.index);
  }

  overlay(m: Machine, g: Gfx): void { drawButtons(g, m, [closeBox(g.width)], this.buttons.hover, this.buttons.down); }

  pointer(m: Machine, p: Pointer): void {
    if (this.buttons.pointer(m, p, [closeBox(640 / m.scale)], () => m.pop())) return;
    const half = p.lx < 320 / m.scale ? -1 : 1;
    m.cursor(half < 0 ? 'left' : 'right');
    if (p.phase === 'down') this.press = { x: p.x, y: p.y };
    if (p.phase === 'up' && this.press) {
      const dx = (p.x - this.press.x) / p.pxPerCss;
      this.press = null;
      // A swipe turns the way the finger went; a click, the way of its half.
      this.turn(m, Math.abs(dx) >= SWIPE ? (dx < 0 ? 1 : -1) : half);
    }
    if (p.phase === 'cancel') this.press = null;
  }

  wheel(m: Machine, lines: number): void { this.turn(m, Math.sign(lines)); }

  private turn(m: Machine, step: number): void {
    const next = this.index + step;
    if (step && next >= 0 && next < this.slides.length) this.open(m, next);
  }

  private get slide(): Slide { return this.slides[this.index]; }

  private open(m: Machine, index: number): void {
    this.index = index;
    this.picture = 'loading';
    this.shown = 0; this.stalled = 0; this.stallDone = false;
    this.live = null; this.since = 0;
    const token = ++this.token, slide = this.slide;
    const b = m.graphics();
    b.fill(0);
    m.present();
    // The disk reads for as long as the picture takes to come in.
    m.audio.sfx('disk', String(H / ROWS_PER_SECOND));
    m.loadPicture(slide.url)
      .then(async p => {
        if (token !== this.token) return;
        const quad = slide.screen ? await slide.screen() : null;
        if (token !== this.token) return;
        if (quad && this.seen) {
          this.live = { photo: p, quad, page: this.seen.page };
          this.picture = withScreen(p, quad, this.live.page);
        } else this.picture = p;
      })
      .catch(() => { if (token === this.token) this.picture = 'failed'; });
    this.status(m);
    m.announce(`${slide.name}, ${slide.taken ?? m.t({ en: 'now', zh: '现在' })}`);
  }

  tick(m: Machine, dt: number): void {
    if (typeof this.picture !== 'object') return;
    if (this.shown >= this.picture.height) { if (this.live) this.closeIn(m, dt); return; }
    const p = this.picture, stallAt = this.slide.stall ? Math.floor(p.height * this.slide.stall) : -1;
    if (stallAt >= 0 && !this.stallDone && this.shown >= stallAt) {
      if (!this.stalled) m.audio.sfx('disk', 'retry');
      this.stalled += dt;
      if (this.stalled < STALL_TIME) { this.status(m); return; }
      this.stallDone = true;
    }
    const from = Math.floor(this.shown);
    this.shown = Math.min(p.height, this.shown + dt * ROWS_PER_SECOND);
    const to = Math.floor(this.shown);
    const b = m.graphics(), ox = Math.floor((W - p.width) / 2), oy = Math.floor((H - p.height) / 2);
    for (let y = from; y < to; y++) {
      const ty = oy + y;
      if (ty < 0 || ty >= H) continue;
      for (let x = 0; x < p.width; x++) {
        const tx = ox + x;
        if (tx >= 0 && tx < W) b[ty * W + tx] = GREY[p.data[y * p.width + x]];
      }
    }
    // The line being read, bright for an instant.
    if (to < p.height) fillRect(b, ox, oy + to, p.width, 1, grey(150));
    if (to >= p.height) {
      this.stamp(m);
      if (this.slide.flag) m.mark(this.slide.flag);
    }
    m.present();
    this.status(m);
  }

  /** Closes in on the screen in the picture, redrawing it sharp at every step. */
  private closeIn(m: Machine, dt: number): void {
    const live = this.live!;
    const before = this.since;
    this.since += dt;
    const t = Math.min(1, Math.max(0, (this.since - ZOOM_WAIT) / ZOOM_TIME));
    if (t <= 0 || (before - ZOOM_WAIT) / ZOOM_TIME >= 1) return;
    const e = t * t * (3 - 2 * t);
    const { photo, quad } = live;
    // The end: whatever the visitor was looking at, the pointer or the last thing typed, filling the view.
    const u = Math.min(0.62, Math.max(0.3, this.seen!.u));
    const v = Math.min(0.88, Math.max(0.12, this.seen!.v));
    const [cx, cy] = apply(homography(quad), u, v);
    const across = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]);
    const vw = across * 0.62, vh = vw * (H / W);
    const view = {
      x: e * (cx - vw / 2), y: e * (cy - vh / 2),
      w: (1 - e) * photo.width + e * vw, h: (1 - e) * photo.height + e * vh,
    };
    const back = invert(homography(quad));
    const b = m.graphics();
    let seed = (Math.floor(this.since * 30) * 2654435761) >>> 0 || 1;
    for (let y = 0; y < H; y++) {
      const py = view.y + ((y + 0.5) * view.h) / H;
      for (let x = 0; x < W; x++) {
        const px = view.x + ((x + 0.5) * view.w) / W;
        const [u, v] = apply(back, px, py);
        let value: number;
        if (u >= 0 && u < 1 && v >= 0 && v < 1) value = 26 + live.page[Math.floor(v * RASTER_H) * RASTER_W + Math.floor(u * RASTER_W)] * 0.75;
        else value = photo.data[Math.min(photo.height - 1, Math.max(0, Math.floor(py))) * photo.width + Math.min(photo.width - 1, Math.max(0, Math.floor(px)))];
        // The grain of a picture blown up past what it holds.
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
        b[y * W + x] = GREY[Math.max(0, Math.min(255, Math.round(value + ((seed & 31) - 16) * e)))];
      }
    }
    this.stamp(m);
    m.present();
  }

  /** Camera time, burned into the corner the way the camera wrote it. */
  private stamp(m: Machine): void {
    if (!m.glyphs) return;
    const time = this.slide.taken?.slice(11) ?? clockNow();
    if (!time) return;
    const b = m.graphics();
    drawText(b, m.glyphs, W - 16 - 5 * 16, 24, time, grey(230), 2);
  }

  private status(m: Machine): void {
    const g = m.grid;
    clearGrid(g);
    const slide = this.slide, n = `${this.index + 1}/${this.slides.length}`;
    let state = '';
    if (this.picture === 'loading') state = m.t({ en: 'READING', zh: '读取中' });
    else if (this.picture === 'failed') state = m.t({ en: 'CRC ERROR', zh: 'CRC 校验错误' });
    else if (this.shown < this.picture.height) {
      const pct = Math.floor((this.shown / this.picture.height) * 100);
      state = this.stalled > 0 && !this.stallDone ? m.t({ en: `SECTOR ${pct}  RETRY`, zh: `扇区 ${pct}  重试` }) : `${pct}%`;
    }
    const taken = slide.taken ?? `${m.t({ en: 'now', zh: '现在' })}`;
    const left = m.narrow ? `${slide.name} ${state || taken.slice(0, 10)}` : `${slide.name}   ${taken}   ${state}`;
    statusBar(g, left, n);
    if (this.picture === 'failed') {
      const msg = m.t({ en: 'Picture cannot be read.', zh: '无法读取图片。' });
      text(g, Math.floor((g.cols - strWidth(msg)) / 2), Math.floor(g.rows / 2), msg, ATTR.bright);
    }
    if (!m.narrow) text(g, 1, 0, m.t({ en: ' click a side to turn ', zh: ' 点左右两边翻看 ' }), ATTR.dim);
  }

  key(m: Machine, { key, ctrl }: Key): void {
    if (ctrl) return;
    if (key === 'Escape' || key === 'Backspace' || key === 'q' || key === 'Q') { m.pop(); return; }
    this.turn(m, ['ArrowRight', 'ArrowDown', ' ', '.', 'n', 'N', 'Enter', 'PageDown'].includes(key) ? 1
      : ['ArrowLeft', 'ArrowUp', ',', 'b', 'B', 'PageUp'].includes(key) ? -1 : 0);
  }
}

function clockNow(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * The frame that was showing when PICVIEW started, pointer and all, as a camera
 * would see it: how bright each pixel glowed. And where the eye was: the pointer,
 * or the last thing typed.
 */
function seenScreen(m: Machine): { page: Uint8Array; u: number; v: number } {
  const page = m.snapshot(), level = m.theme.level;
  for (let i = 0; i < page.length; i++) page[i] = level[page[i]];
  if (m.mouse.visible) return { page, u: m.mouse.x / RASTER_W, v: m.mouse.y / RASTER_H };
  const c = m.grid.cursor;
  return { page, u: (c.x + 2) / m.cols, v: (c.y + 0.5) / m.rows };
}

/** The picture with that page painted into the monitor in it, seen from the corner of the room. */
function withScreen(p: Picture, quad: [number, number][], page: Uint8Array): Picture {
  const toQuad = homography(quad), fromQuad = invert(toQuad);
  const data = p.data.slice();
  const xs = quad.map(q => q[0]), ys = quad.map(q => q[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(p.width - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(p.height - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const [u, v] = apply(fromQuad, x + 0.5, y + 0.5);
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    // A soft sample: at this distance the page is a glow more than letters.
    const sx = Math.floor(u * (RASTER_W - 2)), sy = Math.floor(v * (RASTER_H - 2));
    const i = sy * RASTER_W + sx;
    const lit = (page[i] + page[i + 1] + page[i + RASTER_W] + page[i + RASTER_W + 1]) / 4;
    data[y * p.width + x] = Math.min(255, Math.round(50 + lit * 0.75));
  }
  return { width: p.width, height: p.height, data };
}

type Mat = number[];

/** The projective map taking the unit square to the quad (TL, TR, BR, BL). */
function homography(q: [number, number][]): Mat {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

function invert(a: Mat): Mat {
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = a;
  const c0 = a4 * a8 - a5 * a7, c1 = a5 * a6 - a3 * a8, c2 = a3 * a7 - a4 * a6;
  const det = a0 * c0 + a1 * c1 + a2 * c2;
  return [
    c0 / det, (a2 * a7 - a1 * a8) / det, (a1 * a5 - a2 * a4) / det,
    c1 / det, (a0 * a8 - a2 * a6) / det, (a2 * a3 - a0 * a5) / det,
    c2 / det, (a1 * a6 - a0 * a7) / det, (a0 * a4 - a1 * a3) / det,
  ];
}

function apply(m: Mat, x: number, y: number): [number, number] {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}
