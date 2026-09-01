"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Phosphor-green crosshair cursor with a lagging dot. Fine pointers only. */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const crossRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

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
    const lag = { x: -100, y: -100 };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      lag.x += (target.x - lag.x) * 0.16;
      lag.y += (target.y - lag.y) * 0.16;
      if (crossRef.current) {
        crossRef.current.style.transform = `translate(${target.x}px, ${target.y}px)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${lag.x - 2}px, ${lag.y - 2}px)`;
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
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[95] mix-blend-difference"
    >
      <div ref={crossRef} className="absolute top-0 left-0 will-change-transform">
        <div className="absolute -left-3 top-0 w-6 h-px bg-phos" />
        <div className="absolute left-0 -top-3 w-px h-6 bg-phos" />
      </div>
      <div
        ref={dotRef}
        className="absolute top-0 left-0 w-1 h-1 bg-phos will-change-transform"
      />
    </div>
  );
}
