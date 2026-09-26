import { RASTER_H as H, RASTER_W as W } from '../crt/raster';

/*
 * Just enough 3D for a game of the period: meshes of flat convex faces, projected
 * through a pinhole, sorted back to front and filled a scanline at a time, each
 * face lit by one light. On a monochrome tube the same scene is drawn as lines,
 * the way vector games looked.
 */
export type Vec3 = [number, number, number];
export type Face = { v: number[]; /** Palette indices from dark to bright; the light picks one. */ shades: readonly number[] };
/** `twoSided`: seen from both sides (a flat thing, like a ring), so nothing is culled. */
export type Mesh = { verts: Vec3[]; faces: Face[]; twoSided?: boolean };
export type Camera = { f: number; cx: number; cy: number; near: number };
export type Instance = { mesh: Mesh; pos: Vec3; rot: Vec3; scale: number };

export const CAMERA: Camera = { f: 320, cx: W / 2, cy: H / 2, near: 0.5 };

/** Screen position of a point in front of the camera, or null behind the near plane. */
export function project(c: Camera, p: Vec3): [number, number] | null {
  if (p[2] < c.near) return null;
  return [c.cx + (c.f * p[0]) / p[2], c.cy - (c.f * p[1]) / p[2]];
}

/** Cuts a polygon at the near plane (Sutherland-Hodgman, one plane). */
export function clipNear(poly: Vec3[], near: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ain = a[2] >= near, bin = b[2] >= near;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (near - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]);
    }
  }
  return out;
}

/** A convex polygon filled with one index, clipped to the raster. */
export function fillPolygon(page: Uint8Array, pts: [number, number][], colour: number): void {
  if (pts.length < 3) return;
  let top = Infinity, bottom = -Infinity;
  for (const [, y] of pts) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const y0 = Math.max(0, Math.ceil(top - 0.5)), y1 = Math.min(H - 1, Math.floor(bottom - 0.5));
  for (let y = y0; y <= y1; y++) {
    const sy = y + 0.5;
    let left = Infinity, right = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
        const x = ax + ((sy - ay) / (by - ay)) * (bx - ax);
        left = Math.min(left, x); right = Math.max(right, x);
      }
    }
    const x0 = Math.max(0, Math.ceil(left - 0.5)), x1 = Math.min(W - 1, Math.floor(right - 0.5));
    if (x1 >= x0) page.fill(colour, y * W + x0, y * W + x1 + 1);
  }
}

export function line(page: Uint8Array, x0: number, y0: number, x1: number, y1: number, colour: number): void {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  // Far off the screen: not worth walking.
  if (Math.max(Math.abs(x0), Math.abs(x1)) > 4 * W || Math.max(Math.abs(y0), Math.abs(y1)) > 4 * H) return;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (x0 >= 0 && x0 < W && y0 >= 0 && y0 < H) page[y0 * W + x0] = colour;
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Rotates about x, then y, then z, scales, and moves into place. */
export function transform(p: Vec3, it: Instance): Vec3 {
  let [x, y, z] = p;
  const [rx, ry, rz] = it.rot;
  let c = Math.cos(rx), s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rz); s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x * it.scale + it.pos[0], y * it.scale + it.pos[1], z * it.scale + it.pos[2]];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/**
 * Draws the scene: faces turned away are dropped, the rest go back to front and
 * are lit by `light` (a direction). `wire` draws every edge in the face's
 * brightest shade instead of filling it; `outline`, when given, edges the filled
 * faces in that index.
 */
export function renderScene(page: Uint8Array, cam: Camera, light: Vec3, items: Instance[], o: { wire?: boolean; outline?: number } = {}): number {
  const toLight = norm(light);
  const faces: { depth: number; pts: [number, number][]; colour: number }[] = [];
  for (const it of items) {
    const world = it.mesh.verts.map(v => transform(v, it));
    for (const f of it.mesh.faces) {
      const poly = f.v.map(i => world[i]);
      const n = cross(sub(poly[1], poly[0]), sub(poly[2], poly[0]));
      // Seen from the camera at the origin: a face whose normal points away is its back.
      const facing = dot(n, poly[0]) < 0;
      if (!facing && !it.mesh.twoSided) continue;
      const clipped = clipNear(poly, cam.near);
      if (clipped.length < 3) continue;
      const pts = clipped.map(p => project(cam, p)!);
      const lit = Math.max(0, dot(norm(n), toLight) * (facing ? 1 : -1));
      const shade = f.shades[Math.min(f.shades.length - 1, Math.floor(lit * f.shades.length))];
      faces.push({ depth: clipped.reduce((s, p) => s + p[2], 0) / clipped.length, pts, colour: o.wire ? f.shades[f.shades.length - 1] : shade });
    }
  }
  faces.sort((a, b) => b.depth - a.depth);
  for (const f of faces) {
    if (!o.wire) fillPolygon(page, f.pts, f.colour);
    if (o.wire || o.outline !== undefined) {
      const c = o.wire ? f.colour : o.outline!;
      for (let i = 0; i < f.pts.length; i++) { const a = f.pts[i], b = f.pts[(i + 1) % f.pts.length]; line(page, a[0], a[1], b[0], b[1], c); }
    }
  }
  return faces.length;
}
