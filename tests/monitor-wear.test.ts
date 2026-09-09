import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
it("creates repeatable aged plastic maps with edge-local wear, not uniform dirt", async () => {
  const path = resolve("components/portfolio/monitor-wear.ts");
  expect(existsSync(path), "physical wear maps implemented").toBe(true);
  const { housingMaps } = await import(/* @vite-ignore */ path);
  const a = housingMaps(128, 96), b = housingMaps(128, 96);
  expect(a.color).toEqual(b.color);
  expect(a.color.length).toBe(128 * 96 * 4);
  expect(a.roughness.length).toBe(a.color.length);
  expect(a.height.length).toBe(a.color.length);
  // Narrow outside edge has more accumulated wear than the broad clean top face.
  const row = (y: number) => Array.from({ length: 100 }, (_, i) => a.wear[y * 128 + i + 14]).reduce((x, y) => x + y, 0) / 100;
  expect(row(94)).toBeGreaterThan(row(91) * 1.5);
  expect(a.color.some((v: number, i: number) => i % 4 !== 3 && v !== b.roughness[i])).toBe(true);
});
