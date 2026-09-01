"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { prefersReducedMotion } from "@/lib/motion";

export type WaveformHandle = {
  /** offset px + smoothed velocity from the scrub drag */
  setScrub: (offset: number, vel: number) => void;
  /** 0..1+ tear progress */
  setTear: (p: number) => void;
};

type WaveformCanvasProps = {
  className?: string;
  height?: number;
};

/**
 * The glowing green signal. Triple-stroke glow (no shadowBlur) with
 * "lighter" compositing; idle drift + random blips; amplitude reacts to
 * scrub velocity and tear progress. Static single frame under reduced motion.
 */
const WaveformCanvas = forwardRef<WaveformHandle, WaveformCanvasProps>(
  function WaveformCanvas({ className, height = 120 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrub = useRef({ offset: 0, vel: 0 });
    const tear = useRef(0);

    useImperativeHandle(ref, () => ({
      setScrub(offset, vel) {
        scrub.current.offset = offset;
        scrub.current.vel = vel;
      },
      setTear(p) {
        tear.current = p;
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let raf = 0;
      let running = true;
      let phi = 0;
      let blipAmp = 0;
      let nextBlip = performance.now() + 2500;

      // per-column slow value noise
      let noiseSeed: number[] = [];
      const reseed = (cols: number) => {
        noiseSeed = Array.from({ length: cols + 2 }, () => Math.random() * 2 - 1);
      };

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        reseed(Math.ceil(canvas.offsetWidth / 8));
      };

      const strokeWave = (
        w: number,
        h: number,
        amp: number,
        color: string,
        lineWidth: number,
        alpha: number
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        const mid = h / 2;
        for (let x = 0; x <= w; x += 2) {
          // edge taper over outer 12%
          const t = x / w;
          const env =
            t < 0.12
              ? Math.sin((t / 0.12) * Math.PI * 0.5)
              : t > 0.88
              ? Math.sin(((1 - t) / 0.12) * Math.PI * 0.5)
              : 1;
          const ni = Math.floor(x / 8);
          const nfrac = (x % 8) / 8;
          const n =
            (noiseSeed[ni] ?? 0) * (1 - nfrac) + (noiseSeed[ni + 1] ?? 0) * nfrac;
          const k = 0.045;
          // spike train: sharp bursts travelling with the phase
          const burst =
            Math.pow(Math.max(0, Math.sin(0.011 * x + phi * 0.6)), 6) *
            Math.sin(0.5 * x + phi * 5);
          const y =
            mid +
            amp *
              env *
              (0.45 * Math.sin(k * x + phi) +
                0.2 * Math.sin(2.7 * k * x + 1.7 * phi) +
                0.55 * burst +
                0.15 * n);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      const draw = (now: number) => {
        if (running) raf = requestAnimationFrame(draw);
        const w = canvas.offsetWidth;
        const h = height;
        ctx.clearRect(0, 0, w, h);

        const { offset, vel } = scrub.current;
        const p = tear.current;

        // phase: idle drift + scrub coupling
        phi += 0.02 + offset * 0.00025;

        // random idle blip
        if (now > nextBlip) {
          blipAmp = 22 + Math.random() * 12;
          nextBlip = now + 1800 + Math.random() * 2800;
        }
        blipAmp *= 0.95;

        let amp =
          (15 + Math.min(Math.abs(vel) * 1.1, 30) + blipAmp) * (1 + p * 1.5);
        // near-full tear: collapse to a bright flat line
        if (p > 0.9) amp *= Math.max(0, 1 - (p - 0.9) * 8);

        ctx.globalCompositeOperation = "lighter";
        strokeWave(w, h, amp, "#33ff33", 10, 0.14); // wide glow
        strokeWave(w, h, amp, "#33ff33", 4, 0.45); // mid glow
        strokeWave(w, h, amp, "#ccffcc", 1.4, 1); // bright core
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      };

      resize();
      if (prefersReducedMotion()) {
        draw(performance.now());
        running = false;
      } else {
        raf = requestAnimationFrame(draw);
      }

      window.addEventListener("resize", resize);
      return () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
      };
    }, [height]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ height }}
        aria-hidden
      />
    );
  }
);

export default WaveformCanvas;
