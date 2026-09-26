import { GAME } from '../../audio/tracks';
import { H, W, drawText, fillRect, frameRect } from '../../graphics/bitmap';
import { CAMERA, line, project, renderScene, transform, type Instance, type Vec3 } from '../../graphics/raster3d';
import { HW, grey } from '../../crt/palette';
import { DRONE, MINE, RING, SHIP, SPIKES, rock } from './orbit-models';
import type { Game, GameInput } from '../../system/apps/game';
import type { Machine } from '../../system/machine';

/*
 * ORBIT, Jackie's second game (April 2030): fly the ship through five stages of
 * the belt. He never wrote a sixth. The game still counts on one, and divides by
 * the number of stages left; the error is what DOS always said about that.
 */
export const CRASH = 'Runtime error 200 at 0001:0F3C';

export type ObjKind = 'rock' | 'ring' | 'mine' | 'drone';
export const STAGES: readonly { name: string; length: number; speed: number; spawn: number; kinds: readonly ObjKind[] }[] = [
  { name: 'DEPARTURE', length: 30, speed: 1.0, spawn: 0.95, kinds: ['rock'] },
  { name: 'RINGS', length: 35, speed: 1.15, spawn: 0.8, kinds: ['rock', 'ring', 'ring'] },
  { name: 'MINES', length: 40, speed: 1.3, spawn: 0.7, kinds: ['rock', 'ring', 'mine', 'mine'] },
  { name: 'PATROL', length: 45, speed: 1.45, spawn: 0.62, kinds: ['rock', 'mine', 'drone', 'drone'] },
  { name: 'THE CORE', length: 50, speed: 1.6, spawn: 0.42, kinds: ['rock', 'ring', 'mine', 'drone'] },
];

/** How fast the belt comes at the ship, in units a second, before a stage's speed-up. */
const SPEED = 14;
/** Where the ship flies, and how far it may go to either side. */
const SHIP_Z = 3.2, REACH = { x: 1.8, y: 1.05 };
const FAR = 70;
const LIVES = 3, FIRE_EVERY = 0.18, SAFE = 1.5;

type Obj = { kind: ObjKind; pos: Vec3; rot: Vec3; spin: Vec3; r: number; hp: number; mesh: Instance['mesh']; fire: number };
type Shot = { pos: Vec3; v: Vec3; enemy: boolean };
type Spark = { pos: Vec3; v: Vec3; life: number; colour: number };
export type OrbitPhase = 'stage' | 'play' | 'clear' | 'six' | 'crash';
export type OrbitEvent = 'laser' | 'boom' | 'ring' | 'hit' | 'stage' | 'crash';

export type OrbitState = {
  phase: OrbitPhase; stage: number; t: number; distance: number; lives: number; score: number;
  ship: { x: number; y: number }; objects: Obj[]; shots: Shot[]; sparks: Spark[];
  stars: Vec3[]; spawn: number; cool: number; safe: number; shake: number; seed: number;
};

export type OrbitInput = { x: number; y: number; aim: { x: number; y: number } | null; fire: boolean };

function rng(s: OrbitState): number {
  s.seed ^= s.seed << 13; s.seed ^= s.seed >>> 17; s.seed ^= s.seed << 5; s.seed >>>= 0;
  return s.seed / 4294967296;
}

export function newOrbit(seed = 2030): OrbitState {
  const s: OrbitState = {
    phase: 'stage', stage: 0, t: 0, distance: 0, lives: LIVES, score: 0, ship: { x: 0, y: -0.2 },
    objects: [], shots: [], sparks: [], stars: [], spawn: 1, cool: 0, safe: 0, shake: 0, seed: seed >>> 0 || 1,
  };
  for (let i = 0; i < 180; i++) s.stars.push([(rng(s) - 0.5) * 60, (rng(s) - 0.5) * 38, 1 + rng(s) * FAR]);
  return s;
}

function spawn(s: OrbitState): void {
  const stage = STAGES[s.stage], kind = stage.kinds[Math.floor(rng(s) * stage.kinds.length)];
  const spread = { x: REACH.x + 1.2, y: REACH.y + 0.8 };
  const pos: Vec3 = [(rng(s) * 2 - 1) * spread.x, (rng(s) * 2 - 1) * spread.y, FAR];
  const spin: Vec3 = [(rng(s) - 0.5) * 2, (rng(s) - 0.5) * 2, (rng(s) - 0.5) * 2];
  const base = { pos, rot: [rng(s) * 6, rng(s) * 6, 0] as Vec3, spin, fire: 1 + rng(s) * 2 };
  if (kind === 'rock') s.objects.push({ ...base, kind, r: 0.55 + rng(s) * 0.5, hp: 2, mesh: rock(Math.floor(rng(s) * 1e9)) });
  // Rings lie across the way, within reach, and do not tumble.
  else if (kind === 'ring') s.objects.push({ ...base, kind, pos: [pos[0] * 0.6, pos[1] * 0.6, FAR], rot: [0, 0, 0], spin: [0, 0, 0.6], r: 1.1, hp: Infinity, mesh: RING });
  else if (kind === 'mine') s.objects.push({ ...base, kind, r: 0.5, hp: 1, mesh: MINE });
  else s.objects.push({ ...base, kind, rot: [0, 0, 0], spin: [0, 0, 0], r: 0.6, hp: 2, mesh: DRONE });
}

function burst(s: OrbitState, at: Vec3, colour: number, n = 18): void {
  for (let i = 0; i < n; i++) {
    const a = rng(s) * Math.PI * 2, b = rng(s) * Math.PI - Math.PI / 2, v = 2 + rng(s) * 5;
    s.sparks.push({ pos: [...at] as Vec3, v: [Math.cos(a) * Math.cos(b) * v, Math.sin(b) * v, Math.sin(a) * Math.cos(b) * v], life: 0.5 + rng(s) * 0.5, colour });
  }
}

const VALUE: Record<ObjKind, number> = { rock: 10, ring: 50, mine: 30, drone: 60 };

/** One step of the game: pure but for its own seeded dice. Returns what happened, for the sounds. */
export function step(s: OrbitState, dt: number, input: OrbitInput): OrbitEvent[] {
  const events: OrbitEvent[] = [];
  s.t += dt;
  const stage = STAGES[Math.min(s.stage, STAGES.length - 1)];
  const speed = SPEED * stage.speed * (s.phase === 'play' ? 1 : 0.5);
  // The ship: toward where the pointer is, or pushed by the keys.
  if (input.aim) {
    s.ship.x += (input.aim.x - s.ship.x) * Math.min(1, dt * 9);
    s.ship.y += (input.aim.y - s.ship.y) * Math.min(1, dt * 9);
  } else {
    s.ship.x += input.x * 3.4 * dt;
    s.ship.y += input.y * 3.4 * dt;
  }
  s.ship.x = Math.max(-REACH.x, Math.min(REACH.x, s.ship.x));
  s.ship.y = Math.max(-REACH.y, Math.min(REACH.y, s.ship.y));
  for (const star of s.stars) {
    star[2] -= speed * dt * 1.6;
    if (star[2] < 1) { star[0] = (rng(s) - 0.5) * 60; star[1] = (rng(s) - 0.5) * 38; star[2] = FAR; }
  }
  s.cool -= dt;
  s.safe = Math.max(0, s.safe - dt);
  s.shake = Math.max(0, s.shake - dt);
  if (input.fire && s.cool <= 0 && (s.phase === 'play' || s.phase === 'stage')) {
    s.cool = FIRE_EVERY;
    for (const side of [-0.5, 0.5]) s.shots.push({ pos: [s.ship.x + side, s.ship.y - 0.1, SHIP_Z + 0.8], v: [0, 0, 60], enemy: false });
    events.push('laser');
  }
  if (s.phase === 'stage' && s.t > 2) { s.phase = 'play'; s.t = 0; }
  if (s.phase === 'play') {
    s.distance += dt;
    s.spawn -= dt;
    if (s.spawn <= 0 && s.distance < stage.length - 3) { spawn(s); s.spawn = stage.spawn * (0.6 + rng(s) * 0.8); }
    if (s.distance >= stage.length && !s.objects.length) {
      s.phase = 'clear'; s.t = 0;
      s.score += 100 * (s.stage + 1) + s.lives * 50;
      events.push('stage');
    }
  } else if (s.phase === 'clear' && s.t > 2.4) {
    s.t = 0;
    if (s.stage + 1 < STAGES.length) { s.stage++; s.distance = 0; s.phase = 'stage'; }
    else { s.phase = 'six'; events.push('stage'); }
  } else if (s.phase === 'six' && s.t > 2.2) {
    // STAGE 6: the stages left are counted, and divided by. There are none.
    s.phase = 'crash';
    events.push('crash');
  }
  for (const o of s.objects) {
    o.pos[2] -= speed * dt;
    o.rot = [o.rot[0] + o.spin[0] * dt, o.rot[1] + o.spin[1] * dt, o.rot[2] + o.spin[2] * dt];
    // Mines lean toward the ship; drones turn to face it and shoot.
    if (o.kind === 'mine' && o.pos[2] < 30) { o.pos[0] += Math.sign(s.ship.x - o.pos[0]) * dt * 0.5; o.pos[1] += Math.sign(s.ship.y - o.pos[1]) * dt * 0.5; }
    if (o.kind === 'drone' && o.pos[2] < 45 && o.pos[2] > 10) {
      o.fire -= dt;
      if (o.fire <= 0) {
        o.fire = 1.4 + rng(s);
        const d: Vec3 = [s.ship.x - o.pos[0], s.ship.y - o.pos[1], SHIP_Z - o.pos[2]], l = Math.hypot(...d);
        s.shots.push({ pos: [...o.pos] as Vec3, v: [(d[0] / l) * 24, (d[1] / l) * 24, (d[2] / l) * 24], enemy: true });
      }
    }
  }
  for (const shot of s.shots) shot.pos = [shot.pos[0] + shot.v[0] * dt, shot.pos[1] + shot.v[1] * dt, shot.pos[2] + shot.v[2] * dt];
  // The ship's shots against what is ahead.
  for (const shot of s.shots) {
    if (shot.enemy) continue;
    for (const o of s.objects) {
      if (o.kind === 'ring' || o.hp <= 0) continue;
      if (Math.abs(shot.pos[2] - o.pos[2]) < o.r + 1.2 && Math.hypot(shot.pos[0] - o.pos[0], shot.pos[1] - o.pos[1]) < o.r + 0.15) {
        o.hp--; shot.pos[2] = FAR * 2;
        if (o.hp <= 0) { s.score += VALUE[o.kind]; burst(s, o.pos, o.kind === 'mine' ? HW.lightRed : o.kind === 'drone' ? HW.lightMagenta : HW.brown); events.push('boom'); }
      }
    }
  }
  const hurt = (at: Vec3) => {
    if (s.safe > 0) return;
    s.lives--; s.safe = SAFE; s.shake = 0.5;
    burst(s, at, HW.yellow, 26);
    events.push('hit');
  };
  // What reaches the ship: rings passed through, the rest into it.
  for (const o of s.objects) {
    if (o.hp <= 0 || o.pos[2] > SHIP_Z + 0.4 || o.pos[2] < SHIP_Z - 0.6) continue;
    const d = Math.hypot(s.ship.x - o.pos[0], s.ship.y - o.pos[1]);
    if (o.kind === 'ring') { if (d < 0.72) { s.score += VALUE.ring; events.push('ring'); o.hp = 0; } continue; }
    if (d < o.r + 0.55) { o.hp = 0; hurt(o.pos); }
  }
  for (const shot of s.shots) {
    if (shot.enemy && Math.abs(shot.pos[2] - SHIP_Z) < 0.6 && Math.hypot(shot.pos[0] - s.ship.x, shot.pos[1] - s.ship.y) < 0.5) { shot.pos[2] = -1; hurt(shot.pos); }
  }
  s.objects = s.objects.filter(o => o.hp > 0 && o.pos[2] > 0.6);
  s.shots = s.shots.filter(shot => shot.pos[2] > 0.6 && shot.pos[2] < FAR * 1.5);
  for (const sp of s.sparks) { sp.pos = [sp.pos[0] + sp.v[0] * dt, sp.pos[1] + sp.v[1] * dt, sp.pos[2] + sp.v[2] * dt - speed * dt * 0.5]; sp.life -= dt; }
  s.sparks = s.sparks.filter(sp => sp.life > 0);
  return events;
}

/** ORBIT as the game program runs it. */
export class OrbitGame implements Game {
  readonly title = 'ORBIT';
  readonly music = GAME;
  readonly help = { en: 'Five stages of the belt. Fly through the rings; shoot what shoots.', zh: '穿过小行星带的五关。钻过光环，打掉会开火的东西。' };
  state = newOrbit();
  crash: string | null = null;

  constructor(readonly table: Game['table'] = []) {}

  get over(): boolean { return this.state.lives <= 0; }
  get score(): number { return this.state.score; }

  reset(): void { this.state = newOrbit(Math.floor(Math.random() * 1e9)); this.crash = null; }

  update(m: Machine, dt: number, input: GameInput): void {
    const p = input.pointer;
    // The pointer, at the ship's depth.
    const aim = p ? { x: ((p.x - CAMERA.cx) * SHIP_Z) / CAMERA.f, y: (-(p.y - CAMERA.cy + 50) * SHIP_Z) / CAMERA.f } : null;
    const x = (input.held.has('Right') ? 1 : 0) - (input.held.has('Left') ? 1 : 0), y = (input.held.has('Up') ? 1 : 0) - (input.held.has('Down') ? 1 : 0);
    const events = step(this.state, dt, { x, y, aim: x || y ? null : aim, fire: input.held.has('Fire') || Boolean(p?.down) || input.pressed.has('Fire') });
    for (const e of events) {
      if (e === 'laser') m.audio.sfx('laser');
      else if (e === 'boom' || e === 'hit') m.audio.sfx('boom', e);
      else if (e === 'ring') m.audio.sfx('catch');
      else if (e === 'stage') m.audio.sfx('stage');
      else if (e === 'crash') { m.audio.music(null); this.crash = CRASH; }
    }
  }

  draw(m: Machine): void {
    const b = m.graphics(), s = this.state, mono = m.theme.tube.mono;
    b.fill(HW.black);
    const shake = s.shake > 0 ? [Math.sin(s.t * 90) * 6 * s.shake, Math.cos(s.t * 70) * 4 * s.shake] : [0, 0];
    const cam = { ...CAMERA, cx: CAMERA.cx + shake[0], cy: CAMERA.cy + shake[1] - 50 };
    for (const star of s.stars) {
      const a = project(cam, star), z = star[2] + 1.5, back = project(cam, [star[0], star[1], z]);
      if (!a || !back) continue;
      line(b, back[0], back[1], a[0], a[1], grey(255 - (star[2] / FAR) * 200));
    }
    const items: Instance[] = s.objects.map(o => ({ mesh: o.mesh, pos: o.pos, rot: o.rot, scale: o.r }));
    // The ship blinks while it is safe after a hit.
    if (s.phase !== 'crash' && (s.safe <= 0 || Math.floor(s.t * 12) % 2 === 0)) {
      items.push({ mesh: SHIP, pos: [s.ship.x, s.ship.y - 0.4, SHIP_Z], rot: [0.55 + s.ship.y * 0.12, 0, -s.ship.x * 0.22], scale: 0.46 });
    }
    renderScene(b, cam, [-0.4, 0.8, -0.6], items, mono ? { wire: true } : { outline: HW.black });
    for (const o of s.objects) {
      if (o.kind !== 'mine') continue;
      for (const [a, c] of SPIKES) {
        const it = { mesh: MINE, pos: o.pos, rot: o.rot, scale: o.r };
        const p = project(cam, transform(a, it)), q = project(cam, transform(c, it));
        if (p && q) line(b, p[0], p[1], q[0], q[1], HW.lightRed);
      }
    }
    for (const shot of s.shots) {
      const a = project(cam, shot.pos), c = project(cam, [shot.pos[0] - shot.v[0] * 0.02, shot.pos[1] - shot.v[1] * 0.02, shot.pos[2] - shot.v[2] * 0.02]);
      if (a && c) line(b, a[0], a[1], c[0], c[1], shot.enemy ? HW.lightMagenta : HW.yellow);
    }
    for (const sp of s.sparks) {
      const a = project(cam, sp.pos);
      if (a) fillRect(b, a[0], a[1], 2, 2, sp.life > 0.3 ? sp.colour : HW.darkGrey);
    }
    this.hud(m, b);
  }

  private hud(m: Machine, b: Uint8Array): void {
    const g = m.glyphs, s = this.state;
    if (!g) return;
    const stage = STAGES[Math.min(s.stage, STAGES.length - 1)];
    drawText(b, g, 16, 10, `SCORE ${String(s.score).padStart(6, '0')}`, 'tmBright');
    drawText(b, g, 16, 28, `STAGE ${s.stage + 1}  ${stage.name}`, 'tmText');
    for (let i = 0; i < s.lives; i++) drawText(b, g, W - 40 - i * 14, 10, '^', 'tmBright');
    // How far through the stage.
    const w = 120, done = Math.min(1, s.distance / stage.length);
    frameRect(b, W - 16 - w, 30, w, 8, 'tmDim');
    fillRect(b, W - 15 - w, 31, (w - 2) * done, 6, 'tmText');
    if (s.safe > 0 && s.lives > 0) frameRect(b, 2, 2, W - 4, H - 4, 'danger');
    const card = (lines: string[]) => lines.forEach((l, i) => drawText(b, g, Math.floor((W - l.length * 16) / 2), 150 + i * 40, l, i ? 'tmText' : 'tmBright', 2));
    if (s.phase === 'stage') card([`STAGE ${s.stage + 1}`, stage.name]);
    if (s.phase === 'clear') card(['STAGE CLEAR', `${String(s.score).padStart(6, '0')}`]);
    if (s.phase === 'six') card(['STAGE 6', '']);
  }
}
