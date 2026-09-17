/** Deterministic, serializable programs. Times are seconds; no browser input globals. */
export type ProgramId = 'survivor' | 'packet' | 'mirror';
export type ProgramStatus = 'ready' | 'playing' | 'paused' | 'result';
export type ProgramRect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type Enemy = Point & { direction: number; speed: number; type: number };
type Bullet = Point & { direction: number };

export interface ProgramState {
  id: ProgramId;
  status: ProgramStatus;
  score: number;
  won: boolean;
  message: string;
  seed: number;
  rng: number;
  elapsed: number;
  accumulator: number;
  keys: string[];
  survivor: {
    player: Point & { vy: number; grounded: boolean; facing: number };
    bullets: Bullet[];
    enemies: Enemy[];
    spawnTimer: number;
    shootCooldown: number;
    jumpRequested: boolean;
  };
  packet: {
    snake: Point[];
    direction: Point;
    nextDirection: Point;
    food: Point;
    moveTimer: number;
    turnQueued: boolean;
  };
  mirror: {
    round: number;
    sequence: number[];
    inputIndex: number;
    phase: 'preview' | 'input' | 'error' | 'complete';
    phaseTime: number;
    activePad: number | null;
    feedbackTime: number;
  };
}

export type ProgramAction =
  | { type: 'start' | 'pause' | 'resume' | 'retry' }
  | { type: 'key'; key: string; down: boolean }
  | { type: 'pad'; index: number };

export const PROGRAMS: { id: ProgramId; title: string; description: string; instructions: string[] }[] = [
  { id: 'survivor', title: 'SURVIVOR', description: 'JR recreation suite / last operator standing', instructions: ['A / D or arrows: move', 'W / UP / SPACE: jump', 'J: fire / hold for continuous fire', 'Avoid contact. Each target: 100 points.'] },
  { id: 'packet', title: 'PACKET RUN', description: 'Network training / lossless transmission', instructions: ['WASD or arrows: route the packet train', 'Collect + packets to extend the route', 'Do not touch the boundary or your trail', 'Each packet: 10 points. Speed increases.'] },
  { id: 'mirror', title: 'MIRROR TEST', description: 'Neural response / pattern retention', instructions: ['Watch the illuminated pad sequence', 'Repeat it using pads or keys 1 through 9', 'Five rounds. Each adds one signal', 'Errors replay the current round. No timer.'] },
];

export const SURVIVOR_PLATFORMS = [
  { x: 0, y: 320, w: 512 },
  { x: 80, y: 250, w: 100 },
  { x: 250, y: 200, w: 80 },
  { x: 380, y: 260, w: 90 },
  { x: 150, y: 150, w: 70 },
];

const PLAYER_SPRITE = ['  ##  ', ' #### ', '######', ' #  # ', '  ##  ', ' #### ', '##  ##', '# ## #', '  ##  ', ' #  # '];
const ENEMY_SPRITE = [' #### ', '######', '# ## #', '######', ' #### ', ' #  # '];
const STEP = 1 / 120;
const GRID_W = 20;
const GRID_H = 14;

function random(state: ProgramState): number {
  let x = state.rng;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.rng = x >>> 0;
  return state.rng / 4294967296;
}

function sequence(state: ProgramState, length: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < length; i++) {
    let value = Math.floor(random(state) * 9);
    if (value === values[i - 1]) value = (value + 1 + Math.floor(random(state) * 8)) % 9;
    values.push(value);
  }
  return values;
}

function placeFood(state: ProgramState): void {
  const free: Point[] = [];
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    if (!state.packet.snake.some(p => p.x === x && p.y === y)) free.push({ x, y });
  }
  if (!free.length) {
    state.status = 'result'; state.won = true; state.message = 'ALL PACKETS DELIVERED. ZERO LOSS.';
  } else state.packet.food = free[Math.floor(random(state) * free.length)];
}

export function newProgram(id: ProgramId, seed = 777): ProgramState {
  const normalizedSeed = (Number.isFinite(seed) ? seed >>> 0 : 777) || 777;
  const state: ProgramState = {
    id, status: 'ready', score: 0, won: false, message: 'PROGRAM LOADED. AWAITING OPERATOR.',
    seed: normalizedSeed, rng: normalizedSeed, elapsed: 0, accumulator: 0, keys: [],
    survivor: {
      player: { x: 100, y: 300, vy: 0, grounded: true, facing: 1 },
      bullets: [], enemies: [], spawnTimer: 1.5, shootCooldown: 0, jumpRequested: false,
    },
    packet: {
      snake: [{ x: 5, y: 7 }, { x: 4, y: 7 }, { x: 3, y: 7 }],
      direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 },
      food: { x: 13, y: 7 }, moveTimer: 0, turnQueued: false,
    },
    mirror: { round: 1, sequence: [], inputIndex: 0, phase: 'preview', phaseTime: 0, activePad: null, feedbackTime: 0 },
  };
  if (id === 'mirror') state.mirror.sequence = sequence(state, 3);
  if (id === 'packet') placeFood(state);
  return state;
}

function copyState(state: ProgramState): ProgramState {
  return {
    ...state, keys: [...state.keys],
    survivor: { ...state.survivor, player: { ...state.survivor.player }, bullets: state.survivor.bullets.map(b => ({ ...b })), enemies: state.survivor.enemies.map(e => ({ ...e })) },
    packet: { ...state.packet, snake: state.packet.snake.map(p => ({ ...p })), direction: { ...state.packet.direction }, nextDirection: { ...state.packet.nextDirection }, food: { ...state.packet.food } },
    mirror: { ...state.mirror, sequence: [...state.mirror.sequence] },
  };
}

function keyName(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowleft') return 'a';
  if (normalized === 'arrowright') return 'd';
  if (normalized === 'arrowup') return 'w';
  if (normalized === 'arrowdown') return 's';
  if (normalized === 'space' || normalized === 'spacebar') return ' ';
  return normalized;
}

function pressPad(state: ProgramState, index: number): void {
  const mirror = state.mirror;
  if (state.id !== 'mirror' || mirror.phase !== 'input' || !Number.isInteger(index) || index < 0 || index > 8) return;
  mirror.activePad = index; mirror.feedbackTime = 0.24;
  if (mirror.sequence[mirror.inputIndex] !== index) {
    mirror.phase = 'error'; state.status = 'result'; state.keys = [];
    state.message = `PATTERN MISMATCH. ROUND ${mirror.round} RETAINED. RETRY TO REVIEW.`;
    return;
  }
  mirror.inputIndex++;
  if (mirror.inputIndex < mirror.sequence.length) return;
  state.score += mirror.sequence.length * 10;
  if (mirror.round === 5) {
    mirror.phase = 'complete'; state.status = 'result'; state.won = true; state.keys = [];
    state.message = 'ECHO RESPONSE: I REMEMBER YOUR HAND BEFORE YOU MOVE IT.';
  } else {
    mirror.round++;
    mirror.sequence = sequence(state, mirror.round + 2);
    mirror.inputIndex = 0; mirror.phase = 'preview'; mirror.phaseTime = 0; mirror.activePad = null;
    state.message = `ROUND ${mirror.round} / 5. OBSERVE THE SIGNAL.`;
  }
}

export function programAction(state: ProgramState, action: ProgramAction): ProgramState {
  if (action.type === 'start') {
    const fresh = newProgram(state.id, state.seed);
    fresh.status = 'playing'; fresh.message = state.id === 'mirror' ? 'ROUND 1 / 5. OBSERVE THE SIGNAL.' : 'SESSION ACTIVE.';
    return fresh;
  }
  if (action.type === 'retry') {
    if (state.id === 'mirror' && state.status === 'result' && !state.won) {
      return { ...state, keys: [], status: 'playing', message: `REPLAYING ROUND ${state.mirror.round}.`, mirror: { ...state.mirror, inputIndex: 0, phase: 'preview', phaseTime: 0, activePad: null, feedbackTime: 0 } };
    }
    return programAction(state, { type: 'start' });
  }
  if (action.type === 'pause') {
    if (state.status !== 'playing') return state;
    return { ...state, status: 'paused', keys: [], survivor: { ...state.survivor, jumpRequested: false } };
  }
  if (action.type === 'resume') return state.status === 'paused' ? { ...state, status: 'playing', keys: [] } : state;
  if (action.type === 'key') {
    const key = keyName(action.key);
    if (!action.down) return state.keys.includes(key) ? { ...state, keys: state.keys.filter(k => k !== key) } : state;
    if (state.keys.includes(key)) return state;
    if (key === 'p') return programAction(state, { type: state.status === 'paused' ? 'resume' : 'pause' });
    if (key === 'enter') {
      if (state.status === 'ready') return programAction(state, { type: 'start' });
      if (state.status === 'paused') return programAction(state, { type: 'resume' });
      if (state.status === 'result') return programAction(state, { type: 'retry' });
    }
    if (key === 'r' && state.status === 'result') return programAction(state, { type: 'retry' });
    if (state.status !== 'playing') return state;
    const next = copyState(state);
    next.keys.push(key);
    if (next.id === 'survivor' && (key === 'w' || key === ' ')) next.survivor.jumpRequested = true;
    if (next.id === 'packet' && !next.packet.turnQueued) {
      const dir = ({ w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } } as Record<string, Point>)[key];
      if (dir && dir.x * next.packet.direction.x + dir.y * next.packet.direction.y === 0) {
        next.packet.nextDirection = dir; next.packet.turnQueued = true;
      }
    }
    if (next.id === 'mirror' && /^[1-9]$/.test(key)) pressPad(next, Number(key) - 1);
    return next;
  }
  if (action.type === 'pad' && state.status === 'playing') {
    const next = copyState(state); pressPad(next, action.index); return next;
  }
  return state;
}

function survivorStep(state: ProgramState): void {
  const game = state.survivor;
  const player = game.player;
  const movement = (state.keys.includes('d') ? 1 : 0) - (state.keys.includes('a') ? 1 : 0);
  player.x = Math.max(0, Math.min(500, player.x + movement * 132 * STEP));
  if (movement) player.facing = movement;
  if (game.jumpRequested && player.grounded) { player.vy = -345; player.grounded = false; }
  game.jumpRequested = false;
  const oldBottom = player.y + 20;
  player.vy += 750 * STEP;
  const nextY = player.y + player.vy * STEP;
  const nextBottom = nextY + 20;
  player.grounded = false;
  let landingY = Infinity;
  if (player.vy >= 0) for (const platform of SURVIVOR_PLATFORMS) {
    // Swept feet: find the first surface crossed, rather than a narrow tolerance band.
    if (player.x + 12 > platform.x && player.x < platform.x + platform.w && oldBottom <= platform.y + 0.001 && nextBottom >= platform.y) landingY = Math.min(landingY, platform.y);
  }
  if (Number.isFinite(landingY)) { player.y = landingY - 20; player.vy = 0; player.grounded = true; }
  else player.y = nextY;
  if (player.y >= 300) { player.y = 300; player.vy = 0; player.grounded = true; }

  game.shootCooldown -= STEP;
  if (state.keys.includes('j') && game.shootCooldown <= 0) {
    game.bullets.push({ x: player.x + (player.facing > 0 ? 12 : -4), y: player.y + 8, direction: player.facing });
    game.shootCooldown = 0.19;
  }
  game.spawnTimer -= STEP;
  if (game.spawnTimer <= 0) {
    const fromLeft = random(state) < 0.5;
    const type = random(state) > 0.74 ? 1 : 0;
    game.enemies.push({ x: fromLeft ? -15 : 515, y: type ? 228 : 300, direction: fromLeft ? 1 : -1, speed: 27 + random(state) * 20 + Math.min(28, state.score / 200), type });
    game.spawnTimer = Math.max(0.75, 2.15 - state.score / 3000) + random(state) * 0.65;
  }
  for (const enemy of game.enemies) enemy.x += enemy.direction * enemy.speed * STEP;
  const survivingBullets: Bullet[] = [];
  const removed = new Set<Enemy>();
  for (const bullet of game.bullets) {
    const oldX = bullet.x;
    bullet.x += bullet.direction * 320 * STEP;
    const hit = game.enemies.find(enemy => !removed.has(enemy) && Math.max(oldX, bullet.x) + 6 >= enemy.x && Math.min(oldX, bullet.x) <= enemy.x + 12 && bullet.y + 2 >= enemy.y && bullet.y <= enemy.y + 14);
    if (hit) { removed.add(hit); state.score += 100; }
    else if (bullet.x > -10 && bullet.x < 522) survivingBullets.push(bullet);
  }
  game.bullets = survivingBullets;
  game.enemies = game.enemies.filter(enemy => !removed.has(enemy) && enemy.x > -25 && enemy.x < 540);
  if (game.enemies.some(enemy => player.x + 10 > enemy.x + 1 && player.x + 2 < enemy.x + 11 && player.y + 19 > enemy.y + 1 && player.y + 1 < enemy.y + 13)) {
    state.status = 'result'; state.keys = []; state.message = 'OPERATOR LOST. TRAINING SESSION ARCHIVED.';
  }
}

export function packetMoveInterval(score: number): number {
  return Math.max(0.09, 0.24 - Math.floor(Math.max(0, score) / 30) * 0.012);
}

function packetStep(state: ProgramState, dt: number): void {
  const game = state.packet;
  game.moveTimer += dt;
  while (state.status === 'playing' && game.moveTimer + 1e-9 >= packetMoveInterval(state.score)) {
    game.moveTimer -= packetMoveInterval(state.score);
    game.direction = { ...game.nextDirection }; game.turnQueued = false;
    const head = { x: game.snake[0].x + game.direction.x, y: game.snake[0].y + game.direction.y };
    const ate = head.x === game.food.x && head.y === game.food.y;
    const body = ate ? game.snake : game.snake.slice(0, -1);
    if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H || body.some(p => p.x === head.x && p.y === head.y)) {
      state.status = 'result'; state.keys = []; state.message = 'PACKET COLLISION. TRANSMISSION HALTED.'; return;
    }
    game.snake.unshift(head);
    if (ate) { state.score += 10; placeFood(state); }
    else game.snake.pop();
  }
}

function mirrorStep(state: ProgramState, dt: number): void {
  const game = state.mirror;
  game.phaseTime += dt;
  if (game.phase === 'preview') {
    const position = (game.phaseTime - 0.65) / 0.7;
    if (position >= game.sequence.length) {
      game.phase = 'input'; game.activePad = null; game.phaseTime = 0;
      state.message = `YOUR TURN. ${game.sequence.length} SIGNALS. NO TIME LIMIT.`;
    } else game.activePad = position >= 0 && position % 1 < 0.64 ? game.sequence[Math.floor(position)] : null;
  } else if (game.phase === 'input') {
    game.feedbackTime = Math.max(0, game.feedbackTime - dt);
    if (game.feedbackTime === 0) game.activePad = null;
  }
}

/** Clamps suspension gaps; physics still uses fixed steps at low render rates. */
export function tickProgram(state: ProgramState, dt: number): ProgramState {
  if (state.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return state;
  const next = copyState(state);
  const elapsed = Math.min(dt, 0.25);
  next.elapsed += elapsed;
  if (state.id === 'survivor') {
    next.accumulator += elapsed;
    while (next.accumulator + 1e-9 >= STEP && next.status === 'playing') {
      survivorStep(next); next.accumulator = Math.max(0, next.accumulator - STEP);
    }
  } else if (state.id === 'packet') packetStep(next, elapsed);
  else mirrorStep(next, elapsed);
  return next;
}

export function mirrorPadRects(rect: ProgramRect): ProgramRect[] {
  const size = Math.max(30, Math.min(rect.width * 0.76, rect.height - 110));
  const gap = size * 0.045;
  const side = (size - gap * 2) / 3;
  const left = rect.x + (rect.width - size) / 2;
  const top = rect.y + 55 + Math.max(0, (rect.height - 110 - size) / 2);
  return Array.from({ length: 9 }, (_, i) => ({ x: left + (i % 3) * (side + gap), y: top + Math.floor(i / 3) * (side + gap), width: side, height: side }));
}

export function mirrorPadAt(x: number, y: number, rect: ProgramRect): number | null {
  const index = mirrorPadRects(rect).findIndex(p => x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height);
  return index < 0 ? null : index;
}

export type ProgramScores = Record<ProgramId, number>;
export function restoreScores(raw: string | null): ProgramScores {
  const output: ProgramScores = { survivor: 0, packet: 0, mirror: 0 };
  try {
    const value = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object') return output;
    for (const id of Object.keys(output) as ProgramId[]) {
      if (typeof value[id] === 'number' && Number.isFinite(value[id]) && value[id] >= 0) output[id] = Math.min(99999999, Math.floor(value[id]));
    }
  } catch { /* A damaged or unavailable local save starts with empty scores. */ }
  return output;
}

export function updateScores(scores: ProgramScores, state: ProgramState): ProgramScores {
  if (state.status !== 'result' || !Number.isFinite(state.score)) return scores;
  return { ...scores, [state.id]: Math.max(scores[state.id] ?? 0, Math.min(99999999, Math.max(0, Math.floor(state.score)))) };
}

const INK = '#b9f5e8';
const MID = '#69a79c';
const DIM = '#264840';
const BACK = '#031210';

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 15, color = INK): void {
  ctx.font = `${size}px "Courier New", monospace`; ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, color: string, flipped = false): void {
  ctx.fillStyle = color;
  rows.forEach((row, dy) => [...row].forEach((pixel, dx) => {
    if (pixel !== ' ') ctx.fillRect(x + (flipped ? row.length - dx - 1 : dx) * 2, y + dy * 2, 2, 2);
  }));
}

function drawSurvivor(ctx: CanvasRenderingContext2D, state: ProgramState, rect: ProgramRect, time: number): void {
  const scale = Math.min(rect.width / 512, (rect.height - 65) / 340);
  const left = rect.x + (rect.width - 512 * scale) / 2;
  const top = rect.y + 42;
  ctx.save(); ctx.translate(left, top); ctx.scale(scale, scale);
  ctx.strokeStyle = '#12312a'; ctx.lineWidth = 0.7;
  for (let i = 0; i < 18; i++) {
    const height = 36 + (i * 37 % 110);
    ctx.strokeRect(i * 31 - 4, 320 - height, 25, height);
    ctx.fillStyle = '#18342f';
    for (let w = 0; w < 3; w++) for (let y = 0; y < 5; y++) if ((i + w + y) % 3 === 0) ctx.fillRect(i * 31 + w * 6, 325 - height + y * 13, 2, 4);
  }
  label(ctx, 'JR // LAB 7 RECREATION NETWORK', 13, 24, 9, DIM);
  label(ctx, 'NO EXTERNAL CONNECTION', 13, 39, 7, DIM);
  SURVIVOR_PLATFORMS.forEach((platform, index) => {
    ctx.fillStyle = index ? '#346156' : '#4a7c6e'; ctx.fillRect(platform.x, platform.y, platform.w, 2);
    ctx.fillStyle = '#16352d'; ctx.fillRect(platform.x, platform.y + 2, platform.w, index ? 7 : 13);
    if (index) for (let x = platform.x + 3; x < platform.x + platform.w; x += 9) ctx.fillRect(x, platform.y + 9, 2, 4);
  });
  sprite(ctx, PLAYER_SPRITE, state.survivor.player.x, state.survivor.player.y, INK, state.survivor.player.facing < 0);
  state.survivor.enemies.forEach(enemy => sprite(ctx, ENEMY_SPRITE, enemy.x, enemy.y, enemy.type ? '#e0b88b' : '#84bbae', enemy.direction < 0));
  ctx.fillStyle = '#e4fff6'; state.survivor.bullets.forEach(b => ctx.fillRect(b.x, b.y, 6, 2));
  if (state.score >= 500) label(ctx, Math.floor(time) % 2 ? 'WE ARE STILL HERE' : 'JR RECREATION SUITE', 342, 50, 8, MID);
  ctx.restore();
}

function drawPacket(ctx: CanvasRenderingContext2D, state: ProgramState, rect: ProgramRect): void {
  const cell = Math.min((rect.width - 30) / GRID_W, (rect.height - 90) / GRID_H);
  const left = rect.x + (rect.width - cell * GRID_W) / 2;
  const top = rect.y + 47;
  ctx.strokeStyle = DIM; ctx.strokeRect(left - 3, top - 3, cell * GRID_W + 6, cell * GRID_H + 6);
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    ctx.fillStyle = '#18332c'; ctx.fillRect(left + x * cell + cell / 2, top + y * cell + cell / 2, 1, 1);
  }
  state.packet.snake.forEach((point, index) => {
    ctx.fillStyle = index === 0 ? INK : '#508b79';
    ctx.fillRect(left + point.x * cell + 2, top + point.y * cell + 2, cell - 4, cell - 4);
    if (index === 0) {
      ctx.fillStyle = '#12312a';
      const eye = Math.max(2, cell / 7); ctx.fillRect(left + point.x * cell + cell / 2 - eye / 2, top + point.y * cell + cell / 2 - eye / 2, eye, eye);
    }
  });
  const food = state.packet.food;
  const fx = left + (food.x + 0.5) * cell, fy = top + (food.y + 0.5) * cell;
  ctx.fillStyle = '#e3c49b'; ctx.fillRect(fx - 2, fy - cell * 0.28, 4, cell * 0.56); ctx.fillRect(fx - cell * 0.28, fy - 2, cell * 0.56, 4);
  label(ctx, `${String(state.score / 10).padStart(3, '0')} PACKETS  /  ${Math.round(1000 * packetMoveInterval(state.score))}ms CLOCK`, left, top + GRID_H * cell + 25, 12, MID);
}

function drawMirror(ctx: CanvasRenderingContext2D, state: ProgramState, rect: ProgramRect): void {
  const game = state.mirror;
  const pads = mirrorPadRects(rect);
  label(ctx, `ROUND 0${game.round} / 05`, rect.x + 16, rect.y + 33, 13, MID);
  const phaseLabel = game.phase === 'preview' ? 'OBSERVE' : game.phase === 'input' ? `REPEAT  ${game.inputIndex}/${game.sequence.length}` : game.phase === 'complete' ? 'SYNCHRONIZED' : 'MISMATCH';
  ctx.textAlign = 'right'; label(ctx, phaseLabel, rect.x + rect.width - 16, rect.y + 33, 13, INK); ctx.textAlign = 'left';
  pads.forEach((pad, index) => {
    const lit = game.activePad === index;
    ctx.fillStyle = lit ? '#9edccb' : '#071f18'; ctx.fillRect(pad.x, pad.y, pad.width, pad.height);
    ctx.strokeStyle = lit ? '#defded' : '#376557'; ctx.strokeRect(pad.x, pad.y, pad.width, pad.height);
    const corner = pad.width * 0.15;
    ctx.strokeStyle = lit ? '#1d4c3e' : '#6c9c88';
    ctx.beginPath(); ctx.moveTo(pad.x, pad.y + corner); ctx.lineTo(pad.x, pad.y); ctx.lineTo(pad.x + corner, pad.y); ctx.stroke();
    ctx.textAlign = 'center';
    label(ctx, String(index + 1).padStart(2, '0'), pad.x + pad.width / 2, pad.y + pad.height / 2 + 8, Math.max(20, pad.height * 0.29), lit ? '#092c22' : '#749f8c');
    ctx.textAlign = 'left';
  });
  const dotsWidth = game.sequence.length * 17;
  for (let i = 0; i < game.sequence.length; i++) {
    ctx.fillStyle = i < game.inputIndex ? INK : DIM;
    ctx.fillRect(rect.x + (rect.width - dotsWidth) / 2 + i * 17, rect.y + rect.height - 27, 9, 5);
  }
}

/** Draws inside the supplied workspace; glass and postprocessing are owned by the terminal. */
export function drawProgram(ctx: CanvasRenderingContext2D, state: ProgramState, rect: ProgramRect, time: number): void {
  if (rect.width <= 0 || rect.height <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.width, rect.height); ctx.clip();
  ctx.fillStyle = BACK; ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.shadowBlur = 0;
  if (state.id === 'survivor') drawSurvivor(ctx, state, rect, time);
  else if (state.id === 'packet') drawPacket(ctx, state, rect);
  else drawMirror(ctx, state, rect);
  if (state.id !== 'mirror') label(ctx, `SCORE ${String(state.score).padStart(6, '0')}`, rect.x + 16, rect.y + 27, 15, INK);
  if (state.status !== 'playing') {
    ctx.fillStyle = 'rgba(2, 13, 10, 0.94)'; ctx.fillRect(rect.x + 8, rect.y + 55, rect.width - 16, rect.height - 75);
    const program = PROGRAMS.find(p => p.id === state.id)!;
    const title = state.status === 'ready' ? program.title : state.status === 'paused' ? 'SESSION PAUSED' : state.won ? 'PROGRAM COMPLETE' : 'SESSION ENDED';
    const x = rect.x + 30;
    const lineHeight = Math.min(27, Math.max(18, (rect.height - 180) / 7));
    let y = rect.y + Math.max(86, rect.height * 0.24);
    label(ctx, title, x, y, Math.min(29, rect.width / 18)); y += lineHeight * 1.4;
    label(ctx, `${program.title} / JR INDUSTRIES 1981`, x, y, 12, MID); y += lineHeight * 1.6;
    if (state.status === 'ready') {
      for (const instruction of program.instructions) { label(ctx, instruction, x, y, Math.min(15, rect.width / 38), MID); y += lineHeight; }
    } else if (state.status === 'paused') {
      label(ctx, 'Simulation stopped. Your session is retained.', x, y, Math.min(15, rect.width / 42), MID); y += lineHeight;
      label(ctx, 'Return when ready.', x, y, 15, MID); y += lineHeight;
    } else {
      label(ctx, `FINAL SCORE  ${String(state.score).padStart(6, '0')}`, x, y, 18, INK); y += lineHeight;
      const words = state.message.split(' '); let line = '';
      for (const word of words) {
        if ((line + word).length > Math.floor((rect.width - 65) / 8)) { label(ctx, line, x, y, 13, MID); y += lineHeight; line = ''; }
        line += word + ' ';
      }
      if (line) { label(ctx, line, x, y, 13, MID); y += lineHeight; }
    }
    y += lineHeight * 0.6;
    label(ctx, state.status === 'ready' ? '[ ENTER / START SESSION ]' : state.status === 'paused' ? '[ ENTER / RESUME ]' : '[ ENTER / RETRY ]', x, Math.min(y, rect.y + rect.height - 30), 15, INK);
  }
  ctx.restore();
}
