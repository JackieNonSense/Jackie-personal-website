"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type WaveformProps = {
  width?: number;
  height?: number;
  className?: string;
};

/** Small canvas vitals waveform: sine + noise polyline, 30fps, pauses off-screen. */
export default function Waveform({
  width = 260,
  height = 60,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = false;
    let last = 0;
    let t = 0;
    const reduced = prefersReducedMotion();

    const draw = (now: number) => {
      if (running) raf = requestAnimationFrame(draw);
      if (now - last < 33) return; // ~30fps
      last = now;
      t += 0.06;

      ctx.clearRect(0, 0, width, height);
      const style = getComputedStyle(document.documentElement);
      ctx.strokeStyle = style.getPropertyValue("--phos-500").trim() || "#33ff33";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const spike =
          Math.sin(x * 0.11 + t * 2.2) *
          Math.max(0, Math.sin(x * 0.023 + t)) *
          0.9;
        const y =
          height / 2 +
          Math.sin(x * 0.05 + t) * 6 +
          spike * (height / 2 - 8) +
          (Math.random() - 0.5) * 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    if (reduced) {
      // Single static frame
      running = false;
      draw(100);
    } else {
      const io = new IntersectionObserver((entries) => {
        const visible = entries[0].isIntersecting;
        if (visible && !running) {
          running = true;
          raf = requestAnimationFrame(draw);
        } else if (!visible) {
          running = false;
          cancelAnimationFrame(raf);
        }
      });
      io.observe(canvas);
      return () => {
        running = false;
        io.disconnect();
        cancelAnimationFrame(raf);
      };
    }
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      aria-hidden
    />
  );
}
