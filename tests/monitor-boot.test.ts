import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

async function boot() {
  const path = resolve("components/portfolio/monitor-boot.ts");
  expect(existsSync(path), "Monitor has its own cancellable screen timeline").toBe(true);
  return import(/* @vite-ignore */ path);
}
describe("monitor screen timeline", () => {
  it("starts black, then reveals lines sequentially, not an ENTER overlay", async () => {
    const { initialBoot, stepBoot, bootLines } = await boot();
    let state = initialBoot();
    expect(state.power).toBe(0);
    state = stepBoot(state, true, .1, false);
    expect(state.lines).toBe(0);
    state = stepBoot(state, true, .25, false);
    expect(state.lines).toBe(1);
    state = stepBoot(state, true, .25, false);
    expect(state.lines).toBe(2);
    state = stepBoot(state, true, 1.5, false);
    expect(state.lines).toBe(bootLines.length);
    expect(state.phase).toBe("ready");
  });
  it("cancels on leave and restarts without stale lines on rapid re-entry", async () => {
    const { initialBoot, stepBoot } = await boot();
    let state = stepBoot(initialBoot(), true, .8, false);
    state = stepBoot(state, false, .1, false);
    expect(state.phase).toBe("cooling");
    state = stepBoot(state, true, .05, false);
    expect(state.lines).toBe(0);
    state = stepBoot(state, false, .6, false);
    expect(state.phase).toBe("off");
    expect(state.power).toBe(0);
  });
  it("reduced motion displays the completed screen immediately and has no ongoing animation", async () => {
    const { initialBoot, stepBoot, bootLines } = await boot();
    const ready = stepBoot(initialBoot(), true, 0, true);
    expect(ready.lines).toBe(bootLines.length);
    expect(ready.phase).toBe("ready");
    expect(stepBoot(ready, false, 0, true).power).toBe(0);
  });
  it("does not advance when no drawing time passes (offscreen or hidden tab)", async () => {
    const { initialBoot, stepBoot } = await boot();
    const state = stepBoot(initialBoot(), true, .5, false);
    expect(stepBoot(state, true, 0, false)).toEqual(state);
  });
});
