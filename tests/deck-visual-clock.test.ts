import { existsSync } from 'node:fs';
import { expect, it } from 'vitest';

async function clockModule() {
  expect(existsSync('components/portfolio/deck-visual-clock.ts'), 'the scene clock must reconcile current audio intent').toBe(true);
  const path = '../components/portfolio/deck-visual-clock';
  return import(/* @vite-ignore */ path);
}
const running = {
  deltaMs: 0, lit: true, powered: true, exchangeStartedAt: null as number | null,
  title: 'OLD TRACK', still: false, status: 'playing' as const,
};

it('starts without a boot or exchange animation and exposes the current title', async () => {
  const { createDeckVisualClock } = await clockModule();
  expect(createDeckVisualClock('FIRST TRACK')).toEqual({
    boot: 0, exchange: null, exchangeId: null,
    title: 'FIRST TRACK', previousTitle: 'FIRST TRACK', visibleTitle: 'FIRST TRACK',
  });
});

it('warms up once, caps the visible clock and resets warm-up when the glass goes dark', async () => {
  const { createDeckVisualClock, advanceDeckVisualClock: advance } = await clockModule();
  const initial = createDeckVisualClock(running.title);
  const half = advance(initial, { ...running, deltaMs: 250 });
  expect(half.boot).toBe(250);
  expect(advance(half, { ...running, deltaMs: 350 }).boot).toBe(500);
  expect(advance(half, { ...running, lit: false, deltaMs: 30 }).boot).toBe(0);
  expect(initial.boot).toBe(0); // A render must not mutate a previous snapshot.
});

it('uses the old title during contraction and the new title on incoming reveal', async () => {
  const { createDeckVisualClock, advanceDeckVisualClock: advance } = await clockModule();
  const opening = advance(createDeckVisualClock(running.title), { ...running, exchangeStartedAt: 10, status: 'switching', deltaMs: 90 });
  expect(opening).toMatchObject({ exchange: 90, exchangeId: 10, visibleTitle: 'OLD TRACK' });
  const replaced = advance(opening, { ...running, exchangeStartedAt: 10, title: 'NEW TRACK', status: 'switching', deltaMs: 550 });
  expect(replaced).toMatchObject({ exchange: 640, title: 'NEW TRACK', previousTitle: 'OLD TRACK', visibleTitle: 'OLD TRACK' });
  const entering = advance(replaced, { ...running, exchangeStartedAt: 10, title: 'NEW TRACK', status: 'switching', deltaMs: 10 });
  expect(entering).toMatchObject({ exchange: 650, visibleTitle: 'NEW TRACK' });
  expect(advance(entering, { ...running, exchangeStartedAt: 10, title: 'NEW TRACK', deltaMs: 600 }).exchange).toBe(1050);
});

it('shows the current track immediately during a static paused track change', async () => {
  const { createDeckVisualClock, advanceDeckVisualClock: advance } = await clockModule();
  const start = advance(createDeckVisualClock(running.title), { ...running, exchangeStartedAt: 20, still: true, status: 'switching' });
  const next = advance(start, { ...running, exchangeStartedAt: 20, title: 'NEW TRACK', still: true, status: 'switching' });
  expect(next).toMatchObject({ boot: 500, exchange: 1050, exchangeId: 20, visibleTitle: 'NEW TRACK' });
  const paused = advance(next, { ...running, title: 'NEW TRACK', still: true, status: 'paused' });
  expect(paused.visibleTitle).toBe('NEW TRACK');
});

it('does not replay a settled exchange when motion is enabled again', async () => {
  const { createDeckVisualClock, advanceDeckVisualClock: advance } = await clockModule();
  const moving = advance(createDeckVisualClock(running.title), { ...running, exchangeStartedAt: 30, status: 'switching', deltaMs: 90 });
  const stopped = advance(moving, { ...running, exchangeStartedAt: 30, title: 'NEW TRACK', still: true, status: 'switching' });
  const resumed = advance(stopped, { ...running, exchangeStartedAt: 30, title: 'NEW TRACK', deltaMs: 16 });
  expect(resumed).toMatchObject({ boot: 500, exchange: 1050, exchangeId: 30, visibleTitle: 'NEW TRACK' });
});

it('reconciles to the current title when the audio exchange finished offscreen', async () => {
  const { createDeckVisualClock, advanceDeckVisualClock: advance } = await clockModule();
  const beforeLeaving = advance(createDeckVisualClock(running.title), { ...running, exchangeStartedAt: 40, status: 'switching', deltaMs: 90 });
  const returned = advance(beforeLeaving, { ...running, title: 'NEW TRACK', deltaMs: 16 });
  expect(returned).toMatchObject({ exchange: 1050, exchangeId: 40, visibleTitle: 'NEW TRACK' });
});

it('captures the last actual track as the old title for the next distinct exchange', async () => {
  const { createDeckVisualClock, advanceDeckVisualClock: advance } = await clockModule();
  const first = advance(createDeckVisualClock(running.title), { ...running, exchangeStartedAt: 50, still: true });
  const completed = advance(first, { ...running, title: 'SECOND TRACK' });
  const second = advance(completed, { ...running, exchangeStartedAt: 60, title: 'SECOND TRACK', status: 'switching', deltaMs: 20 });
  expect(second).toMatchObject({ exchange: 20, exchangeId: 60, previousTitle: 'SECOND TRACK', visibleTitle: 'SECOND TRACK' });
});

it('clears an obsolete exchange on error and on power off', async () => {
  const { createDeckVisualClock, advanceDeckVisualClock: advance } = await clockModule();
  const exchanging = advance(createDeckVisualClock(running.title), { ...running, exchangeStartedAt: 70, status: 'switching', deltaMs: 90 });
  const error = advance(exchanging, { ...running, exchangeStartedAt: 70, title: 'FAILED TRACK', status: 'error' });
  expect(error).toMatchObject({ exchange: null, exchangeId: null, visibleTitle: 'FAILED TRACK' });
  const off = advance(exchanging, { ...running, exchangeStartedAt: 70, title: 'CURRENT TRACK', powered: false, status: 'paused' });
  expect(off).toMatchObject({ boot: 0, exchange: null, exchangeId: null, visibleTitle: 'CURRENT TRACK' });
});
