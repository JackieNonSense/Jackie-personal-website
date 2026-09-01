"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Crosshair cursor + coordinate readout. Desktop (fine pointer) only. */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const crossRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const fine = window.matchMedia("(pointer: fine)").matches;
      if (fine && !prefersReducedMotion()) setEnabled(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.documentElement.classList.add("custom-cursor");

    let raf = 0;
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      pos.x += (target.x - pos.x) * 0.35;
      pos.y += (target.y - pos.y) * 0.35;
      const cross = crossRef.current;
      const readout = readoutRef.current;
      if (cross) {
        cross.style.transform = `translate(${target.x}px, ${target.y}px)`;
      }
      if (readout) {
        readout.style.transform = `translate(${pos.x + 18}px, ${pos.y + 18}px)`;
        readout.textContent = `X:${String(Math.round(target.x)).padStart(4, "0")} Y:${String(
          Math.round(target.y)
        ).padStart(4, "0")}`;
      }
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove);

    return () => {
      document.documentElement.classList.remove("custom-cursor");
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] mix-blend-difference">
      <div ref={crossRef} className="absolute -top-0 -left-0 will-change-transform">
        <div className="absolute -left-3 top-0 w-6 h-px bg-phos-500" />
        <div className="absolute left-0 -top-3 w-px h-6 bg-phos-500" />
        <div className="absolute -left-[2px] -top-[2px] w-1 h-1 border border-phos-500" />
      </div>
      <div
        ref={readoutRef}
        className="absolute top-0 left-0 font-mono text-[10px] text-phos-500 will-change-transform"
      />
    </div>
  );
}
