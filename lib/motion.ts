"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Scoped gsap animations: everything created inside `fn` is reverted on
 * unmount via gsap.context — never kill other sections' triggers.
 */
export function useGsap(
  fn: (ctx: gsap.Context) => void,
  scope: RefObject<HTMLElement | null>
) {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!scope.current) return;
    const ctx = gsap.context((self) => fnRef.current(self), scope);
    return () => ctx.revert();
  }, [scope]);
}
