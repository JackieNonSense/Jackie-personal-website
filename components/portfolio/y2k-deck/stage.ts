/** The deck's staging, as pure functions: where the camera sits for a scroll
 *  position, how far the screen has risen, how a pressed key travels. */

export const DECK_KEYS = ['power', 'prev', 'play', 'stop', 'next', 'volup', 'voldown', 'mute', 'eject'] as const;
export type DeckKey = (typeof DECK_KEYS)[number];

/** The rendered frame the poster was taken from, shared by the live camera. Metres. */
export const FRAME = { target: [0, .168, 0] as const, height: .37, lens: 110, sensor: 24, aspect: .9 };

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const smooth = (t: number) => { t = clamp(t); return t * t * (3 - 2 * t); };

/** How far through the viewport the section is: 0 as its top enters from below,
 *  1 as its bottom leaves at the top. */
export function scrollProgress(top: number, height: number, viewport: number) {
  return clamp((viewport - top) / (viewport + height));
}

/** A slow orbit driven by scroll: the machine turns a few degrees as the page
 *  passes it, so its depth reads without the camera ever wandering off it. */
export function cameraAngles(progress: number, still: boolean) {
  if (still) return { yaw: 0, pitch: 4 };
  const p = clamp(progress);
  return { yaw: 8 - 16 * p, pitch: 9 - 7 * p };
}

export function cameraPosition(yawDeg: number, pitchDeg: number) {
  const distance = (FRAME.height / 2) / Math.tan(Math.atan(FRAME.sensor / 2 / FRAME.lens));
  const yaw = yawDeg * Math.PI / 180, pitch = pitchDeg * Math.PI / 180;
  const [tx, ty, tz] = FRAME.target;
  return [tx + Math.sin(yaw) * Math.cos(pitch) * distance, ty + Math.sin(pitch) * distance, tz + Math.cos(yaw) * Math.cos(pitch) * distance] as const;
}

export const FOV = 2 * Math.atan(FRAME.sensor / 2 / FRAME.lens) * 180 / Math.PI;

/** A key goes down fast and comes up slower, the way a sprung cap does. */
export function keyTravel(previous: number, pressed: boolean, dt: number) {
  const rate = pressed ? 55 : 18;
  const target = pressed ? 1 : 0;
  return target + (previous - target) * Math.exp(-rate * dt);
}

type Vec3 = readonly [number, number, number];
const sub = (a: Vec3, b: Vec3) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as const;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] as const;
const norm = (a: Vec3) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] as const; };

/** Project a point in the model's metres to percentages of the frame, with the same
 *  camera the scene uses. The fallback places its key targets with this. */
export function projectPoint(point: Vec3, yaw: number, pitch: number, aspect = FRAME.aspect) {
  const eye = cameraPosition(yaw, pitch), f = norm(sub(FRAME.target, eye));
  const r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const v = sub(point, eye), depth = dot(v, f);
  const t = Math.tan(FOV / 2 * Math.PI / 180);
  return { left: (dot(v, r) / (depth * t * aspect) + 1) * 50, top: (1 - dot(v, u) / (depth * t)) * 50 };
}
