import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
it("reveals only after camera preparation and a completed render, never during useFrame", async () => {
  const path = resolve("components/portfolio/monitor-presentation.ts");
  expect(existsSync(path), "post-render readiness implemented").toBe(true);
  const { presentationStep } = await import(/* @vite-ignore */ path);
  expect(presentationStep("unprepared", "draw")).toBe("unprepared");
  expect(presentationStep("unprepared", "after-render")).toBe("unprepared");
  let state = presentationStep("unprepared", "prepare");
  expect(presentationStep(state, "after-render")).not.toBe("ready");
  state = presentationStep(state, "draw");
  expect(state).not.toBe("ready");
  state = presentationStep(state, "after-render");
  expect(state).toBe("ready");
  expect(presentationStep(state, "draw")).toBe("ready");
});
