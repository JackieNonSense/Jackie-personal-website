import { describe, expect, it } from 'vitest';
import { advanceSpriteClock, sampleSpritePose, SPRITE_ACTIONS } from '../components/studies/inktrace-living-review/sprite-runtime';

describe('living archive sprite proof', () => {
  it('has independent idle, walk, turn, and working frames', () => {
    expect(SPRITE_ACTIONS).toEqual(['idle', 'walk', 'turn', 'work']);
    expect(sampleSpritePose('idle', 0).frame).toBe(0);
    expect(sampleSpritePose('turn', 0).frame).toBe(5);
    expect(sampleSpritePose('work', 0).frame).toBe(6);
    expect(sampleSpritePose('work', 260).frame).toBe(7);
  });
  it('walking changes BOTH gait frame and position, on an integer pixel grid', () => {
    const a = sampleSpritePose('walk', 0);
    const b = sampleSpritePose('walk', 150);
    expect(a.frame).not.toBe(b.frame);
    expect(a.offsetX).not.toBe(b.offsetX);
    for (let t = 0; t < 5000; t += 37) {
      const p = sampleSpritePose('walk', t);
      expect(Number.isInteger(p.offsetX)).toBe(true);
      expect(p.offsetX).toBeGreaterThanOrEqual(0);
      expect(p.offsetX).toBeLessThanOrEqual(38);
      expect([1, 2, 3, 4]).toContain(p.frame);
    }
  });
  it('changes direction at the end of a bounded walking lane', () => {
    expect(sampleSpritePose('walk', 900).facing).toBe(1);
    expect(sampleSpritePose('walk', 2400).facing).toBe(-1);
  });
  it('ordinary pause resumes exactly; a hidden-tab time gap never fast-forwards', () => {
    expect(advanceSpriteClock(740, 16, true)).toBe(740);
    expect(advanceSpriteClock(740, 16, false)).toBe(756);
    expect(advanceSpriteClock(740, 120000, false)).toBe(740);
    expect(advanceSpriteClock(740, -16, false)).toBe(740);
  });
});
