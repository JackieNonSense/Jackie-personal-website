/**
 * Changing tube. The button clicks, the degaussing coil buzzes, the picture swims
 * and smears into colour while the new palette comes up, then everything settles.
 * A pure function of the time since the button went down.
 */
export const DEGAUSS = {
  /** When the new palette starts coming in, and how long it takes. */
  mixFrom: 0.1, mixFor: 0.35,
  /** Peaks of the wobble and the colour smear, and how fast each dies away. */
  wobblePeak: 0.2, wobbleTau: 0.35,
  purityPeak: 0.25, purityTau: 0.5,
  /** Everything is still again by then. */
  length: 1.6,
} as const;

export type Degauss = { mix: number; wobble: number; purity: number; done: boolean };

const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const pulse = (t: number, peak: number, tau: number) => (t < peak ? smooth(t / peak) : Math.exp(-(t - peak) / tau));

export function degaussAt(t: number, still: boolean): Degauss {
  if (still || t >= DEGAUSS.length) return { mix: 1, wobble: 0, purity: 0, done: true };
  if (t < 0) return { mix: 0, wobble: 0, purity: 0, done: false };
  // Fade the last stretch to exactly nothing, so nothing jumps when it stops.
  const tail = 1 - smooth((t - (DEGAUSS.length - 0.4)) / 0.4);
  return {
    mix: smooth((t - DEGAUSS.mixFrom) / DEGAUSS.mixFor),
    wobble: pulse(t, DEGAUSS.wobblePeak, DEGAUSS.wobbleTau) * tail,
    purity: pulse(t, DEGAUSS.purityPeak, DEGAUSS.purityTau) * tail,
    done: false,
  };
}
