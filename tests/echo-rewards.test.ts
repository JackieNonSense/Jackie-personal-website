import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function implementation() {
  const path = resolve('components/terminal/echo-rewards.ts');
  expect(existsSync(path), 'optional program rewards implementation exists').toBe(true);
  return import(/* @vite-ignore */ path);
}

describe('optional program reward archive', () => {
  it('keeps records locked until the individual score thresholds are reached', async () => {
    const { rewardsForScores } = await implementation();
    expect(rewardsForScores({ survivor: 99, packet: 49, mirror: 249 })).toEqual([]);
    expect(rewardsForScores({ survivor: 100 })).toHaveLength(1);
    expect(rewardsForScores({ packet: 50 })).toHaveLength(1);
    expect(rewardsForScores({ mirror: 250 })).toHaveLength(1);
  });

  it('ignores malformed scores without unlocking records or throwing', async () => {
    const { rewardsForScores } = await implementation();
    for (const input of [null, undefined, [], '250', { survivor: Infinity, packet: NaN, mirror: -250 }, { survivor: '100', packet: true, mirror: {} }]) {
      expect(rewardsForScores(input)).toEqual([]);
    }
  });

  it('unlocks three standalone English records with fixed-width ASCII', async () => {
    const { rewardsForScores } = await implementation();
    const scores = { survivor: 300, packet: 90, mirror: 250 };
    const saved = JSON.stringify(scores);
    const records = rewardsForScores(scores);
    expect(new Set(records.map((record: { id: string }) => record.id)).size).toBe(3);
    for (const record of records) {
      expect(record.title.length).toBeGreaterThan(8);
      expect(record.body.join(' ').split(/\s+/).length).toBeGreaterThanOrEqual(85);
      expect(record.art.length).toBeGreaterThanOrEqual(5);
      expect(new Set(record.art.map((line: string) => line.length)).size).toBe(1);
      expect(record.body.join(' ')).not.toContain('password');
    }
    expect(JSON.stringify(scores)).toBe(saved);
  });

  it('keeps archive order stable as scores increase', async () => {
    const { rewardsForScores } = await implementation();
    const before = rewardsForScores({ survivor: 100, packet: 50, mirror: 250 });
    const after = rewardsForScores({ survivor: 20000, packet: 800, mirror: 250 });
    expect(after).toEqual(before);
  });
});
