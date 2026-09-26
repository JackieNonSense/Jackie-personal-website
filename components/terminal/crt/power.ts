/**
 * Tube power timeline. A cold tube shows only the afterglow dot; switching on flares
 * the dot, sweeps it into a line and opens the raster; switching off collapses it back.
 * Everything is a pure function of time so the sequence can be tested and replayed.
 */
export type PowerPhase = 'standby' | 'on' | 'off';
export type Power = { phase: PowerPhase; since: number };

export type Beam = {
  /** Horizontal and vertical deflection, 1 = full raster. */
  sx: number;
  sy: number;
  /** Energy concentration while the raster is squeezed. */
  gain: number;
  /** Cathode emission, including warm-up. */
  brightness: number;
  /** Extra beam spread while the tube warms, in scanline units. */
  focus: number;
  /** Afterglow dot intensity at the centre. */
  dot: number;
  emitting: boolean;
};

export const IGNITE = { flare: 0.08, sweep: 0.26, open: 0.62 } as const;
export const COLLAPSE = { line: 0.1, dot: 0.24 } as const;
/** When a switched-off tube has finished collapsing, a page may leave. */
export const OFF_SETTLED = 1.1;

const LINE = 0.006;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;
function easeOutBack(t: number): number {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

export function standbyDot(time: number, still: boolean): number {
  return still ? 0.5 : 0.46 + 0.08 * Math.sin(time * 1.1) + 0.03 * Math.sin(time * 3.7);
}

export function beamAt(power: Power, now: number, still: boolean): Beam {
  const t = Math.max(0, now - power.since);
  const idle = standbyDot(now, still);
  const beam = (sx: number, sy: number, brightness: number, focus: number, dot: number, emitting: boolean): Beam =>
    ({ sx, sy, gain: Math.min(6, 1 / Math.max(sx * sy, 1e-3)), brightness, focus, dot, emitting });

  if (power.phase === 'standby') return beam(0, 0, 0, 0, idle, false);

  if (power.phase === 'on') {
    if (still) return beam(1, 1, 1, 0, 0, true);
    const warm = 0.42 + 0.58 * (1 - Math.exp(-Math.max(0, t - 0.2) / 1.1));
    const flash = 1 + 0.35 * Math.exp(-(((t - IGNITE.open) / 0.07) ** 2));
    const focus = 0.2 * Math.exp(-t / 1.3);
    if (t < IGNITE.flare) return beam(0, 0, 0, 0, idle + (3 - idle) * (t / IGNITE.flare), false);
    if (t < IGNITE.sweep) {
      const k = easeOut((t - IGNITE.flare) / (IGNITE.sweep - IGNITE.flare));
      return beam(Math.max(0.004, k), LINE, warm, focus, 3 * (1 - k), true);
    }
    if (t < IGNITE.open) {
      const k = easeOutBack((t - IGNITE.sweep) / (IGNITE.open - IGNITE.sweep));
      return beam(1, LINE + (1 - LINE) * k, warm * flash, focus, 0, true);
    }
    return beam(1, 1, warm * flash, focus, 0, true);
  }

  // Off: raster collapses to a line, the line to a dot, and the dot fades to standby.
  if (still) return beam(0, 0, 0, 0, idle, false);
  if (t < COLLAPSE.line) {
    const k = easeIn(t / COLLAPSE.line);
    return beam(1, 1 - (1 - LINE) * k, 1, 0, 0, true);
  }
  if (t < COLLAPSE.dot) {
    const k = easeIn((t - COLLAPSE.line) / (COLLAPSE.dot - COLLAPSE.line));
    return beam(Math.max(0.004, 1 - k), LINE, 1, 0, 2.5 * k, true);
  }
  const fade = Math.exp(-(t - COLLAPSE.dot) / 0.9);
  return beam(0, 0, 0, 0, idle + (2.5 - idle) * fade, false);
}

export function switchPower(power: Power, on: boolean, now: number): Power {
  if (on ? power.phase === 'on' : power.phase !== 'on') return power;
  return { phase: on ? 'on' : 'off', since: now };
}
