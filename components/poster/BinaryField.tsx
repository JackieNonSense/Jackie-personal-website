"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { prefersReducedMotion } from "@/lib/motion";

export type BinaryFieldHandle = {
  /** 0..1 — how violently the digits churn (driven by scrub velocity) */
  setChurn: (v: number) => void;
};

type BinaryFieldProps = {
  className?: string;
};

/** Small blue binary digits scattered on the rip paper; churn on scrub. */
const BinaryField = forwardRef<BinaryFieldHandle, BinaryFieldProps>(
  function BinaryField({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const churnRef = useRef(0);

    useImperativeHandle(ref, () => ({
      setChurn(v) {
        churnRef.current = Math.min(Math.max(v, 0), 1);
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      type Cell = { x: number; y: number; text: string; alpha: number };
      let cells: Cell[] = [];
      let raf = 0;
      let running = true;
      let last = 0;

      const chunk = () => {
        const n = 2 + Math.floor(Math.random() * 3);
        let s = "";
        for (let i = 0; i < n; i++) s += Math.round(Math.random());
        return s;
      };

      const seed = () => {
        const w = (canvas.width = canvas.offsetWidth);
        const h = (canvas.height = canvas.offsetHeight);
        cells = [];
        const count = Math.floor((w * h) / 2600);
        for (let i = 0; i < count; i++) {
          cells.push({
            x: Math.random() * w,
            y: Math.random() * h,
            text: chunk(),
            alpha: 0.35 + Math.random() * 0.5,
          });
        }
      };

      const draw = (now: number) => {
        if (running) raf = requestAnimationFrame(draw);
        // idle: repaint at ~6fps; churning: every frame
        const interval = churnRef.current > 0.05 ? 40 : 160;
        if (now - last < interval) return;
        last = now;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "11px var(--font-ibm-plex-mono), monospace";
        const churn = churnRef.current;
        const style = getComputedStyle(document.documentElement);
        ctx.fillStyle = style.getPropertyValue("--blue-ink").trim() || "#2b4bd7";

        for (const c of cells) {
          // occasionally re-roll digits; much more often while churning
          if (Math.random() < 0.02 + churn * 0.5) c.text = chunk();
          const jx = churn ? (Math.random() - 0.5) * churn * 10 : 0;
          const jy = churn ? (Math.random() - 0.5) * churn * 6 : 0;
          ctx.globalAlpha = c.alpha * (0.8 + churn * 0.2);
          ctx.fillText(c.text, c.x + jx, c.y + jy);
        }
        ctx.globalAlpha = 1;
      };

      seed();
      if (prefersReducedMotion()) {
        draw(1000);
        running = false;
      } else {
        raf = requestAnimationFrame(draw);
      }

      const onResize = () => seed();
      window.addEventListener("resize", onResize);
      return () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
      };
    }, []);

    return <canvas ref={canvasRef} className={className} aria-hidden />;
  }
);

export default BinaryField;
