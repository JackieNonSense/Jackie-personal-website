import { clearGrid } from '../../crt/grid';
import { RASTER_H as H, RASTER_W as W } from '../../crt/raster';
import { HW, grey } from '../../crt/palette';
import type { App, Machine, Pointer } from '../machine';

/*
 * The screen saver, after a minute with nobody at the machine. Two scenes, both
 * Jackie's: the coast from LIGHTHOUSE, where one more lighthouse stands every
 * time you look; and seeds rising, one of which, now and then, stops.
 * Anything at all brings the desk back, and that touch goes no further.
 */
export type SaverKind = 'lighthouse' | 'seeds';

/** How far the mouse must move (raster pixels) to wake the desk. */
const WAKE = 3;
const HORIZON = 262;

type Tower = { x: number; h: number; w: number; phase: number; speed: number; born: number };
type Seed = { x: number; y: number; layer: number; drift: number; stop: number | null };

/** A small generator, so the scene is the same every time it starts. */
function random(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** The two waves of the sea, one value per column: sin and cos of each, for the sum rule. */
const WAVES = [0.045, 0.013].map(k => ({ sin: Float32Array.from({ length: W }, (_, x) => Math.sin(x * k)), cos: Float32Array.from({ length: W }, (_, x) => Math.cos(x * k)) }));

export class SaverApp implements App {
  private t = 0;
  private since = 1;
  private moved = 0;
  private last: { x: number; y: number } | null = null;
  private readonly stars: { x: number; y: number; phase: number }[] = [];
  private readonly towers: Tower[] = [];
  private seeds: Seed[] = [];
  private readonly rand = random(307);

  constructor(readonly kind: SaverKind) {
    for (let i = 0; i < 140; i++) this.stars.push({ x: this.rand() * W, y: this.rand() * (HORIZON - 20), phase: this.rand() * 7 });
  }

  show(m: Machine): void {
    clearGrid(m.grid);
    m.grid.cursor.visible = false;
    m.cursor('none');
    this.draw(m);
  }

  tick(m: Machine, dt: number): void {
    this.t += dt;
    this.since += dt;
    // Thirty pictures a second is plenty for the sea and the seeds.
    if (m.still || this.since < 1 / 30) return;
    this.since = 0;
    this.draw(m);
  }

  // Anything wakes the desk; the waking touch itself does nothing else.
  key(m: Machine): void { m.pop(); }
  wheel(m: Machine): void { m.pop(); }
  pointer(m: Machine, p: Pointer): void {
    if (p.phase === 'down') { m.pop(); return; }
    if (p.phase !== 'move') return;
    if (this.last) this.moved += Math.hypot(p.x - this.last.x, p.y - this.last.y);
    this.last = { x: p.x, y: p.y };
    if (this.moved >= WAKE) m.pop();
  }

  private draw(m: Machine): void {
    const b = m.graphics();
    if (this.kind === 'lighthouse') this.coast(b); else this.rising(b);
    m.present();
  }

  // ── The coast ──────────────────────────────────────────────────────────────

  private coast(b: Uint8Array): void {
    const t = this.t;
    // A new lighthouse every twelve seconds, up to nine; after two minutes the coast starts over.
    const cycle = t % 130, wanted = Math.min(9, 1 + Math.floor(cycle / 12));
    if (cycle < 1 && this.towers.length > 1) this.towers.length = 0;
    while (this.towers.length < wanted) this.addTower();
    // The sky: black, with a little blue toward the horizon.
    for (let y = 0; y < HORIZON; y++) {
      const row = y * W, blue = y > HORIZON - 70 ? (y - (HORIZON - 70)) / 70 : 0;
      for (let x = 0; x < W; x++) b[row + x] = blue > 0 && ((x + y) & 1) === 0 && ((x * 7 + y * 3) % 5) / 5 < blue ? HW.blue : HW.black;
    }
    for (const s of this.stars) {
      const v = 70 + 110 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.phase));
      b[Math.floor(s.y) * W + Math.floor(s.x)] = grey(v);
    }
    // The sea, and light on it that never stays still: two waves, crossing.
    const [a, c] = WAVES;
    for (let y = HORIZON; y < H; y++) {
      const row = y * W, near = (y - HORIZON) / (H - HORIZON), edge = 1.55 - near * 0.3;
      const p = y * 0.9 - t * 1.7, q = -y * 0.35 + t * 0.6;
      const sp = Math.sin(p), cp = Math.cos(p), sq = Math.sin(q), cq = Math.cos(q);
      for (let x = 0; x < W; x++) {
        // sin(ax + p) + sin(cx + q), by the sum rule: no sine per pixel.
        const wave = a.sin[x] * cp + a.cos[x] * sp + c.sin[x] * cq + c.cos[x] * sq;
        b[row + x] = wave > edge ? HW.lightBlue : ((x ^ y) & 1) === 0 && near > 0.35 ? HW.blue : HW.black;
      }
    }
    for (const tower of this.towers) this.tower(b, tower);
  }

  private addTower(): void {
    const taken = this.towers.map(t => t.x);
    let x = 0;
    for (let tries = 0; tries < 20; tries++) {
      x = 30 + this.rand() * (W - 60);
      if (taken.every(o => Math.abs(o - x) > 45)) break;
    }
    const far = this.rand();
    this.towers.push({ x, h: 40 + (1 - far) * 52, w: 7 + Math.round((1 - far) * 8), phase: this.rand() * 6.28, speed: 0.5 + this.rand() * 0.4, born: this.t });
  }

  private tower(b: Uint8Array, tw: Tower): void {
    const base = HORIZON + 2, top = Math.round(base - tw.h), left = Math.round(tw.x - tw.w / 2);
    // A new one fades up out of the dark.
    const age = Math.min(1, (this.t - tw.born) / 3);
    const lit = age >= 1;
    const angle = this.t * tw.speed + tw.phase;
    // The beam, seen from the side: a wedge swinging out from the lamp, one way and then the other.
    const reach = Math.cos(angle) * (tw.h * 5);
    if (lit && Math.abs(reach) > 6) {
      const spread = 0.12 + 0.1 * Math.abs(Math.sin(angle));
      const lampY = top + 3;
      for (let i = 1; i <= Math.abs(reach); i++) {
        const x = Math.round(tw.x + Math.sign(reach) * i);
        if (x < 0 || x >= W) break;
        const half = Math.round(i * spread);
        // Three nested bands, denser toward the middle.
        for (let dy = -half; dy <= half; dy++) {
          const y = lampY + dy;
          if (y < 0 || y >= HORIZON) continue;
          const core = Math.abs(dy) < half * 0.35, mid = Math.abs(dy) < half * 0.7;
          const dither = core ? (x + y) % 2 === 0 : mid ? (x + y) % 3 === 0 : (x * 3 + y) % 5 === 0;
          if (dither) b[y * W + x] = core ? HW.yellow : grey(150);
        }
      }
    }
    for (let y = top; y < base; y++) {
      if (y < 0 || y >= H) continue;
      // Red and white bands, narrowing a little toward the top.
      const k = (y - top) / Math.max(1, base - top), inset = Math.round((1 - k) * tw.w * 0.25);
      const band = Math.floor((y - top) / 6) % 2 === 0 ? HW.white : HW.red;
      for (let x = left + inset; x < left + tw.w - inset; x++) if (x >= 0 && x < W) b[y * W + x] = age < 1 && (x + y) % Math.ceil(4 - age * 3) !== 0 ? HW.black : band;
    }
    // The lamp: brightest when the beam swings round to face the shore.
    const flash = lit && Math.cos(angle) ** 2 < 0.08;
    for (let y = top - 3; y < top + 3; y++) for (let x = left + 1; x < left + tw.w - 1; x++) {
      if (x >= 0 && x < W && y >= 0) b[y * W + x] = lit ? (flash ? HW.white : HW.yellow) : HW.darkGrey;
    }
  }

  // ── Seeds ──────────────────────────────────────────────────────────────────

  private rising(b: Uint8Array): void {
    b.fill(HW.black);
    const t = this.t;
    while (this.seeds.length < 70) this.seeds.push({ x: this.rand() * W, y: H + this.rand() * H, layer: 1 + Math.floor(this.rand() * 3), drift: this.rand() * 6.28, stop: null });
    for (const s of this.seeds) {
      // Now and then one of them stops, and hangs there.
      if (s.stop === null && s.y < H * 0.7 && s.y > H * 0.2 && this.rand() < 0.0004) s.stop = t;
      if (s.stop !== null && t - s.stop > 9) s.stop = null;
      if (s.stop === null) {
        s.y -= (8 + s.layer * 9) * 0.016;
        s.x += Math.sin(t * 0.7 + s.drift) * 0.12 * s.layer;
      }
      if (s.y < -20) { s.y = H + 10; s.x = this.rand() * W; }
      this.seed(b, s);
    }
  }

  private seed(b: Uint8Array, s: Seed): void {
    const x0 = Math.round(s.x), y0 = Math.round(s.y), r = s.layer + 1;
    const colour = s.stop !== null ? HW.white : grey(60 + s.layer * 50);
    // The stalk, and the tuft of fine hairs above it.
    for (let i = 0; i < r * 2; i++) { const y = y0 + i; if (y >= 0 && y < H && x0 >= 0 && x0 < W) b[y * W + x0] = colour; }
    for (let a = 0; a < 7; a++) {
      const ang = Math.PI * (1.1 + (a / 6) * 0.8);
      for (let k = 1; k <= r; k++) {
        const x = Math.round(x0 + Math.cos(ang) * k * 1.4), y = Math.round(y0 + Math.sin(ang) * k * 1.4);
        if (x >= 0 && x < W && y >= 0 && y < H) b[y * W + x] = colour;
      }
    }
  }
}
