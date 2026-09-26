/** The power sequences, as GSAP timelines over one plain state object. The scene reads
 *  the object every frame and poses the model from it, so a reversal mid-way simply
 *  starts the other timeline from wherever everything happens to be. */
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);
// A motor: slow to take up, fast through the middle, a firm stop.
const MOTOR = CustomEase.create('deck-motor', 'M0,0 C0.28,0 0.38,0.06 0.5,0.4 0.6,0.76 0.72,0.97 1,1');
// A latch seating: overshoot, a smaller one back, still.
const SEAT = CustomEase.create('deck-seat', 'M0,0 C0.18,0 0.32,1.14 0.5,1.08 0.64,1.03 0.72,0.97 0.82,0.995 0.88,1.004 0.94,1.002 1,1');

export type Mechanism = {
  /** 0 = the disc waits half out of the mouth, 1 = taken in. */
  disc: number;
  /** Clamshell covers, 0 shut .. 1 open. */
  covers: number;
  /** The screen clearing the hump, then the two telescoping stages, then the lean. */
  rise: number; stage1: number; stage2: number; tilt: number;
  /** A light running round the faceplate, the key backlights, the display. */
  sweep: number; keys: number; display: number;
  /** The top screen: static, a degauss wobble, then the picture. */
  noise: number; degauss: number; picture: number;
};

export const OFF: Mechanism = { disc: 0, covers: 0, rise: 0, stage1: 0, stage2: 0, tilt: 0, sweep: 0, keys: 0, display: 0, noise: 0, degauss: 0, picture: 0 };
export const ON: Mechanism = { disc: 1, covers: 1, rise: 1, stage1: 1, stage2: 1, tilt: 1, sweep: 1, keys: 1, display: 1, noise: 0, degauss: 0, picture: 1 };

/** How long the machine takes to come up before the music may start, in ms. */
export const POWER_ON_MS = 3900;

export function powerOn(m: Mechanism) {
  const tl = gsap.timeline();
  tl.set(m, { sweep: 0 })
    // Light first: a run of light round the trim, the keys waking one after another,
    // the display's self-test.
    .to(m, { sweep: 1, duration: 1.1, ease: 'power1.inOut' }, 0)
    .to(m, { keys: 1, duration: .6, ease: 'steps(6)' }, .15)
    .to(m, { display: 1, duration: .9, ease: 'power1.out' }, .25)
    // The disc is caught and drawn in.
    .to(m, { disc: 1, duration: .75, ease: MOTOR }, .35)
    // The covers part, the screen climbs out, then extends on two stages.
    .to(m, { covers: 1, duration: .45, ease: 'back.out(1.6)' }, .7)
    .to(m, { rise: 1, duration: 1.15, ease: MOTOR }, 1.05)
    .to(m, { stage1: 1, duration: .42, ease: SEAT }, 2.3)
    .to(m, { stage2: 1, duration: .42, ease: SEAT }, 2.72)
    // It leans towards you and locks.
    .to(m, { tilt: 1, duration: .55, ease: SEAT }, 3.18)
    // The picture: static, a degauss shiver, then it tunes in.
    .to(m, { noise: 1, duration: .12 }, 3.35)
    .to(m, { degauss: 1, duration: .1 }, 3.62)
    .to(m, { noise: 0, duration: .3 }, 3.7)
    .to(m, { picture: 1, duration: .35, ease: 'power2.out' }, 3.72)
    .to(m, { degauss: 0, duration: .55, ease: 'power2.out' }, 3.78);
  return tl;
}

export function powerOff(m: Mechanism) {
  const tl = gsap.timeline();
  tl.to(m, { picture: 0, noise: 0, degauss: 0, duration: .25, ease: 'power2.in' }, 0)
    .to(m, { tilt: 0, duration: .35, ease: 'power2.inOut' }, .15)
    .to(m, { stage2: 0, duration: .3, ease: 'power2.in' }, .45)
    .to(m, { stage1: 0, duration: .3, ease: 'power2.in' }, .72)
    .to(m, { rise: 0, duration: .95, ease: MOTOR }, 1.0)
    .to(m, { covers: 0, duration: .35, ease: 'power2.in' }, 1.9)
    .to(m, { disc: 0, duration: .6, ease: MOTOR }, .2)
    .to(m, { display: 0, keys: 0, duration: .5, ease: 'power1.in' }, 1.9);
  return tl;
}

/** Eject: the disc slides half out; loading it again draws it back in. */
export function discTo(m: Mechanism, inside: boolean) {
  return gsap.to(m, { disc: inside ? 1 : 0, duration: inside ? .7 : .55, ease: MOTOR });
}
