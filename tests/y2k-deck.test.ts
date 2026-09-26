import { describe, expect, it } from 'vitest';
import { cameraAngles, keyTravel, projectPoint, scrollProgress } from '../components/portfolio/y2k-deck/stage';
import { OFF, ON, POWER_ON_MS, powerOn } from '../components/portfolio/y2k-deck/sequence';
import { DISPLAY_CANVAS, toCanvas, tunnelColumn } from '../components/portfolio/y2k-deck/display-canvas';
import { sceneForTrack } from '../components/portfolio/y2k-deck/screen-shader';
import layout from '../components/portfolio/y2k-deck/keys.json';

describe('the deck on the page', () => {
  it('turns a few degrees as the page scrolls past, and holds still for reduced motion', () => {
    const top = cameraAngles(0, false), bottom = cameraAngles(1, false);
    expect(top.yaw).toBeGreaterThan(0); expect(bottom.yaw).toBeLessThan(0);
    expect(Math.abs(top.yaw - bottom.yaw)).toBeLessThanOrEqual(16);
    expect(top.pitch).toBeGreaterThan(bottom.pitch);
    expect(cameraAngles(0, true)).toEqual(cameraAngles(1, true));
  });
  it('measures scroll from entering at the bottom to leaving at the top', () => {
    expect(scrollProgress(900, 500, 900)).toBe(0);
    expect(scrollProgress(-500, 500, 900)).toBe(1);
    expect(scrollProgress(200, 500, 900)).toBeCloseTo(.5);
  });
});

describe('the screen mechanism', () => {
  it('comes up in order: disc in, covers apart, the screen out, both stages, the lean, then the picture', () => {
    const m = { ...OFF }, tl = powerOn(m);
    const at = (s: number) => { tl.seek(s); return { ...m }; };
    const early = at(.5);
    expect(early.disc).toBeGreaterThan(0); expect(early.rise).toBe(0);
    const rising = at(1.6);
    expect(rising.covers).toBeCloseTo(1, 1); expect(rising.rise).toBeGreaterThan(0); expect(rising.stage1).toBe(0);
    const extending = at(2.6);
    expect(extending.rise).toBe(1); expect(extending.stage1).toBeGreaterThan(.5); expect(extending.stage2).toBe(0);
    const leaning = at(3.3);
    expect(leaning.stage2).toBeCloseTo(1, 1); expect(leaning.picture).toBe(0);
    const done = at(tl.duration());
    for (const [k, v] of Object.entries(ON)) expect(done[k as keyof typeof ON]).toBeCloseTo(v, 3);
    expect(tl.duration() * 1000).toBeLessThanOrEqual(POWER_ON_MS + 500);
    tl.kill();
  });
  it('presses fast and releases slowly', () => {
    const down = keyTravel(0, true, .03), up = 1 - keyTravel(1, false, .03);
    expect(down).toBeGreaterThan(up);
  });
});

describe('keys and screens line up', () => {
  it('projects every key inside the frame, with the transport keys stacked down the arc', () => {
    for (const { center } of Object.values(layout)) {
      const p = projectPoint(center as [number, number, number], 0, 4);
      expect(p.left).toBeGreaterThan(0); expect(p.left).toBeLessThan(100);
      expect(p.top).toBeGreaterThan(0); expect(p.top).toBeLessThan(100);
    }
    const tops = (['prev', 'play', 'stop', 'next'] as const).map(k => projectPoint(layout[k].center as [number, number, number], 0, 4).top);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });
  it('maps the display glass onto its canvas corner to corner', () => {
    expect(toCanvas(-13.6, 11.6)).toEqual([0, 0]);
    const [x, y] = toCanvas(7.75, 2.8);
    expect(x).toBeCloseTo(DISPLAY_CANVAS.width); expect(y).toBeCloseTo(DISPLAY_CANVAS.height);
  });
  it('folds the tunnel towards a vanishing point: columns crowd and shrink to the right', () => {
    const a = tunnelColumn(0, 22), b = tunnelColumn(1, 22), y = tunnelColumn(20, 22), z = tunnelColumn(21, 22);
    expect(b.x - a.x).toBeGreaterThan(z.x - y.x);
    expect(a.width).toBeGreaterThan(z.width); expect(a.span).toBeGreaterThan(z.span);
  });
  it('gives each of the three tracks its own scene', () => {
    expect(new Set([0, 1, 2].map(sceneForTrack)).size).toBe(3);
  });
});
