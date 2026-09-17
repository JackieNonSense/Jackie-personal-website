import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function implementation() {
  const path = resolve('components/terminal/echo-programs.ts');
  expect(existsSync(path), 'pure ECHO programs implementation exists').toBe(true);
  return import(/* @vite-ignore */ path);
}

describe('program lifecycle', () => {
  it.each(['survivor', 'packet', 'mirror'])('%s cannot advance behind instructions or pause', async id => {
    const { newProgram, programAction, tickProgram } = await implementation();
    const ready = newProgram(id, 777);
    expect(tickProgram(ready, 1)).toEqual(ready);
    let state = programAction(ready, { type: 'start' });
    state = programAction(state, { type: 'key', key: 'd', down: true });
    state = programAction(state, { type: 'pause' });
    expect(state.keys).toEqual([]);
    expect(tickProgram(state, 1)).toEqual(state);
    expect(programAction(state, { type: 'resume' }).status).toBe('playing');
  });

  it('keeps simulation states serializable and leaves its input untouched', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    const before = programAction(newProgram('survivor', 777), { type: 'start' });
    const saved = JSON.stringify(before);
    const after = tickProgram(before, 0.1);
    expect(JSON.stringify(before)).toBe(saved);
    expect(JSON.parse(JSON.stringify(after))).toEqual(after);
  });
});

describe('SURVIVOR physics', () => {
  it('can jump from the ground onto the original first platform', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    let state = programAction(newProgram('survivor'), { type: 'start' });
    state = programAction(state, { type: 'key', key: 'w', down: true });
    state = tickProgram(tickProgram(state, 0.25), 0.2);
    expect(state.survivor.player.y + 20).toBeLessThan(250);
    state = tickProgram(tickProgram(state, 0.25), 0.2);
    expect(state.survivor.player.y).toBe(230);
    expect(state.survivor.player.grounded).toBe(true);
  });

  it('lands on a crossed platform at low frame rate instead of tunnelling through it', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    const state = programAction(newProgram('survivor'), { type: 'start' });
    Object.assign(state.survivor.player, { x: 100, y: 205, vy: 700, grounded: false });
    state.survivor.spawnTimer = 5;
    const after = tickProgram(state, 0.2);
    expect(after.survivor.player.y).toBe(230);
    expect(after.survivor.player.grounded).toBe(true);
  });

  it('always catches the floor even after a long frame', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    const state = programAction(newProgram('survivor'), { type: 'start' });
    Object.assign(state.survivor.player, { x: 230, y: 295, vy: 900, grounded: false });
    expect(tickProgram(state, 0.5).survivor.player.y).toBe(300);
  });

  it('uses the same fixed simulation steps for different render rates', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    const state = programAction(programAction(newProgram('survivor', 15), { type: 'start' }), { type: 'key', key: 'd', down: true });
    const a = tickProgram(state, 1 / 15);
    const b = tickProgram(tickProgram(state, 1 / 30), 1 / 30);
    expect(a.survivor).toEqual(b.survivor);
  });

  it('shoots an enemy and awards points once', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    let state = programAction(newProgram('survivor'), { type: 'start' });
    Object.assign(state.survivor.player, { x: 100, y: 300, facing: 1 });
    state.survivor.enemies = [{ x: 157, y: 300, direction: -1, speed: 20, type: 0 }];
    state.survivor.spawnTimer = 5;
    state = programAction(state, { type: 'key', key: 'j', down: true });
    state = tickProgram(state, 0.2);
    expect(state.score).toBe(100);
    expect(state.survivor.enemies).toHaveLength(0);
    expect(tickProgram(state, 0.2).score).toBe(100);
  });

  it('ends when an enemy touches the player and permits a clean restart', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    let state = programAction(newProgram('survivor'), { type: 'start' });
    state.survivor.enemies = [{ x: state.survivor.player.x + 3, y: 300, direction: -1, speed: 20, type: 0 }];
    state = tickProgram(state, 0.02);
    expect(state.status).toBe('result');
    expect(state.won).toBe(false);
    state = programAction(state, { type: 'retry' });
    expect(state.status).toBe('playing');
    expect(state.survivor.enemies).toHaveLength(0);
  });

  it('spawns the same enemies for the same seed', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    let a = programAction(newProgram('survivor', 23), { type: 'start' });
    let b = programAction(newProgram('survivor', 23), { type: 'start' });
    for (let i = 0; i < 12; i++) { a = tickProgram(a, 0.25); b = tickProgram(b, 0.25); }
    expect(a.survivor.enemies.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });
});

describe('PACKET RUN', () => {
  it('grows when collecting a packet and spawns the next packet outside the snake', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    let state = programAction(newProgram('packet', 9), { type: 'start' });
    state.packet.food = { x: 6, y: 7 };
    state = tickProgram(state, 0.25);
    expect(state.score).toBe(10);
    expect(state.packet.snake).toHaveLength(4);
    expect(state.packet.snake).not.toContainEqual(state.packet.food);
  });

  it('rejects reversing direction and buffers no more than one turn per step', async () => {
    const { newProgram, programAction } = await implementation();
    let state = programAction(newProgram('packet'), { type: 'start' });
    state = programAction(state, { type: 'key', key: 'ArrowLeft', down: true });
    expect(state.packet.nextDirection).toEqual({ x: 1, y: 0 });
    state = programAction(state, { type: 'key', key: 'ArrowUp', down: true });
    state = programAction(state, { type: 'key', key: 'ArrowLeft', down: true });
    expect(state.packet.nextDirection).toEqual({ x: 0, y: -1 });
  });

  it('ends at the grid edge', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    const state = programAction(newProgram('packet'), { type: 'start' });
    state.packet.snake = [{ x: 19, y: 7 }, { x: 18, y: 7 }, { x: 17, y: 7 }];
    expect(tickProgram(state, 0.25).status).toBe('result');
  });

  it('detects self collision, but allows a move into the departing tail', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    let state = programAction(newProgram('packet'), { type: 'start' });
    state.packet.snake = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }];
    state = programAction(state, { type: 'key', key: 'ArrowUp', down: true });
    expect(tickProgram(state, 0.25).status).toBe('result');
    state = programAction(newProgram('packet'), { type: 'start' });
    state.packet.snake = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 3 }];
    state.packet.direction = { x: 0, y: -1 };
    state = programAction(state, { type: 'key', key: 'ArrowLeft', down: true });
    expect(tickProgram(state, 0.25).status).toBe('playing');
  });

  it('caps speed at a playable 90ms interval', async () => {
    const { packetMoveInterval } = await implementation();
    expect(packetMoveInterval(0)).toBeGreaterThan(packetMoveInterval(100));
    expect(packetMoveInterval(10000)).toBe(0.09);
  });
});

describe('MIRROR TEST', () => {
  it('does not accept input during the sequence preview', async () => {
    const { newProgram, programAction } = await implementation();
    const state = programAction(newProgram('mirror'), { type: 'start' });
    const after = programAction(state, { type: 'pad', index: state.mirror.sequence[0] });
    expect(after.mirror.inputIndex).toBe(0);
    expect(after.mirror.phase).toBe('preview');
  });

  it('retries the failed round with the same sequence', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    let state = programAction(newProgram('mirror', 81), { type: 'start' });
    while (state.mirror.phase === 'preview') state = tickProgram(state, 0.25);
    const sequence = [...state.mirror.sequence];
    state = programAction(state, { type: 'pad', index: (sequence[0] + 1) % 9 });
    expect(state.status).toBe('result');
    expect(state.won).toBe(false);
    state = programAction(state, { type: 'retry' });
    expect(state.mirror.round).toBe(1);
    expect(state.mirror.sequence).toEqual(sequence);
    expect(state.mirror.phase).toBe('preview');
  });

  it('completes five rounds of increasing length and records a successful result', async () => {
    const { newProgram, programAction, tickProgram } = await implementation();
    let state = programAction(newProgram('mirror', 777), { type: 'start' });
    for (let round = 1; round <= 5; round++) {
      expect(state.mirror.round).toBe(round);
      expect(state.mirror.sequence).toHaveLength(round + 2);
      while (state.mirror.phase === 'preview') state = tickProgram(state, 0.25);
      for (const index of [...state.mirror.sequence]) state = programAction(state, { type: 'pad', index });
    }
    expect(state.status).toBe('result');
    expect(state.won).toBe(true);
    expect(state.score).toBe(250);
    expect(state.message).toContain('ECHO');
  });

  it('maps visible pad centers and rejects grid gaps and outside clicks', async () => {
    const { mirrorPadAt, mirrorPadRects } = await implementation();
    const rect = { x: 100, y: 100, width: 600, height: 400 };
    const pads = mirrorPadRects(rect);
    pads.forEach((pad: { x: number; y: number; width: number; height: number }, index: number) => {
      expect(mirrorPadAt(pad.x + pad.width / 2, pad.y + pad.height / 2, rect)).toBe(index);
    });
    expect(mirrorPadAt(0, 0, rect)).toBeNull();
    expect(mirrorPadAt(pads[0].x + pads[0].width + 1, pads[0].y + 5, rect)).toBeNull();
  });
});

describe('local scores', () => {
  it('only records results, keeps personal bests, and sanitizes damaged saves', async () => {
    const { newProgram, updateScores, restoreScores } = await implementation();
    const empty = restoreScores('broken json');
    expect(empty).toEqual({ survivor: 0, packet: 0, mirror: 0 });
    const state = newProgram('survivor');
    state.score = 300;
    expect(updateScores(empty, state)).toEqual(empty);
    state.status = 'result';
    expect(updateScores(empty, state).survivor).toBe(300);
    expect(updateScores({ ...empty, survivor: 400 }, state).survivor).toBe(400);
    expect(restoreScores('{"survivor":-7,"packet":null,"mirror":250}')).toEqual({ survivor: 0, packet: 0, mirror: 250 });
  });
});
