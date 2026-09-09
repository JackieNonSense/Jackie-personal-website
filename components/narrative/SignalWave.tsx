"use client";

import type { MotionValue } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";

const WIDTH = 1600;
const MIDLINE = 110;
const BAR_COUNT = 236;

const pulses = [
  { center: 0.09, width: 0.027, peak: 42 },
  { center: 0.21, width: 0.055, peak: 29 },
  { center: 0.34, width: 0.034, peak: 52 },
  { center: 0.49, width: 0.071, peak: 38 },
  { center: 0.65, width: 0.047, peak: 63 },
  { center: 0.79, width: 0.065, peak: 47 },
  { center: 0.91, width: 0.031, peak: 35 },
];

function amplitudeAt(index: number) {
  const position = index / (BAR_COUNT - 1);
  const envelope = pulses.reduce((sum, pulse) => {
    const distance = Math.abs(position - pulse.center) / pulse.width;
    return sum + Math.max(0, 1 - distance) ** 2 * pulse.peak;
  }, 0);
  const chatter =
    0.26 +
    Math.abs(Math.sin(index * 1.91)) * 0.42 +
    Math.abs(Math.sin(index * 0.37 + 1.8)) * 0.32;

  return Math.min(83, 2.5 + envelope * chatter);
}

const bars = Array.from({ length: BAR_COUNT }, (_, index) => ({
  amplitude: amplitudeAt(index),
  x: (index / (BAR_COUNT - 1)) * WIDTH,
}));

type SignalWaveProps = {
  x?: MotionValue<number>;
};

export default function SignalWave({ x }: SignalWaveProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.svg
      className="signal-wave"
      viewBox="0 0 1600 220"
      preserveAspectRatio="none"
      role="img"
      aria-label="Live signal waveform"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
    >
      <title>Live signal waveform</title>
      <defs>
        <filter id="signal-glow" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.g
        className="signal-wave__track"
        style={shouldReduceMotion ? undefined : { x }}
        initial={shouldReduceMotion ? false : { scaleX: 0.82 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.75, ease: "easeInOut" }}
      >
        <line className="signal-wave__baseline-ghost" x1="-160" y1={MIDLINE} x2="1760" y2={MIDLINE} />
        <line className="signal-wave__baseline" x1="-160" y1={MIDLINE} x2="1760" y2={MIDLINE} />

        <g className="signal-wave__bars signal-wave__bars--ghost" aria-hidden="true">
          {bars.map(({ amplitude, x: barX }, index) => (
            <line
              key={`ghost-${index}`}
              x1={barX}
              y1={MIDLINE - amplitude}
              x2={barX}
              y2={MIDLINE + amplitude}
            />
          ))}
        </g>

        <g className="signal-wave__bars signal-wave__bars--core" aria-hidden="true">
          {bars.map(({ amplitude, x: barX }, index) => (
            <line
              key={`core-${index}`}
              x1={barX}
              y1={MIDLINE - amplitude * 0.88}
              x2={barX}
              y2={MIDLINE + amplitude * 0.88}
            />
          ))}
        </g>
      </motion.g>
    </motion.svg>
  );
}
