import { afterEach, expect, it, vi } from 'vitest';
import { whenUserHasEngaged } from '../components/portfolio/user-engagement';

afterEach(() => vi.unstubAllGlobals());

it('waits for a real gesture, because scrolling never unlocks audio', () => {
  const run = vi.fn();
  whenUserHasEngaged(run);
  // Scrolling and moving the pointer are not user activation in any browser.
  window.dispatchEvent(new Event('scroll'));
  window.dispatchEvent(new Event('mousemove'));
  expect(run).not.toHaveBeenCalled();
  window.dispatchEvent(new Event('pointerdown'));
  expect(run).toHaveBeenCalledTimes(1);
});

it('fires only once, whichever gesture arrives first', () => {
  const run = vi.fn();
  whenUserHasEngaged(run);
  window.dispatchEvent(new Event('keydown'));
  window.dispatchEvent(new Event('pointerdown'));
  window.dispatchEvent(new Event('touchstart'));
  expect(run).toHaveBeenCalledTimes(1);
});

it('runs straight away when the page already carries sticky activation', () => {
  vi.stubGlobal('navigator', { ...navigator, userActivation: { hasBeenActive: true, isActive: false } });
  const run = vi.fn();
  whenUserHasEngaged(run);
  expect(run).toHaveBeenCalledTimes(1);
});

it('can be cancelled, so a deliberate power off is never overridden', () => {
  const run = vi.fn();
  const cancel = whenUserHasEngaged(run);
  cancel();
  window.dispatchEvent(new Event('pointerdown'));
  expect(run).not.toHaveBeenCalled();
});
