import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useLiveReducedMotion } from '../components/studies/inktrace-living-review/use-live-reduced-motion';

it('responds to motion preference changes while the review remains mounted', () => {
  const original = window.matchMedia;
  const listeners = new Set<() => void>();
  let matches = false;
  const query = {
    get matches() { return matches; }, media: '(prefers-reduced-motion: reduce)', onchange: null,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  };
  window.matchMedia = () => query as unknown as MediaQueryList;
  try {
    const { result, unmount } = renderHook(useLiveReducedMotion);
    expect(result.current).toBe(false);
    act(() => { matches = true; listeners.forEach(notify => notify()); });
    expect(result.current).toBe(true);
    act(() => { matches = false; listeners.forEach(notify => notify()); });
    expect(result.current).toBe(false);
    unmount();
    expect(listeners.size).toBe(0);
  } finally { window.matchMedia = original; }
});
