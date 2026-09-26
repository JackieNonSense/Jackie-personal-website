import { HW } from '../../crt/palette';
import type { Face, Mesh, Vec3 } from '../../graphics/raster3d';

/*
 * ORBIT's things: rocks, rings to fly through, mines, the patrol drones and the
 * ship. Colours are hardware colours, dark to bright, so each tube shades them its
 * own way; on a green tube they come out as green lines.
 */

/** Turns every face outward (so the renderer can tell its front from its back). */
function convex(verts: Vec3[], faces: number[][], shades: readonly number[]): Mesh {
  const c = verts.reduce<Vec3>((s, v) => [s[0] + v[0] / verts.length, s[1] + v[1] / verts.length, s[2] + v[2] / verts.length], [0, 0, 0]);
  const out: Face[] = faces.map(f => {
    const [a, b, d] = f.map(i => verts[i]);
    const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w: Vec3 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const n: Vec3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const mid = f.reduce<Vec3>((s, i) => [s[0] + verts[i][0], s[1] + verts[i][1], s[2] + verts[i][2]], [0, 0, 0]);
    const outward = n[0] * (mid[0] / f.length - c[0]) + n[1] * (mid[1] / f.length - c[1]) + n[2] * (mid[2] / f.length - c[2]);
    return { v: outward >= 0 ? f : [...f].reverse(), shades };
  });
  return { verts, faces: out };
}

const PHI = (1 + Math.sqrt(5)) / 2;
const ICOSA: Vec3[] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
].map(v => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l] as Vec3; });
const ICOSA_FACES = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

/** A rock: an icosahedron knocked out of shape, a little differently each time. */
export function rock(seed: number): Mesh {
  let s = seed >>> 0 || 1;
  const r = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const verts = ICOSA.map(v => { const k = 0.72 + r() * 0.5; return [v[0] * k, v[1] * k, v[2] * k] as Vec3; });
  return convex(verts, ICOSA_FACES, [HW.darkGrey, HW.brown, HW.grey]);
}

/** A ring to fly through: eight segments, seen from both sides. */
export const RING: Mesh = (() => {
  const verts: Vec3[] = [], faces: Face[] = [], n = 10, outer = 1, inner = 0.72, depth = 0.08;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    for (const z of [-depth, depth]) {
      verts.push([Math.cos(a) * outer, Math.sin(a) * outer, z], [Math.cos(a) * inner, Math.sin(a) * inner, z]);
    }
  }
  const at = (i: number, z: 0 | 1, ring: 0 | 1) => ((i % n) * 4) + z * 2 + ring;
  const shades = [HW.cyan, HW.lightCyan];
  for (let i = 0; i < n; i++) {
    // Front and back faces, and the outer and inner rims.
    faces.push({ v: [at(i, 0, 0), at(i + 1, 0, 0), at(i + 1, 0, 1), at(i, 0, 1)], shades });
    faces.push({ v: [at(i, 1, 1), at(i + 1, 1, 1), at(i + 1, 1, 0), at(i, 1, 0)], shades });
    faces.push({ v: [at(i, 1, 0), at(i + 1, 1, 0), at(i + 1, 0, 0), at(i, 0, 0)], shades });
    faces.push({ v: [at(i, 0, 1), at(i + 1, 0, 1), at(i + 1, 1, 1), at(i, 1, 1)], shades });
  }
  return { verts, faces, twoSided: true };
})();

/** A mine: an octahedron with a spike on every point. */
export const MINE: Mesh = (() => {
  const tips: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const body = tips.map(v => [v[0] * 0.6, v[1] * 0.6, v[2] * 0.6] as Vec3);
  const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  return convex(body, faces, [HW.red, HW.lightRed]);
})();

/** Its spikes, drawn as lines from the body out. */
export const SPIKES: [Vec3, Vec3][] = ([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as Vec3[])
  .map(v => [[v[0] * 0.55, v[1] * 0.55, v[2] * 0.55], [v[0] * 1.1, v[1] * 1.1, v[2] * 1.1]]);

/** A patrol drone: a flat arrowhead that comes at you nose first. */
export const DRONE: Mesh = convex(
  [[0, 0, -1.2], [-1, 0, 0.6], [1, 0, 0.6], [0, 0.35, 0.3], [0, -0.2, 0.4]],
  [[0, 3, 1], [0, 2, 3], [0, 1, 4], [0, 4, 2], [1, 3, 2], [1, 2, 4]],
  [HW.magenta, HW.lightMagenta],
);

/** The ship, from behind: a wedge with wings, nose into the screen. */
export const SHIP: Mesh = convex(
  [[0, 0, 1.4], [-1.2, -0.15, -0.4], [1.2, -0.15, -0.4], [0, 0.35, -0.3], [0, -0.3, -0.3]],
  [[0, 3, 1], [0, 2, 3], [0, 1, 4], [0, 4, 2], [1, 3, 2], [1, 2, 4]],
  [HW.darkGrey, HW.grey, HW.white],
);
