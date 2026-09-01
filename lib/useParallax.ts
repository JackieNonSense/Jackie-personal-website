"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Mouse parallax: attach the returned ref-callback factory to layer elements.
 * Each layer drifts by depth * 14px. Disabled for touch / reduced motion.
 */
export function useParallax() {
  const layers = useRef<Map<HTMLElement, number>>(new Map());

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const quickTos = new Map<
      HTMLElement,
      { x: (v: number) => void; y: (v: number) => void; depth: number }
    >();

    for (const [el, depth] of layers.current) {
      quickTos.set(el, {
        x: gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" }),
        y: gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" }),
        depth,
      });
    }

    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      for (const { x, y, depth } of quickTos.values()) {
        x(-nx * depth * 14);
        y(-ny * depth * 10);
      }
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (depth: number) => (el: HTMLElement | null) => {
    if (el) layers.current.set(el, depth);
  };
}
