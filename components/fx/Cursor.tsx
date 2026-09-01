"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Hand-drawn pencil cursor with a lagging ink-ring. Fine pointers only. */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const pencilRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

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
      lag.x += (target.x - lag.x) * 0.18;
      lag.y += (target.y - lag.y) * 0.18;
      if (pencilRef.current) {
        pencilRef.current.style.transform = `translate(${target.x}px, ${target.y}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${lag.x - 14}px, ${lag.y - 14}px)`;
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
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[95]">
      {/* lagging sketchy ring */}
      <div ref={ringRef} className="absolute top-0 left-0 will-change-transform">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <path
            d="M 14 3 C 20 2.4, 25 8, 24.4 14 C 24 20.5, 19 25.2, 13.5 24.8 C 7.5 24.4, 3.2 19.5, 3.6 13.5 C 4 8, 8.5 3.6, 14 3 Z"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="1.5"
            opacity="0.7"
          />
        </svg>
      </div>
      {/* pencil tip */}
      <div ref={pencilRef} className="absolute top-0 left-0 will-change-transform">
        <svg width="26" height="26" viewBox="0 0 26 26" style={{ transform: "translate(-2px,-2px)" }}>
          <path d="M 3 3 L 10 5.5 L 5.5 10 Z" fill="var(--ink)" stroke="var(--paper)" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M 8 8 L 21 21" stroke="var(--paper)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 8 8 L 21 21" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
