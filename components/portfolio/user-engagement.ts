"use client";

/** Audio can only start once the page has had a real user gesture — scrolling is
 * never one, in any browser. That activation is sticky, so any earlier tap, click
 * or keypress is enough: the deck can arm itself on scroll and sound the moment
 * the visitor touches anything at all. */
const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;

export function whenUserHasEngaged(run: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (navigator.userActivation?.hasBeenActive) { run(); return () => {}; }
  let spent = false;
  const stop = () => { spent = true; GESTURES.forEach(name => window.removeEventListener(name, fire, true)); };
  const fire = () => { if (spent) return; stop(); run(); };
  GESTURES.forEach(name => window.addEventListener(name, fire, { capture: true, passive: true }));
  return stop;
}
