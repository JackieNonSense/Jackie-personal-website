export const bootLines = ["JR INDUSTRIES / TERMLINK", "DISPLAY INITIALIZED", "LINK ESTABLISHED", "TERMINAL READY", "> ENTER _"] as const;
export type BootState = { wanted: boolean; elapsed: number; power: number; lines: number; phase: "off" | "warming" | "booting" | "ready" | "cooling" };
export function initialBoot(): BootState { return { wanted: false, elapsed: 0, power: 0, lines: 0, phase: "off" }; }
/** Render-time clock: no timers survive hover cancellation, unmount or a hidden tab. */
export function stepBoot(previous: BootState, wanted: boolean, dt: number, still: boolean): BootState {
  if (still) return wanted ? { wanted, elapsed: 2, power: 1, lines: bootLines.length, phase: "ready" } : initialBoot();
  const elapsed = (wanted === previous.wanted ? previous.elapsed : 0) + Math.max(0, dt);
  const power = wanted ? Math.min(1, previous.power + dt / .35) : Math.max(0, previous.power - dt / .5);
  if (!wanted) return { wanted, elapsed, power, lines: power ? previous.lines : 0, phase: power ? "cooling" : "off" };
  const lines = Math.min(bootLines.length, Math.max(0, Math.floor((elapsed - .3) / .25) + 1));
  return { wanted, elapsed, power, lines, phase: lines === bootLines.length ? "ready" : lines ? "booting" : "warming" };
}
