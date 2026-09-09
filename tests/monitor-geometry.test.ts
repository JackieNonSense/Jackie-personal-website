import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
it("has a genuinely convex screen and open frame, not stacked solid boxes", async () => {
  const path = resolve("components/portfolio/monitor-geometry.ts");
  expect(existsSync(path), "curved glass and open bezel geometry implemented").toBe(true);
  const { curvedScreen, frameGeometry } = await import(/* @vite-ignore */ path);
  const screen = curvedScreen();
  const pos = screen.getAttribute("position");
  const depths = Array.from({ length: pos.count }, (_, i) => pos.getZ(i));
  expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(.08);
  expect(frameGeometry(4, 3.15, 3.35, 2.47, .18).parameters.shapes.holes).toHaveLength(1);
  screen.dispose();
});
it("domes beyond the housing face while its perimeter stays seated under the bezel", async () => {
  const { curvedScreen } = await import("../components/portfolio/monitor-geometry");
  const screen = curvedScreen();
  const p = screen.getAttribute("position");
  const z = Array.from({ length: p.count }, (_, i) => p.getZ(i));
  expect(Math.max(...z) - Math.min(...z)).toBeGreaterThan(.32);
  expect(Math.max(...z) + .07).toBeGreaterThan(.365);
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getX(i)) > 1.54 || Math.abs(p.getY(i)) > 1.09) {
      expect(p.getZ(i) + .078).toBeLessThan(.30);
    }
  }
  screen.dispose();
});
it("projects housing material UVs in one continuous non-repeating front elevation", async () => {
  const { frameGeometry } = await import("../components/portfolio/monitor-geometry");
  const frame = frameGeometry(4, 3.15, 3.35, 2.47, .18);
  const uv = frame.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) {
    expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
    expect(uv.getX(i)).toBeLessThanOrEqual(1);
    expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
    expect(uv.getY(i)).toBeLessThanOrEqual(1);
  }
  frame.dispose();
});
