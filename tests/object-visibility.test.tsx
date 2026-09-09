import { createElement } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useObjectVisibility } from '../components/portfolio/use-object-visibility';

// JSDOM has no layout/observer delivery. Keep the real hook and React lifecycle;
// supply only the browser geometry, queued observer records and animation clock.
let rect: DOMRect;
let frames: Map<number, FrameRequestCallback>;
let frameId: number;
let intersections: BrowserIntersection[];
let resizes: BrowserResize[];
const originalIntersection = globalThis.IntersectionObserver;

class BrowserIntersection implements IntersectionObserver {
  readonly root = null;
  readonly thresholds = [0];
  readonly rootMargin: string;
  private target?: Element;
  constructor(private callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.rootMargin = options?.rootMargin ?? '0px';
    intersections.push(this);
  }
  observe(target: Element) { this.target = target; }
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  emit(values: boolean[]) {
    if (!this.target) return;
    const target = this.target;
    this.callback(values.map((isIntersecting, time) => ({
      target, time, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: rect, intersectionRect: rect,
      rootBounds: new DOMRect(0, 0, window.innerWidth, window.innerHeight),
    })), this);
  }
}

class BrowserResize implements ResizeObserver {
  constructor(private callback: ResizeObserverCallback) { resizes.push(this); }
  observe() {}
  unobserve() {}
  disconnect() {}
  emit() { this.callback([], this); }
}

function Harness() {
  const { ref, near, visible, drawing } = useObjectVisibility();
  return createElement('div', {
    ref, 'data-testid': 'visibility',
    'data-near': near, 'data-visible': visible, 'data-drawing': drawing,
  });
}

function flushFrame() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(performance.now()));
  });
}
function emitIntersection(values: boolean[]) {
  act(() => intersections.forEach(observer => observer.emit(values)));
  flushFrame();
}

beforeEach(() => {
  rect = new DOMRect(20, 2000, 300, 300);
  frames = new Map(); frameId = 0; intersections = []; resizes = [];
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  globalThis.IntersectionObserver = BrowserIntersection;
  window.IntersectionObserver = BrowserIntersection;
  vi.stubGlobal('ResizeObserver', BrowserResize);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++frameId; frames.set(id, callback); return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  globalThis.IntersectionObserver = originalIntersection;
  window.IntersectionObserver = originalIntersection;
});

describe('object visibility recovery', () => {
  it('uses the current visible position after a single false → true observer batch', () => {
    render(createElement(Harness)); flushFrame();
    rect = new DOMRect(20, 100, 300, 300);
    emitIntersection([false, true]);
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-visible', 'true');
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-drawing', 'true');
  });

  it('recovers after viewport resize even when the observer has no fresh record', () => {
    render(createElement(Harness)); emitIntersection([false]);
    rect = new DOMRect(20, 100, 300, 300);
    act(() => window.dispatchEvent(new Event('resize'))); flushFrame();
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-visible', 'true');
  });

  it('rechecks an element size change instead of keeping an old offscreen state', () => {
    render(createElement(Harness)); emitIntersection([false]);
    rect = new DOMRect(20, 100, 300, 500);
    act(() => resizes.forEach(observer => observer.emit())); flushFrame();
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-drawing', 'true');
  });

  it('does not start drawing when mounted in an already hidden tab', () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    rect = new DOMRect(20, 100, 300, 300);
    render(createElement(Harness)); emitIntersection([true]);
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-visible', 'true');
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-drawing', 'false');
  });

  it('reconciles position when the tab becomes visible again', () => {
    render(createElement(Harness)); emitIntersection([false]);
    rect = new DOMRect(20, 100, 300, 300);
    act(() => document.dispatchEvent(new Event('visibilitychange'))); flushFrame();
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-drawing', 'true');
  });

  it('preloads within 250px and keeps near sticky when the object leaves', () => {
    rect = new DOMRect(20, window.innerHeight + 100, 300, 100);
    render(createElement(Harness)); flushFrame();
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-near', 'true');
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-visible', 'false');
    rect = new DOMRect(20, 3000, 300, 100); emitIntersection([false]);
    expect(screen.getByTestId('visibility')).toHaveAttribute('data-near', 'true');
  });

  it('coalesces geometry events and ignores queued callbacks after unmount', () => {
    const rendered = render(createElement(Harness)); flushFrame();
    act(() => {
      window.dispatchEvent(new Event('resize'));
      intersections.forEach(observer => observer.emit([false, true]));
      resizes.forEach(observer => observer.emit());
    });
    expect(frames.size).toBe(1);
    rendered.unmount();
    act(() => intersections.forEach(observer => observer.emit([true])));
    expect(frames.size).toBe(0);
  });
});
