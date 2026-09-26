"use client";

/** Audio can only start once the page has had a real user gesture — scrolling is
 * never one, in any browser. That activation is sticky, so any earlier tap, click
 * or keypress is enough: the deck can arm itself on scroll and sound the moment
 * the visitor touches anything at all. These are the events browsers grant
 * activation on: a finger counts when it lifts (touchend / pointerup), not when it
 * lands, so listening to touchstart would try to play a moment too early. */
const GESTURES = ["mousedown", "pointerup", "touchend", "keydown"] as const;

export function whenUserHasEngaged(run: (event?: Event) => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (navigator.userActivation?.hasBeenActive) { run(); return () => {}; }
  let spent = false;
  const stop = () => { spent = true; GESTURES.forEach(name => window.removeEventListener(name, fire, true)); };
  const fire = (event: Event) => { if (spent) return; stop(); run(event); };
  GESTURES.forEach(name => window.addEventListener(name, fire, { capture: true, passive: true }));
  return stop;
}
