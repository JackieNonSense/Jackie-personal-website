"""Builds the photo set for PICVIEW, the scanned-photo viewer inside /terminal.

None of these are real photographs. Every picture is raymarched from signed distance
fields (rounded boxes, capsules, ellipsoids) in plain numpy, lit mostly by one CRT
screen, then pushed through a fake analog pipeline: bloom, a hint of lens barrel,
soft focus, vignette, sensor grain heavier in the shadows, a few torn scan rows on
the ROOM frames, and last 16 even grey levels with 4x4 ordered (Bayer) dithering, the
way a photo scanned into an old VGA machine would look. Every random source is seeded
from the photo's name, so reruns write identical files.

  python scripts/build-terminal-photos.py                 # every photo
  python scripts/build-terminal-photos.py room_009 desk   # only these

Photos land in public/terminal/photos/NAME.png (640x400, 8-bit grey). The ROOM_*
frames share one camera up in the bedroom corner; room-screen.json holds the monitor
screen quad in that camera (TL, TR, BR, BL pixels) so the app can paint the live
terminal onto ROOM_010, whose screen is left as plain dark glass.

Set PHOTO_SHEET=path.png to also write a labelled contact sheet (with the ROOM_010 quad
drawn over its screen) for review. Runs photos in parallel, about a minute and a half.
"""
import json
import os
import sys
import time
import zlib
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/terminal/photos"
W, H = 640, 400
F32 = np.float32
LEVELS = (np.arange(16) * 17).astype(np.uint8)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float64)
GLASS_LEVEL = 17  # ROOM_010's switched-off screen: one flat grey level, no dither


# ------------------------------------------------------------------ small vector kit
def vec(*a):
    return np.array(a, dtype=np.float64)


def unit(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.linalg.norm(v)


def basis(fwd, up=(0.0, 1.0, 0.0)):
    """Rows: right, up, forward. A local frame for an object facing `fwd`."""
    f = unit(fwd)
    r = unit(np.cross(up, f))
    u = np.cross(f, r)
    return np.array([r, u, f])


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_z(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def _f(v):
    return tuple(float(x) for x in v)


def _m(R):
    return None if R is None else tuple(tuple(float(x) for x in row) for row in R)


def _local(x, y, z, c, R):
    dx, dy, dz = x - c[0], y - c[1], z - c[2]
    if R is None:
        return dx, dy, dz
    return (R[0][0] * dx + R[0][1] * dy + R[0][2] * dz,
            R[1][0] * dx + R[1][1] * dy + R[1][2] * dz,
            R[2][0] * dx + R[2][1] * dy + R[2][2] * dz)


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * (k * 0.25)


# ------------------------------------------------------------------ noise
def hash3(ix, iy, iz):
    h = (ix.astype(np.int64) * 73856093) ^ (iy.astype(np.int64) * 19349663) ^ (iz.astype(np.int64) * 83492791)
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return ((h & 0xFFFF).astype(F32)) / F32(65535.0)


def vnoise(x, y, z):
    fx, fy, fz = np.floor(x), np.floor(y), np.floor(z)
    ix, iy, iz = fx.astype(np.int64), fy.astype(np.int64), fz.astype(np.int64)
    tx, ty, tz = x - fx, y - fy, z - fz
    tx, ty, tz = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty), tz * tz * (3 - 2 * tz)
    out = 0.0
    for dx in (0, 1):
        wx = tx if dx else 1 - tx
        for dy in (0, 1):
            wy = ty if dy else 1 - ty
            for dz in (0, 1):
                wz = tz if dz else 1 - tz
                out = out + wx * wy * wz * hash3(ix + dx, iy + dy, iz + dz)
    return out


def fbm(x, y, z, octaves=3):
    out, amp, tot = 0.0, 1.0, 0.0
    for _ in range(octaves):
        out = out + amp * vnoise(x, y, z)
        tot += amp
        x, y, z, amp = x * 2.03 + 17.1, y * 2.03 + 3.7, z * 2.03 + 9.2, amp * 0.5
    return out / tot


def hash1(i, seed=0):
    i = np.asarray(i)
    return hash3(i, np.full_like(i, seed), np.full_like(i, 7))


# ------------------------------------------------------------------ SDF primitives
class Prim:
    """One distance function with an AABB and a material; `k` blends it into the group."""
    __slots__ = ("f", "lo", "hi", "mat", "k")

    def __init__(self, f, lo, hi, mat, k=0.0):
        self.f, self.lo, self.hi, self.mat, self.k = f, np.asarray(lo, float), np.asarray(hi, float), mat, k


def box(c, half, mat, r=0.0, R=None, disp=None, k=0.0):
    half = np.asarray(half, float)
    cc, b, RR = _f(c), _f(half - r), _m(R)
    r = float(r)

    def f(x, y, z):
        qx, qy, qz = _local(x, y, z, cc, RR)
        qx, qy, qz = np.abs(qx) - b[0], np.abs(qy) - b[1], np.abs(qz) - b[2]
        out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
        d = out + np.minimum(np.maximum(np.maximum(qx, qy), qz), 0) - r
        return d if disp is None else d + disp(x, y, z)

    ext = half if R is None else np.abs(np.asarray(R)).T @ half
    pad = 0.03 if disp is not None else 0.0
    return Prim(f, np.asarray(c) - ext - pad, np.asarray(c) + ext + pad, mat, k)


def ellipsoid(c, rad, mat, R=None, disp=None, k=0.0):
    rad = np.asarray(rad, float)
    cc, rr, RR = _f(c), _f(rad), _m(R)

    def f(x, y, z):
        qx, qy, qz = _local(x, y, z, cc, RR)
        k0 = np.sqrt((qx / rr[0]) ** 2 + (qy / rr[1]) ** 2 + (qz / rr[2]) ** 2)
        k1 = np.sqrt((qx / rr[0] ** 2) ** 2 + (qy / rr[1] ** 2) ** 2 + (qz / rr[2] ** 2) ** 2) + 1e-6
        d = k0 * (k0 - 1.0) / k1
        return d if disp is None else d + disp(x, y, z)

    ext = rad if R is None else np.abs(np.asarray(R)).T @ rad
    pad = 0.03 if disp is not None else 0.0
    return Prim(f, np.asarray(c) - ext - pad, np.asarray(c) + ext + pad, mat, k)


def sphere(c, r, mat, disp=None, k=0.0):
    cc, r = _f(c), float(r)

    def f(x, y, z):
        d = np.sqrt((x - cc[0]) ** 2 + (y - cc[1]) ** 2 + (z - cc[2]) ** 2) - r
        return d if disp is None else d + disp(x, y, z)

    pad = 0.03 if disp is not None else 0.0
    return Prim(f, np.asarray(c) - r - pad, np.asarray(c) + r + pad, mat, k)


def capsule(a, b, r, mat, k=0.0):
    return cone(a, b, r, r, mat, k)


def cone(a, b, ra, rb, mat, k=0.0):
    """Round cone (tapered capsule) from a (radius ra) to b (radius rb)."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a
    l2 = float(ba @ ba)
    rr = float(ra - rb)
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    A, BA = _f(a), _f(ba)
    ra, rb = float(ra), float(rb)
    capsule_like = abs(rr) < 1e-9

    def f(x, y, z):
        px, py, pz = x - A[0], y - A[1], z - A[2]
        yy = px * BA[0] + py * BA[1] + pz * BA[2]
        if capsule_like:
            h = np.clip(yy * il2, 0.0, 1.0)
            return np.sqrt((px - BA[0] * h) ** 2 + (py - BA[1] * h) ** 2 + (pz - BA[2] * h) ** 2) - ra
        zz = yy - l2
        xx = (px * l2 - BA[0] * yy) ** 2 + (py * l2 - BA[1] * yy) ** 2 + (pz * l2 - BA[2] * yy) ** 2
        y2 = yy * yy * l2
        z2 = zz * zz * l2
        kk = np.sign(rr) * rr * rr * xx
        d3 = (np.sqrt(np.maximum(xx * a2 * il2, 0)) + yy * rr) * il2 - ra
        d1 = np.sqrt(xx + z2) * il2 - rb
        d2 = np.sqrt(xx + y2) * il2 - ra
        return np.where(np.sign(zz) * a2 * z2 > kk, d1, np.where(np.sign(yy) * a2 * y2 < kk, d2, d3))

    m = max(ra, rb)
    return Prim(f, np.minimum(a, b) - m, np.maximum(a, b) + m, mat, k)


def capped_cone(a, b, ra, rb, mat, k=0.0):
    """Flat-capped cone (a lampshade): radius ra at a, rb at b."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a
    baba = float(ba @ ba)
    A, BA = _f(a), _f(ba)
    ra, rb = float(ra), float(rb)
    rba = rb - ra
    kk = rba * rba + baba

    def f(x, y, z):
        px, py, pz = x - A[0], y - A[1], z - A[2]
        papa = px * px + py * py + pz * pz
        paba = (px * BA[0] + py * BA[1] + pz * BA[2]) / baba
        xx = np.sqrt(np.maximum(papa - paba * paba * baba, 0))
        cax = np.maximum(0.0, xx - np.where(paba < 0.5, ra, rb))
        cay = np.abs(paba - 0.5) - 0.5
        ff = np.clip((rba * (xx - ra) + paba * baba) / kk, 0.0, 1.0)
        cbx = xx - ra - ff * rba
        cby = paba - ff
        sgn = np.where((cbx < 0) & (cay < 0), -1.0, 1.0)
        return sgn * np.sqrt(np.minimum(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba))

    m = max(ra, rb)
    return Prim(f, np.minimum(a, b) - m, np.maximum(a, b) + m, mat, k)


def cylinder(a, b, r, mat, k=0.0):
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a
    baba = float(ba @ ba)
    A, BA, r = _f(a), _f(ba), float(r)

    def f(x, y, z):
        px, py, pz = x - A[0], y - A[1], z - A[2]
        paba = px * BA[0] + py * BA[1] + pz * BA[2]
        xx = np.sqrt((px * baba - BA[0] * paba) ** 2 + (py * baba - BA[1] * paba) ** 2 + (pz * baba - BA[2] * paba) ** 2) - r * baba
        yy = np.abs(paba - baba * 0.5) - baba * 0.5
        x2, y2 = xx * xx, yy * yy * baba
        d = np.where(np.maximum(xx, yy) < 0, -np.minimum(x2, y2), np.where(xx > 0, x2, 0) + np.where(yy > 0, y2, 0))
        return np.sign(d) * np.sqrt(np.abs(d)) / baba

    return Prim(f, np.minimum(a, b) - r, np.maximum(a, b) + r, mat, k)


def halfspace(axis, offset, sign, mat):
    """Everything on the `sign` side of coordinate[axis] = offset is empty space."""
    off, s = float(offset), float(sign)

    def f(x, y, z):
        return s * ((x, y, z)[axis] - off)

    return Prim(f, [-1e9] * 3, [1e9] * 3, mat)


class Xf:
    """Rigid transform for building an object in its own frame: world = t + M @ local."""

    def __init__(self, t=(0, 0, 0), M=None):
        self.t = np.asarray(t, float)
        self.M = np.eye(3) if M is None else np.asarray(M, float)

    def p(self, v):
        return self.t + self.M @ np.asarray(v, float)

    def d(self, v):
        return self.M @ np.asarray(v, float)

    def box(self, c, half, mat, r=0.0, A=None, **kw):
        A = np.eye(3) if A is None else np.asarray(A, float)
        return box(self.p(c), half, mat, r, R=A @ self.M.T, **kw)

    def ell(self, c, rad, mat, A=None, **kw):
        A = np.eye(3) if A is None else np.asarray(A, float)
        return ellipsoid(self.p(c), rad, mat, R=A @ self.M.T, **kw)

    def cap(self, a, b, r, mat, **kw):
        return capsule(self.p(a), self.p(b), r, mat, **kw)

    def cone(self, a, b, ra, rb, mat, **kw):
        return cone(self.p(a), self.p(b), ra, rb, mat, **kw)

    def cyl(self, a, b, r, mat, **kw):
        return cylinder(self.p(a), self.p(b), r, mat, **kw)

    def sph(self, c, r, mat, **kw):
        return sphere(self.p(c), r, mat, **kw)


class Group:
    """Primitives behind one bounding box. Rays far from the box only pay for the box."""

    def __init__(self, prims, bounded=True, margin=0.04):
        self.prims = [p for p in prims if p is not None]
        self.mats = np.array([p.mat for p in self.prims], dtype=np.int16)
        self.bounded = bounded
        lo = np.min([p.lo for p in self.prims], axis=0) - margin * 0.5
        hi = np.max([p.hi for p in self.prims], axis=0) + margin * 0.5
        self.c = _f((lo + hi) / 2)
        self.h = _f((hi - lo) / 2)
        self.margin = margin

    def detail(self, x, y, z, ids):
        ds = [p.f(x, y, z) for p in self.prims]
        d = ds[0]
        for p, di in zip(self.prims[1:], ds[1:]):
            d = smin(d, di, p.k)
        m = self.mats[np.argmin(np.stack(ds), axis=0)] if ids else None
        return d, m

    def eval(self, x, y, z, ids, margin=None):
        if not self.bounded:
            return self.detail(x, y, z, ids)
        qx = np.abs(x - self.c[0]) - self.h[0]
        qy = np.abs(y - self.c[1]) - self.h[1]
        qz = np.abs(z - self.c[2]) - self.h[2]
        db = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2) + \
            np.minimum(np.maximum(np.maximum(qx, qy), qz), 0)
        near = np.nonzero(db < (margin or self.margin))[0]
        m = np.full(x.shape, -1, np.int16) if ids else None
        if near.size == 0:
            return db, m
        dn, mn = self.detail(x[near], y[near], z[near], ids)
        db[near] = dn
        if ids:
            m[near] = mn
        return db, m


class Repeat:
    """One group of primitives copied `count` times along an axis (domain repetition)."""

    def __init__(self, prims, spacing, count, axis=2, margin=0.05):
        self.inner = Group(prims, margin=margin)
        self.s, self.n, self.axis, self.margin = float(spacing), int(count), axis, margin
        lo = np.array(self.inner.c) - self.inner.h
        hi = np.array(self.inner.c) + self.inner.h
        hi[axis] += spacing * (count - 1)
        self.c, self.h = _f((lo + hi) / 2), _f((hi - lo) / 2)
        self.c0 = self.inner.c[axis]

    def eval(self, x, y, z, ids, margin=None):
        qx = np.abs(x - self.c[0]) - self.h[0]
        qy = np.abs(y - self.c[1]) - self.h[1]
        qz = np.abs(z - self.c[2]) - self.h[2]
        db = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2) +             np.minimum(np.maximum(np.maximum(qx, qy), qz), 0)
        near = np.nonzero(db < (margin or self.margin))[0]
        m = np.full(x.shape, -1, np.int16) if ids else None
        if near.size == 0:
            return db, m
        q = [x[near], y[near], z[near]]
        a = q[self.axis]
        idx = np.clip(np.round((a - self.c0) / self.s), 0, self.n - 1)
        q[self.axis] = a - idx * self.s
        dn, mn = self.inner.eval(q[0], q[1], q[2], ids, margin)
        db[near] = dn
        if ids:
            m[near] = mn
        return db, m


class Scene:
    def __init__(self):
        self.groups = []
        self.mats = {}      # id -> (albedo, emit)
        self.names = {}

    def mat(self, name, albedo=0.5, emit=None):
        if name not in self.names:
            self.names[name] = len(self.names)
        mid = self.names[name]
        self.mats[mid] = (albedo, emit)
        return mid

    def add(self, prims, bounded=True, margin=0.04):
        self.groups.append(Group(prims, bounded, margin))

    def eval(self, x, y, z, ids=False, margin=None):
        """margin: how close to a group's box before its detail is evaluated. Marching can
        step on the box distance; shading queries (AO, soft shadows) need the real one."""
        d = None
        m = None
        for g in self.groups:
            dg, mg = g.eval(x, y, z, ids, margin)
            if d is None:
                d, m = dg, mg
                continue
            if ids:
                closer = dg < d
                m = np.where(closer, mg, m)
            d = np.minimum(d, dg)
        return d, m


# ------------------------------------------------------------------ camera + marching
class Camera:
    def __init__(self, pos, look, hfov_deg, roll_deg=0.0, shift=(0.0, 0.0)):
        self.pos = np.asarray(pos, float)
        f = unit(np.asarray(look, float) - self.pos)
        r = unit(np.cross(f, (0.0, 1.0, 0.0)))
        u = np.cross(r, f)
        a = np.radians(roll_deg)
        self.f, self.r, self.u = f, np.cos(a) * r + np.sin(a) * u, -np.sin(a) * r + np.cos(a) * u
        self.focal = (W / 2) / np.tan(np.radians(hfov_deg) / 2)
        self.shift = shift

    def rays(self):
        j, i = np.mgrid[0:H, 0:W]
        px = (i.ravel() + 0.5 - W / 2 - self.shift[0])
        py = (H / 2 - j.ravel() - 0.5 + self.shift[1])
        d = self.f[:, None] * self.focal + self.r[:, None] * px[None] + self.u[:, None] * py[None]
        d /= np.linalg.norm(d, axis=0, keepdims=True)
        return d.astype(F32)

    def project(self, p):
        d = np.asarray(p, float) - self.pos
        x, y, z = d @ self.r, d @ self.u, d @ self.f
        return (W / 2 + self.shift[0] + self.focal * x / z, H / 2 + self.shift[1] - self.focal * y / z)


def march(scene, ro, rd, steps, tmax, eps=5e-4, relax=0.9, t0=0.02):
    n = rd.shape[1]
    t = np.full(n, t0, F32)
    hit = np.zeros(n, bool)
    alive = np.arange(n)
    ro = [F32(v) for v in ro] if np.ndim(ro[0]) == 0 else ro
    for _ in range(steps):
        if alive.size == 0:
            break
        tt = t[alive]
        if np.ndim(ro[0]) == 0:
            x, y, z = ro[0] + rd[0, alive] * tt, ro[1] + rd[1, alive] * tt, ro[2] + rd[2, alive] * tt
        else:
            x, y, z = ro[0][alive] + rd[0, alive] * tt, ro[1][alive] + rd[1, alive] * tt, ro[2][alive] + rd[2, alive] * tt
        d, _ = scene.eval(x, y, z)
        tt = tt + d * relax
        t[alive] = tt
        done = d < eps * (1.0 + tt)
        hit[alive[done]] = True
        alive = alive[~(done | (tt > tmax))]
    hit[alive] = t[alive] < tmax
    return t, hit


def normals(scene, x, y, z, e=0.0012):
    nx = ny = nz = 0.0
    for kx, ky, kz in ((1, -1, -1), (-1, -1, 1), (-1, 1, -1), (1, 1, 1)):
        d, _ = scene.eval(x + kx * e, y + ky * e, z + kz * e)
        nx, ny, nz = nx + kx * d, ny + ky * d, nz + kz * d
    ln = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    return nx / ln, ny / ln, nz / ln


def occlusion(scene, P, N, dist):
    occ, sca = 0.0, 1.0
    for i in range(5):
        h = 0.01 + dist * i / 4.0
        d, _ = scene.eval(P[0] + N[0] * h, P[1] + N[1] * h, P[2] + N[2] * h, margin=dist * 1.6 + 0.05)
        occ = occ + (h - d) * sca
        sca *= 0.8
    return np.clip(1.0 - occ * (0.45 / dist), 0.25, 1.0)


SHADOW_MARGIN = 0.45


def soft_shadow(scene, P, L, tmax, k, steps=56):
    """P, L: 3-tuples of arrays (L unit); tmax array. Classic k*h/t penumbra."""
    n = P[0].size
    res = np.ones(n, F32)
    # a seeded per-ray jitter on the first step turns step banding into fine noise
    t = (0.02 + 0.03 * np.random.default_rng(n).random(n)).astype(F32)
    alive = np.arange(n)
    for _ in range(steps):
        if alive.size == 0:
            break
        tt = t[alive]
        d, _ = scene.eval(P[0][alive] + L[0][alive] * tt, P[1][alive] + L[1][alive] * tt, P[2][alive] + L[2][alive] * tt,
                          margin=SHADOW_MARGIN)
        r = np.minimum(res[alive], k * d / tt)
        res[alive] = r
        tt = tt + np.clip(d, 0.008, 0.3)
        t[alive] = tt
        alive = alive[(r > 0.001) & (tt < tmax[alive])]
    res = np.clip(res, 0.0, 1.0)
    return res * res * (3 - 2 * res)


# ------------------------------------------------------------------ lights
class AreaLight:
    """A glowing rectangle (the CRT). Emits only forward, falls off with distance squared."""

    def __init__(self, c, u, v, n, power, shadow_k=4.0, grid=(3, 2)):
        self.c, self.u, self.v, self.n = (np.asarray(a, float) for a in (c, u, v, n))
        self.power, self.k, self.grid = power, shadow_k, grid

    def light(self, scene, P, N, ao):
        E = 0.0
        gu, gv = self.grid
        su_list = np.linspace(-0.7, 0.7, gu) if gu > 1 else [0.0]
        sv_list = np.linspace(-0.6, 0.6, gv) if gv > 1 else [0.0]
        for su in su_list:
            for sv in sv_list:
                s = self.c + self.u * su + self.v * sv
                dx, dy, dz = s[0] - P[0], s[1] - P[1], s[2] - P[2]
                d2 = dx * dx + dy * dy + dz * dz
                d = np.sqrt(d2)
                cr = np.maximum((N[0] * dx + N[1] * dy + N[2] * dz) / d, 0)
                ce = np.maximum(-(self.n[0] * dx + self.n[1] * dy + self.n[2] * dz) / d, 0)
                E = E + cr * ce / (d2 + 0.02)
        E = E * (self.power / (gu * gv))
        if self.k:
            sel = np.nonzero(E > 1e-4)[0]
            if sel.size:
                tgt = self.c + self.n * 0.02
                dx, dy, dz = tgt[0] - P[0][sel], tgt[1] - P[1][sel], tgt[2] - P[2][sel]
                d = np.sqrt(dx * dx + dy * dy + dz * dz)
                sh = soft_shadow(scene, (P[0][sel], P[1][sel], P[2][sel]), (dx / d, dy / d, dz / d), d - 0.03, self.k)
                E[sel] *= sh
        return E


class PointLight:
    def __init__(self, pos, power, shadow_k=None, spot=None, ao_mix=0.0, falloff_min=0.05):
        self.pos, self.power, self.k, self.spot, self.ao_mix, self.fmin = np.asarray(pos, float), power, shadow_k, spot, ao_mix, falloff_min

    def light(self, scene, P, N, ao):
        dx, dy, dz = self.pos[0] - P[0], self.pos[1] - P[1], self.pos[2] - P[2]
        d2 = dx * dx + dy * dy + dz * dz
        d = np.sqrt(d2)
        lx, ly, lz = dx / d, dy / d, dz / d
        E = np.maximum(N[0] * lx + N[1] * ly + N[2] * lz, 0) * self.power / (d2 + self.fmin)
        if self.spot is not None:
            sd, c_out, c_in = self.spot
            sd = unit(sd)
            cs = -(lx * sd[0] + ly * sd[1] + lz * sd[2])
            E = E * np.clip((cs - c_out) / (c_in - c_out), 0, 1) ** 2
        if self.ao_mix:
            E = E * (1 - self.ao_mix + self.ao_mix * ao)
        if self.k:
            sel = np.nonzero(E > 1e-4)[0]
            if sel.size:
                sh = soft_shadow(scene, (P[0][sel], P[1][sel], P[2][sel]), (lx[sel], ly[sel], lz[sel]), d[sel] - 0.05, self.k)
                E[sel] *= sh
        return E


class DirLight:
    def __init__(self, to_light, power, shadow_k=None, mask=None, reach=None):
        self.l, self.power, self.k, self.mask, self.reach = unit(to_light), power, shadow_k, mask, reach

    def light(self, scene, P, N, ao):
        l = self.l
        E = np.maximum(N[0] * l[0] + N[1] * l[1] + N[2] * l[2], 0) * self.power
        if self.mask is not None:
            E = E * self.mask(P, l)
        if self.k:
            sel = np.nonzero(E > 1e-4)[0]
            if sel.size:
                Ps = (P[0][sel], P[1][sel], P[2][sel])
                tmax = self.reach(Ps, l) if self.reach else np.full(sel.size, 30.0, F32)
                ones = np.ones(sel.size, F32)
                E[sel] *= soft_shadow(scene, Ps, (ones * l[0], ones * l[1], ones * l[2]), tmax, self.k)
        return E


class Ambient:
    def __init__(self, power, up_bias=0.3, ao_pow=1.0):
        self.power, self.up, self.ao_pow = power, up_bias, ao_pow

    def light(self, scene, P, N, ao):
        return self.power * (1 - self.up + self.up * (0.5 + 0.5 * N[1])) * ao ** self.ao_pow


# ------------------------------------------------------------------ render
def render(scene, cam, lights, steps=120, tmax=14.0, ao_dist=0.2, background=None, relax=0.9):
    rd = cam.rays()
    t, hit = march(scene, cam.pos, rd, steps, tmax, relax=relax)
    n = W * H
    img = np.zeros(n, F32)
    mat = np.full(n, -1, np.int16)
    depth = np.full(n, np.inf, F32)
    idx = np.nonzero(hit)[0]
    th = t[idx]
    P = (F32(cam.pos[0]) + rd[0, idx] * th, F32(cam.pos[1]) + rd[1, idx] * th, F32(cam.pos[2]) + rd[2, idx] * th)
    _, m = scene.eval(*P, ids=True)
    N = normals(scene, *P)
    # pull the shading point off the surface a hair so shadow rays start clean
    P = (P[0] + N[0] * 0.002, P[1] + N[1] * 0.002, P[2] + N[2] * 0.002)
    ao = occlusion(scene, P, N, ao_dist)
    alb = np.zeros(idx.size, F32)
    emit = np.zeros(idx.size, F32)
    for mid in np.unique(m):
        sel = np.nonzero(m == mid)[0]
        if mid < 0:
            continue
        a, e = scene.mats[int(mid)]
        Ps = (P[0][sel], P[1][sel], P[2][sel])
        Ns = (N[0][sel], N[1][sel], N[2][sel])
        alb[sel] = a(Ps, Ns) if callable(a) else a
        if e is not None:
            emit[sel] = e(Ps, Ns) if callable(e) else e
    E = np.zeros(idx.size, F32)
    for L in lights:
        E += L.light(scene, P, N, ao)
    img[idx] = np.maximum(alb, 0) * np.maximum(E, 0) + np.maximum(emit, 0)
    mat[idx] = m
    depth[idx] = th
    if background is not None and idx.size < n:
        miss = np.nonzero(~hit)[0]
        img[miss] = background(rd[:, miss])
    return img.reshape(H, W), mat.reshape(H, W), depth.reshape(H, W)


# ------------------------------------------------------------------ analog pipeline
def gauss(img, sigma):
    if sigma <= 0:
        return img
    r = int(np.ceil(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    out = np.zeros_like(img)
    pad = np.pad(img, ((0, 0), (r, r)), mode="edge")
    for i, w in enumerate(k):
        out += w * pad[:, i:i + img.shape[1]]
    pad = np.pad(out, ((r, r), (0, 0)), mode="edge")
    out = np.zeros_like(img)
    for i, w in enumerate(k):
        out += w * pad[i:i + img.shape[0], :]
    return out


def bilinear(img, sx, sy):
    h, w = img.shape
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0, y0 = np.floor(sx).astype(int), np.floor(sy).astype(int)
    fx, fy = sx - x0, sy - y0
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) +
            img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


def _barrel_scale(r2, k, rmax2):
    return (1 + k * r2) / (1 + k * rmax2)


def barrel(img, k):
    """Output pixel samples the source further out: straight lines bow outward a touch."""
    j, i = np.mgrid[0:H, 0:W].astype(np.float64)
    cx, cy, sc = W / 2, H / 2, W / 2
    nx, ny = (i + 0.5 - cx) / sc, (j + 0.5 - cy) / sc
    rmax2 = (cx / sc) ** 2 + (cy / sc) ** 2
    s = _barrel_scale(nx * nx + ny * ny, k, rmax2)
    return bilinear(img, nx * s * sc + cx - 0.5, ny * s * sc + cy - 0.5)


def barrel_point(x, y, k):
    """Where a source pixel lands after `barrel` (inverse of its sampling map)."""
    cx, cy, sc = W / 2, H / 2, W / 2
    rmax2 = (cx / sc) ** 2 + (cy / sc) ** 2
    sx, sy = (x - cx) / sc, (y - cy) / sc
    dx, dy = sx, sy
    for _ in range(30):
        s = _barrel_scale(dx * dx + dy * dy, k, rmax2)
        dx, dy = sx / s, sy / s
    return dx * sc + cx, dy * sc + cy


def dither(grey):
    h, w = grey.shape
    threshold = (np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w] + 0.5) / 16
    scaled = np.clip(grey, 0, 255) / 255.0 * 15
    low = np.floor(scaled)
    index = np.clip(low + (scaled - low > threshold), 0, 15).astype(int)
    return LEVELS[index]


def develop(lin, seed, exposure=1.0, bloom=(0.9, 0.35, 14.0), barrel_k=0.06, blur=0.65, vignette=0.45,
            grain=(0.018, 0.05), jitter_rows=0, gamma=2.2, lift=0.0, contrast=1.0, display=False):
    """lin: scene radiance (or, with display=True, an already tone-mapped 0..1 picture)."""
    rng = np.random.default_rng(seed)
    img = np.nan_to_num(np.maximum(lin.astype(np.float64), 0)) * exposure
    thr, amt, sig = bloom
    if amt > 0:
        hot = np.maximum(img - thr, 0)
        img = img + amt * gauss(hot, sig) + amt * 0.8 * gauss(hot, sig * 0.25)
    if display:
        v = np.clip(img, 0, 1)
    else:
        v = 1 - np.exp(-img)
        v = v ** (1 / gamma)
    if contrast != 1.0:
        v = np.clip((v - 0.5) * contrast + 0.5, 0, 1)
    v = v * (1 - lift) + lift
    v = barrel(v, barrel_k) if barrel_k else v
    v = gauss(v, blur)
    j, i = np.mgrid[0:H, 0:W]
    r2 = ((i - W / 2) / (W / 2)) ** 2 + ((j - H / 2) / (W / 2)) ** 2
    v = v * (1 - vignette * r2 / 1.39) ** 1.5
    g0, g1 = grain
    noise = rng.normal(0, 1, (H, W))
    noise = 0.75 * noise + 0.5 * gauss(noise, 0.8)
    v = v + noise * (g0 + g1 * (1 - np.clip(v * 1.6, 0, 1)) ** 2)
    # sensor floor: a faint lift so pure black still shows the grain
    v = np.maximum(v, 0) + 0.004 * np.abs(noise)
    for _ in range(jitter_rows):
        y = int(rng.integers(8, H - 8))
        hh = int(rng.integers(1, 4))
        sh = int(rng.integers(-4, 5)) or 2
        v[y:y + hh] = np.roll(v[y:y + hh], sh, axis=1) * (1 + 0.08 * rng.normal())
    return dither(v * 255.0)


# ------------------------------------------------------------------ the figure
STYLES = {
    # cloth albedos, hair kind, build. Jackie: dark hoodie, dark trousers, a mess of hair.
    "jackie": dict(top=0.2, legs=0.1, skin=0.56, hair=0.07, feet=0.3, hair_kind="messy", slim=1.0),
    "donor": dict(top=0.42, legs=0.38, skin=0.62, hair=0.1, feet=0.62, hair_kind="short", slim=0.95),
    "woman": dict(top=0.46, legs=0.12, skin=0.56, hair=0.08, feet=0.1, hair_kind="long", slim=0.86, coat=True),
    "moth": dict(top=0.3, legs=0.16, skin=0.5, hair=0.1, feet=0.25, hair_kind="bun", slim=0.95, headphones=True, stripes=True),
}


def figure_materials(scene, style):
    st = STYLES[style]

    def cloth(base, scale, stripes=False):
        def a(P, N):
            v = base * (0.7 + 0.6 * fbm(P[0] * scale, P[1] * scale, P[2] * scale, 3))
            if stripes:
                v = v * np.where(np.sin(P[1] * 75) > 0.2, 0.45, 1.25)
            return v
        return a
    return {
        "skin": scene.mat(style + "_skin", st["skin"]),
        "hair": scene.mat(style + "_hair", st["hair"]),
        "top": scene.mat(style + "_top", cloth(st["top"], 14.0, st.get("stripes", False))),
        "legs": scene.mat(style + "_legs", cloth(st["legs"], 16.0)),
        "feet": scene.mat(style + "_feet", st["feet"]),
        "gear": scene.mat("headphones", 0.08),
    }


# Poses in the figure's own frame: metres, pelvis at the origin, +z forward, +y up.
# Seated poses: floor is at y=-0.565 (seat top 0.475, pelvis 0.09 above it).
# Floor poses: floor is at y=-0.11.
LEGS_SEATED = dict(hip=(0.09, -0.02, 0.03), knee=(0.11, 0.0, 0.45), ankle=(0.12, -0.45, 0.50), toe=(0.12, -0.51, 0.65))
POSES = {
    "typing": dict(neck=(0, 0.52, 0.12), head=(0, 0.645, 0.17), hfwd=(0, -0.3, 1), hup=(0, 1, 0.3),
                   sh=(0.175, 0.48, 0.09), el=(0.22, 0.25, 0.26), wr=(0.13, 0.215, 0.49), ha=(0.10, 0.205, 0.58), **LEGS_SEATED),
    "leaning": dict(neck=(0, 0.47, 0.21), head=(0, 0.565, 0.32), hfwd=(0, -0.12, 1), hup=(0, 1, 0.12),
                    sh=(0.165, 0.465, 0.18), el=(0.21, 0.23, 0.33), wr=(0.13, 0.215, 0.53), ha=(0.10, 0.205, 0.61), **LEGS_SEATED),
    "asleep": dict(neck=(0, 0.43, 0.27), head=(0.01, 0.345, 0.47), hfwd=(-1, -0.25, 0.15), hup=(0, 0.3, 1),
                   sh=(0.175, 0.41, 0.25), el=(0.22, 0.23, 0.46), wr=(-0.03, 0.235, 0.57), ha=(-0.11, 0.235, 0.60),
                   el_r=(-0.22, 0.24, 0.45), wr_r=(0.03, 0.27, 0.58), ha_r=(0.11, 0.265, 0.61), **LEGS_SEATED),
    "floor_knees": dict(neck=(0, 0.47, 0.10), head=(0, 0.50, 0.25), hfwd=(0, -0.85, 0.5), hup=(0, 0.5, 0.85),
                        sh=(0.175, 0.44, 0.08), el=(0.22, 0.25, 0.23), wr=(0.0, 0.25, 0.41), ha=(-0.08, 0.24, 0.43),
                        el_r=(-0.22, 0.25, 0.23), wr_r=(0.0, 0.28, 0.40), ha_r=(0.08, 0.27, 0.42),
                        hip=(0.09, -0.01, 0.03), knee=(0.11, 0.36, 0.28), ankle=(0.12, -0.06, 0.46), toe=(0.12, -0.08, 0.62)),
    "floor_limp": dict(neck=(0, 0.45, -0.12), head=(0, 0.525, -0.22), hfwd=(0.12, 0.85, 0.5), hup=(0.05, 0.5, -0.85),
                       sh=(0.175, 0.41, -0.10), el=(0.24, 0.14, -0.05), wr=(0.27, -0.06, 0.12), ha=(0.30, -0.08, 0.21),
                       hip=(0.09, -0.02, 0.03), knee=(0.12, -0.045, 0.46), ankle=(0.16, -0.06, 0.88), toe=(0.23, 0.01, 0.95)),
    "standing": dict(neck=(0, 0.55, 0.0), head=(0, 0.68, 0.02), hfwd=(0, 0, 1), hup=(0, 1, 0),
                     sh=(0.18, 0.51, -0.01), el=(0.22, 0.24, -0.03), wr=(0.22, 0.0, 0.02), ha=(0.21, -0.09, 0.03),
                     hip=(0.09, -0.03, 0.0), knee=(0.10, -0.47, 0.02), ankle=(0.10, -0.89, -0.01), toe=(0.11, -0.93, 0.13)),
}
# sat back from the keyboard, head coming round toward the corner of the ceiling
POSES["turned"] = dict(POSES["typing"], neck=(0.0, 0.525, 0.0), head=(-0.01, 0.65, 0.03), sh=(0.175, 0.485, -0.02),
                       el=(0.22, 0.25, 0.19), wr=(0.13, 0.215, 0.46), ha=(0.10, 0.205, 0.55))


def _mirror(v):
    return (-v[0], v[1], v[2])


def pose_joints(name, root, yaw, cam_pos=None, overrides=None):
    """World joint positions for a named pose at `root` (pelvis) facing yaw."""
    p = dict(POSES[name])
    if overrides:
        p.update(overrides)
    R = rot_y(yaw)
    root = np.asarray(root, float)

    def w(v):
        return root + R @ np.asarray(v, float)

    J = {"pelvis": root, "neck": w(p["neck"]), "head": w(p["head"]),
         "hfwd": unit(R @ np.asarray(p["hfwd"], float)), "hup": unit(R @ np.asarray(p["hup"], float)),
         "fwd": R @ vec(0, 0, 1)}
    for part in ("sh", "el", "wr", "ha", "hip", "knee", "ankle", "toe"):
        J[part + "_l"] = w(p[part])
        J[part + "_r"] = w(p.get(part + "_r", _mirror(p[part])))
    if name == "turned" and cam_pos is not None:
        to_cam = unit(np.asarray(cam_pos) - J["head"])
        f = unit(J["hfwd"] * 0.45 + to_cam * 0.55)
        J["hfwd"] = f
        J["hup"] = unit(vec(0, 1, 0) - f * f[1])
    return J


def figure_prims(scene, J, style="jackie"):
    """A person from ellipsoids and round cones, smooth-blended so joints read as flesh and cloth."""
    st = STYLES[style]
    M = figure_materials(scene, style)
    sl = st["slim"]
    k = 0.035
    P = []
    pel, nk = J["pelvis"], J["neck"]
    spine = nk - pel
    s = unit(spine)
    T = basis(J["fwd"] - s * (J["fwd"] @ s), s)  # rows: right, spine, forward
    P.append(ellipsoid(pel + s * 0.02, (0.16 * sl, 0.10, 0.115), M["legs"], R=T))
    P.append(ellipsoid(pel + spine * 0.30, (0.148 * sl, 0.16, 0.105), M["top"], R=T, k=k))
    P.append(ellipsoid(pel + spine * 0.64 - T[2] * 0.005, (0.17 * sl, 0.17, 0.115 * sl), M["top"], R=T, k=k))
    P.append(capsule(J["sh_l"], J["sh_r"], 0.062 * sl, M["top"], k=k))
    if style in ("jackie", "moth"):
        # the hood, bunched behind the neck
        P.append(ellipsoid(nk - T[2] * 0.075 - s * 0.03, (0.115, 0.055, 0.065), M["top"], R=T, k=0.03))
    if st.get("coat"):
        # a coat hanging to the knee
        knee_mid = (J["knee_l"] + J["knee_r"]) / 2
        P.append(cone(pel + s * 0.12, knee_mid + s * 0.1, 0.135, 0.165, M["top"], k=0.04))
    for side in ("l", "r"):
        P.append(cone(J["sh_" + side], J["el_" + side], 0.062 * sl, 0.052 * sl, M["top"], k=k))
        P.append(cone(J["el_" + side], J["wr_" + side], 0.052 * sl, 0.044 * sl, M["top"], k=0.02))
        P.append(cone(J["wr_" + side], J["ha_" + side], 0.03, 0.024, M["skin"], k=0.012))
    for side in ("l", "r"):
        P.append(cone(J["hip_" + side], J["knee_" + side], 0.082 * sl, 0.060 * sl, M["legs"], k=k))
        P.append(cone(J["knee_" + side], J["ankle_" + side], 0.058 * sl, 0.043 * sl, M["legs"], k=0.02))
        P.append(cone(J["ankle_" + side], J["toe_" + side], 0.042, 0.036, M["feet"], k=0.02))
    # neck + head
    hc, f, u = J["head"], J["hfwd"], J["hup"]
    HB = basis(f, u)
    r = HB[0]
    P.append(capsule(nk, hc - u * 0.05, 0.047 * sl, M["skin"], k=0.03))
    P.append(ellipsoid(hc, (0.080, 0.100, 0.095), M["skin"], R=HB, k=0.02))
    P.append(ellipsoid(hc - u * 0.055 + f * 0.022, (0.062, 0.058, 0.07), M["skin"], R=HB, k=0.03))
    P.append(ellipsoid(hc - u * 0.015 + f * 0.093, (0.014, 0.024, 0.016), M["skin"], R=HB, k=0.012))
    for sgn in (-1, 1):
        P.append(ellipsoid(hc + r * sgn * 0.082 - f * 0.005, (0.012, 0.028, 0.018), M["skin"], R=HB, k=0.01))

    def hair_disp(x, y, z):
        return 0.009 * np.sin(61 * x + 5.1) * np.sin(57 * y + 1.3) * np.sin(53 * z + 2.1) +             0.007 * np.sin(23 * x + 31 * z + 5.1) * np.sin(27 * y + 0.7)

    kind = st["hair_kind"]
    if kind == "messy":
        P.append(ellipsoid(hc + u * 0.03 - f * 0.028, (0.103, 0.104, 0.114), M["hair"], R=HB, disp=hair_disp, k=0.02))
        rng = np.random.default_rng(1127)
        base = hc + u * 0.035 - f * 0.02
        dirs = [(-0.3, 0.9, 0.5), (0.4, 0.85, 0.2), (0.0, 0.6, -0.8), (-0.7, 0.4, -0.5), (0.75, 0.35, -0.45),
                (0.2, 0.2, 0.95), (-0.35, 0.1, 0.9), (0.5, -0.1, -0.85), (-0.1, 0.95, -0.3)]
        for d in dirs:
            dl = unit(HB.T @ unit(np.asarray(d) + rng.normal(0, 0.12, 3)))
            P.append(capsule(base + dl * 0.05, base + dl * (0.115 + rng.uniform(0, 0.02)), 0.02, M["hair"], k=0.035))
    elif kind == "short":
        P.append(ellipsoid(hc + u * 0.022 - f * 0.02, (0.088, 0.1, 0.1), M["hair"], R=HB, k=0.01))
    elif kind == "long":
        P.append(ellipsoid(hc + u * 0.02 - f * 0.02, (0.098, 0.106, 0.108), M["hair"], R=HB, k=0.015))
        P.append(cone(hc - f * 0.04 + u * 0.02, hc - f * 0.075 - u * 0.27, 0.098, 0.08, M["hair"], k=0.04))
    elif kind == "bun":
        P.append(ellipsoid(hc + u * 0.03 - f * 0.025, (0.1, 0.104, 0.112), M["hair"], R=HB, disp=hair_disp, k=0.02))
        P.append(sphere(hc + u * 0.1 - f * 0.08, 0.055, M["hair"], disp=hair_disp, k=0.03))
    if st.get("headphones"):
        for sgn in (-1, 1):
            P.append(ellipsoid(hc + r * sgn * 0.1, (0.025, 0.05, 0.045), M["gear"], R=HB, k=0.0))
        arc = [hc + r * np.cos(a) * 0.118 + u * np.sin(a) * 0.125 for a in np.linspace(0.15, np.pi - 0.15, 6)]
        for a0, a1 in zip(arc[:-1], arc[1:]):
            P.append(capsule(a0, a1, 0.012, M["gear"], k=0.0))
    return P


def figure(scene, J, style="jackie"):
    scene.add(figure_prims(scene, J, style), margin=0.05)


# ------------------------------------------------------------------ the bedroom
ROOM = dict(w=3.1, d=3.2, h=2.6)
ROOM_CAM = dict(pos=(0.25, 2.36, 3.02), look=(1.5, 0.5, 0.92), hfov=78.0)
MONITOR = dict(c=(0.95, 0.0, 0.26), yaw=np.radians(-6))  # base centre on the desk plane (y set in build)
DESK_TOP = 0.75
WINDOW = dict(z0=0.55, z1=1.75, y0=0.95, y1=2.05)
SLAT = 0.034


def monitor_xf():
    return Xf((MONITOR["c"][0], DESK_TOP, MONITOR["c"][2]), rot_y(MONITOR["yaw"]))


def screen_geom():
    X = monitor_xf()
    c = X.p((0, 0.245, 0.197))
    u = X.d((0.165, 0, 0))
    v = X.d((0, 0.123, 0))
    n = X.d((0, 0, 1))
    return c, u, v, n


def screen_emit(level, text=True):
    c, u, v, n = screen_geom()
    return panel_emit(c, u, v, level, "text" if text else "blank")


def panel_emit(c, u, v, level, kind="text"):
    """Glow of a screen spanning c +- u +- v: rows of unreadable text, or a bright window."""
    c, u, v = (np.asarray(a, float) for a in (c, u, v))
    uu, vv = u / (u @ u), v / (v @ v)
    text = kind == "text"

    def e(P, N):
        dx, dy, dz = P[0] - c[0], P[1] - c[1], P[2] - c[2]
        su = dx * uu[0] + dy * uu[1] + dz * uu[2]
        sv = dx * vv[0] + dy * vv[1] + dz * vv[2]
        edge = np.clip(1 - np.maximum(np.abs(su) - 0.75, 0) * 2.2 - np.maximum(np.abs(sv) - 0.7, 0) * 2.2, 0.25, 1)
        base = 0.36 + 0.06 * np.cos(sv * 1.4)
        if text:
            row = np.floor((0.92 - sv) * 9.0)
            fr = (0.92 - sv) * 9.0 - row
            col = np.floor((su + 0.9) * 10.0)
            on = (hash1(row.astype(np.int64) * 31 + col.astype(np.int64), 5) > 0.35) & \
                 (col < 4 + 14 * hash1(row.astype(np.int64), 9)) & (row >= 0) & (row < 16) & (su > -0.9) & (su < 0.9)
            line = np.exp(-((fr - 0.45) / 0.2) ** 2)
            base = base + 0.6 * on * line
        if kind == "image":
            win = (np.abs(su - 0.15) < 0.6) & (np.abs(sv - 0.1) < 0.55)
            base = np.where(win, 0.8 + 0.25 * np.sin(su * 7 + 1) * np.cos(sv * 5), 0.25)
            base = np.where((np.abs(su + 0.72) < 0.14) & (np.abs(sv) < 0.85), 0.5, base)
        return level * base * edge
    return e


def build_room(state):
    """state: figures [(pose, root, yaw)], chair dict or None, screen level, etc."""
    sc = Scene()
    Wd, Dp, Hh = ROOM["w"], ROOM["d"], ROOM["h"]
    wo = WINDOW

    def wall_albedo(P, N):
        x, y, z = P
        a = 0.5 * (0.92 + 0.12 * fbm(x * 3, y * 3, z * 3, 2))
        # poster on the right wall above the bed, a smaller print on the far wall
        on_right = (x > Wd - 0.01) & (z > 0.62) & (z < 1.22) & (y > 1.2) & (y < 2.0)
        pz, py = (z - 0.62) / 0.6, (y - 1.2) / 0.8
        figure_mark = ((pz - 0.55) ** 2 * 3 + (py - 0.55) ** 2 < 0.07) | ((np.abs(pz - 0.5) < 0.25) & (py < 0.4))
        poster = np.where(figure_mark, 0.12, 0.62 + 0.1 * np.sin(pz * 9))
        a = np.where(on_right, poster, a)
        a = np.where(on_right & ((pz < 0.04) | (pz > 0.96) | (py < 0.03) | (py > 0.97)), 0.75, a)
        on_far = (z < 0.01) & (x > 1.72) & (x < 2.1) & (y > 1.15) & (y < 1.65)
        a = np.where(on_far, 0.7 - 0.35 * (np.sin((x - 1.72) * 30) * np.sin((y - 1.15) * 21) > 0.4), a)
        return a

    def glass_emit(P, N):
        x, y, z = P
        inside = (x < 0.01) & (z > wo["z0"]) & (z < wo["z1"]) & (y > wo["y0"]) & (y < wo["y1"])
        glow = state.get("window_glow", 0.07)
        return np.where(inside, glow * (1 + 0.5 * (1.0 - (y - wo["y0"]))), 0.0)

    def floor_albedo(P, N):
        x, y, z = P
        plank = np.floor(x / 0.145)
        seam = (x / 0.145 - plank)
        a = 0.26 + 0.07 * hash1(plank.astype(np.int64), 3) + 0.05 * fbm(x * 30, z * 2.0, plank * 7.0, 2)
        a = np.where(seam < 0.04, a * 0.55, a)
        joint = np.floor(z / 1.2 + hash1(plank.astype(np.int64), 4))
        a = np.where(np.abs(z / 1.2 + hash1(plank.astype(np.int64), 4) - joint) < 0.006, a * 0.6, a)
        rug = (x > 0.9) & (x < 1.9) & (z > 1.3) & (z < 2.5)
        rugv = 0.3 + 0.06 * fbm(x * 40, z * 40, 1.0, 2)
        rugv = np.where((np.abs(x - 1.4) > 0.46) | (np.abs(z - 1.9) > 0.56), 0.26, rugv)
        return np.where(rug, rugv, a)

    wall = sc.mat("wall", wall_albedo, glass_emit)
    sc.add([halfspace(0, 0, 1, wall), halfspace(0, Wd, -1, wall), halfspace(2, 0, 1, wall), halfspace(2, Dp, -1, wall),
            halfspace(1, 0, 1, sc.mat("floor", floor_albedo)), halfspace(1, Hh, -1, sc.mat("ceiling", 0.5))], bounded=False)
    trim = sc.mat("trim", 0.58)
    sc.add([box((Wd / 2, 0.045, 0.008), (Wd / 2, 0.045, 0.008), trim),
            box((Wd - 0.008, 0.045, Dp / 2), (0.008, 0.045, Dp / 2), trim),
            box((0.008, 0.045, Dp / 2), (0.008, 0.045, Dp / 2), trim)], bounded=False)

    # window: casing, sill, blinds
    frame_m = sc.mat("frame", 0.55)
    blind_m = sc.mat("blind", 0.36)
    zc, yc = (wo["z0"] + wo["z1"]) / 2, (wo["y0"] + wo["y1"]) / 2
    zh, yh = (wo["z1"] - wo["z0"]) / 2, (wo["y1"] - wo["y0"]) / 2
    n_slats = int((wo["y1"] - wo["y0"] - 0.06) / SLAT)
    y_start = wo["y0"] + 0.02

    def slats(x, y, z):
        idx = np.clip(np.floor((y - y_start) / SLAT), 0, n_slats - 1)
        ly = y - (y_start + (idx + 0.5) * SLAT)
        lx = x - 0.05
        # nearly closed, except a few slats someone bent open with two fingers
        yc_ = y_start + (idx + 0.5) * SLAT
        tilt = 1.3 - 0.55 * np.exp(-((z - 1.25) / 0.09) ** 2 - ((yc_ - 1.27) / 0.07) ** 2)
        ct, st = np.cos(tilt), np.sin(tilt)
        qx = np.abs(ct * lx + st * ly) - 0.019
        qy = np.abs(-st * lx + ct * ly) - 0.0008
        qz = np.abs(z - zc) - (zh - 0.03)
        out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
        return out + np.minimum(np.maximum(np.maximum(qx, qy), qz), 0) - 0.0005

    sc.add([
        box((0.02, wo["y0"] - 0.02, zc), (0.12, 0.018, zh + 0.1), frame_m, r=0.004),
        box((0.012, wo["y1"] + 0.035, zc), (0.012, 0.035, zh + 0.07), frame_m),
        box((0.012, yc, wo["z0"] - 0.035), (0.012, yh + 0.07, 0.035), frame_m),
        box((0.012, yc, wo["z1"] + 0.035), (0.012, yh + 0.07, 0.035), frame_m),
        box((0.05, wo["y1"] - 0.02, zc), (0.025, 0.02, zh - 0.02), blind_m, r=0.004),
        Prim(slats, (0.02, wo["y0"], wo["z0"]), (0.09, wo["y1"], wo["z1"]), blind_m),
        capsule((0.075, wo["y1"] - 0.03, wo["z1"] - 0.08), (0.075, wo["y0"] + 0.25, wo["z1"] - 0.08), 0.0025, blind_m),
    ])

    # desk
    desk_m = sc.mat("desk", lambda P, N: 0.3 * (0.9 + 0.2 * fbm(P[0] * 8, P[1] * 40, P[2] * 8, 2)))
    x0, x1, dz = 0.35, 1.55, 0.70
    sc.add([
        box(((x0 + x1) / 2, DESK_TOP - 0.015, dz / 2), ((x1 - x0) / 2, 0.015, dz / 2), desk_m, r=0.004),
        box((x0 + 0.02, (DESK_TOP - 0.03) / 2, dz / 2), (0.015, (DESK_TOP - 0.03) / 2, dz / 2 - 0.02), desk_m),
        box((x1 - 0.02, (DESK_TOP - 0.03) / 2, dz / 2), (0.015, (DESK_TOP - 0.03) / 2, dz / 2 - 0.02), desk_m),
        box(((x0 + x1) / 2, 0.52, 0.04), ((x1 - x0) / 2 - 0.03, 0.19, 0.01), desk_m),
        # drawer block under the left end
        box((x0 + 0.21, 0.55, 0.35), (0.18, 0.14, 0.31), desk_m, r=0.004),
    ])
    # monitor
    X = monitor_xf()
    beige = sc.mat("beige", lambda P, N: 0.52 * (0.95 + 0.1 * fbm(P[0] * 20, P[1] * 20, P[2] * 20, 1)))
    lvl = state.get("screen", 1.0)

    def note_albedo(P, N):
        return 0.8 - 0.35 * (np.abs(np.sin(P[1] * 700)) > 0.93)
    note = sc.mat("note", note_albedo)
    scr = sc.mat("screen", 0.08, screen_emit(0.55 * lvl))
    sc.add([
        X.box((0, 0.015, 0.02), (0.13, 0.015, 0.12), beige, r=0.006),
        X.box((0, 0.04, 0.02), (0.06, 0.02, 0.06), beige, r=0.006),
        X.box((0, 0.245, 0.14), (0.215, 0.195, 0.055), beige, r=0.022, k=0.0),
        X.box((0, 0.24, -0.04), (0.17, 0.155, 0.17), beige, r=0.05, k=0.03),
        X.box((0, 0.245, 0.195), (0.172, 0.13, 0.006), scr, r=0.01),
        X.box((0.16, 0.075, 0.197), (0.02, 0.006, 0.004), sc.mat("led", 0.3, 0.3 * lvl)),
        X.box((-0.19, 0.39, 0.197), (0.028, 0.028, 0.002), note, A=rot_z(np.radians(6)).T, k=0.0),
        X.box((0.2, 0.33, 0.197), (0.026, 0.026, 0.002), note, A=rot_z(np.radians(-9)).T, k=0.0),
        X.box((-0.12, 0.07, 0.197), (0.03, 0.022, 0.002), note, A=rot_z(np.radians(-3)).T, k=0.0),
    ], margin=0.05)
    # keyboard, mouse, mug, papers, sketchbook, lamp (off)
    def keys(P, N):
        x, z = P[0], P[2]
        gx = (x - 0.95) / 0.018
        gz = (z - 0.58) / 0.019
        gap = (np.abs(gx - np.round(gx)) > 0.42) | (np.abs(gz - np.round(gz)) > 0.4)
        return np.where((N[1] > 0.7) & gap, 0.22, 0.5)
    papers_R = rot_y(np.radians(8))
    bk = rot_y(np.radians(-12))

    def sketch_albedo(P, N):
        # pencil on cream paper: a head, a fringe of hair, shoulders, loose construction lines
        d = np.stack([P[0] - 0.53, P[2] - 0.47])
        u = bk[0, 0] * d[0] + bk[0, 2] * d[1]
        v = bk[2, 0] * d[0] + bk[2, 2] * d[1]
        pu = np.abs(u) - 0.1
        a = np.full(u.shape, 0.74, F32)
        head = np.abs(np.sqrt(((pu - 0.0) / 0.035) ** 2 + ((v + 0.02) / 0.045) ** 2) - 1) < 0.09
        hair = (np.abs(np.sin(pu * 160)) > 0.8) & (((pu / 0.05) ** 2 + ((v + 0.05) / 0.04) ** 2) < 1) & (v < -0.03)
        body = (np.abs(np.abs(pu) - 0.02 - (v - 0.02) * 0.9) < 0.003) & (v > 0.025) & (v < 0.1)
        lines = (np.abs(((v + 0.13) * 90) % 3 - 1.5) < 0.12) & (u < 0) & (v < -0.1)
        a = np.where(head | hair | body, 0.3, a)
        a = np.where(lines, 0.55, a)
        return a
    sketch = sc.mat("sketchpage", sketch_albedo)
    book_R = rot_y(np.radians(-12))
    lamp = sc.mat("lamp", 0.2)
    sc.add([
        box((0.95, DESK_TOP + 0.012, 0.585), (0.21, 0.012, 0.07), sc.mat("keyboard", keys), r=0.005),
        ellipsoid((1.28, DESK_TOP + 0.014, 0.6), (0.032, 0.018, 0.05), sc.mat("mouse", 0.45)),
        cylinder((1.36, DESK_TOP, 0.46), (1.36, DESK_TOP + 0.1, 0.46), 0.04, sc.mat("mug", 0.62)),
        capsule((1.405, DESK_TOP + 0.08, 0.46), (1.415, DESK_TOP + 0.03, 0.46), 0.008, sc.mat("mug", 0.62)),
        box((0.52, DESK_TOP + 0.016, 0.42), (0.11, 0.016, 0.15), sc.mat("paper", 0.72), R=papers_R, r=0.002),
        # the sketchbook, open, pages bowed up from the spine
        box((0.53 - 0.098 * np.cos(np.radians(12)), DESK_TOP + 0.042, 0.47 - 0.098 * np.sin(np.radians(12))), (0.1, 0.004, 0.14),
            sketch, R=rot_z(np.radians(5)) @ book_R, r=0.002),
        box((0.53 + 0.098 * np.cos(np.radians(12)), DESK_TOP + 0.042, 0.47 + 0.098 * np.sin(np.radians(12))), (0.1, 0.004, 0.14),
            sketch, R=rot_z(np.radians(-5)) @ book_R, r=0.002),
        box((0.53, DESK_TOP + 0.036, 0.47), (0.2, 0.003, 0.145), sc.mat("sketchbook", 0.16), R=book_R, r=0.002),
        cylinder((1.42, DESK_TOP, 0.13), (1.42, DESK_TOP + 0.02, 0.13), 0.065, lamp),
        capsule((1.42, DESK_TOP + 0.02, 0.13), (1.39, DESK_TOP + 0.36, 0.2), 0.011, lamp),
        capsule((1.39, DESK_TOP + 0.36, 0.2), (1.29, DESK_TOP + 0.43, 0.36), 0.011, lamp),
        capped_cone((1.29, DESK_TOP + 0.44, 0.35), (1.27, DESK_TOP + 0.36, 0.42), 0.03, 0.072, lamp),
    ], margin=0.05)
    # shelf with books above the desk
    shelf_m = sc.mat("shelf", 0.36)
    books = [box((0.95, 1.59, 0.11), (0.55, 0.012, 0.11), shelf_m, r=0.003)]
    rng = np.random.default_rng(7)
    bx = 0.46
    bm = [sc.mat("book%d" % i, a) for i, a in enumerate((0.16, 0.34, 0.5, 0.26, 0.6))]
    while bx < 1.08:
        w = rng.uniform(0.022, 0.045)
        h = rng.uniform(0.17, 0.27)
        books.append(box((bx + w / 2, 1.602 + h / 2, 0.1), (w / 2 - 0.001, h / 2, rng.uniform(0.07, 0.095)), bm[rng.integers(0, 5)], r=0.002))
        bx += w
    books.append(box((1.12, 1.66, 0.1), (0.017, 0.06, 0.08), bm[1], R=rot_z(np.radians(-28)), r=0.002))
    books.append(box((1.36, 1.64, 0.11), (0.11, 0.04, 0.09), sc.mat("boxy", 0.42), r=0.004))
    sc.add(books, margin=0.04)

    # bed along the right wall, head at the far wall
    bed_m = sc.mat("bedframe", 0.3)
    mattress = sc.mat("mattress", 0.55)

    def rumple(x, y, z):
        return 0.018 * np.sin(8.5 * x + 2.2 * z) * np.sin(5.5 * z + 1.1) + 0.009 * np.sin(19 * z + 7 * x) * np.sin(13 * x + 2) + \
            0.012 * np.sin(3.3 * z + 11 * x + 0.5)

    def blanket_alb(P, N):
        return 0.4 * (0.85 + 0.3 * fbm(P[0] * 12, P[1] * 12, P[2] * 12, 2))

    def pillow_disp(x, y, z):
        return 0.012 * np.sin(20 * x + 3) * np.sin(17 * z + 1)

    blanket = sc.mat("blanket", blanket_alb)
    sc.add([
        box((2.62, 0.14, 1.03), (0.47, 0.14, 1.01), bed_m, r=0.01),
        box((2.62, 0.43, 0.035), (0.47, 0.43, 0.03), bed_m, r=0.01),
        box((2.62, 0.385, 1.04), (0.45, 0.105, 0.97), mattress, r=0.04),
        box((2.60, 0.49, 1.36), (0.485, 0.06, 0.69), blanket, r=0.05, disp=rumple),
        box((2.125, 0.37, 1.36), (0.02, 0.15, 0.66), blanket, r=0.015, disp=rumple, k=0.05),
        box((2.37, 0.54, 0.93), (0.24, 0.07, 0.3), blanket, R=rot_y(np.radians(20)), r=0.06, disp=rumple, k=0.06),
        ellipsoid((2.62, 0.54, 0.28), (0.32, 0.075, 0.17), sc.mat("pillow", 0.62), disp=pillow_disp),
    ], margin=0.06)

    # chair
    ch = state.get("chair")
    if ch:
        chair(sc, ch)
    for fig in state.get("figures", []):
        pose, root, yaw = fig[:3]
        J = pose_joints(pose, root, yaw, cam_pos=ROOM_CAM["pos"])
        figure(sc, J)
    return sc


def chair(sc, ch):
    """Office chair; its own frame has +z toward the person sitting in it, origin on the floor."""
    M = rot_y(ch["yaw"])
    if ch.get("tip"):
        M = M @ rot_z(np.radians(ch["tip"]))
    X = Xf(ch["pos"], M)
    fabric = sc.mat("chair", 0.1)
    metal = sc.mat("chairbase", 0.16)
    back_A = rot_x(np.radians(-10))
    P = [
        X.box((0, 0.44, 0.0), (0.235, 0.036, 0.225), fabric, r=0.03),
        X.box((0, 0.74, -0.25), (0.21, 0.17, 0.035), fabric, A=back_A.T, r=0.03),
        X.cap((0, 0.43, -0.16), (0, 0.6, -0.26), 0.02, metal),
        X.cyl((0, 0.08, 0), (0, 0.41, 0), 0.026, metal),
        X.cyl((0, 0.2, 0), (0, 0.4, 0), 0.034, metal),
    ]
    for i in range(5):
        a = i * 2 * np.pi / 5 + 0.3
        e = (0.29 * np.cos(a), 0.05, 0.29 * np.sin(a))
        P.append(X.cap((0, 0.085, 0), e, 0.019, metal))
        P.append(X.sph((e[0], 0.028, e[2]), 0.028, metal))
    sc.add(P, margin=0.04)


ROOM_FIG = {
    "desk": ((0.9, 0.565, 1.10), np.pi),
    "desk_lean": ((0.92, 0.565, 1.03), np.pi + 0.05),
    "floor": ((1.95, 0.11, 1.7), -np.pi / 2),
}
CHAIR_AT_DESK = dict(pos=(0.9, 0, 1.12), yaw=np.pi)

ROOM_STATES = {
    "room_001": dict(figures=[("typing",) + ROOM_FIG["desk"]], chair=CHAIR_AT_DESK),
    "room_002": dict(figures=[("leaning",) + ROOM_FIG["desk_lean"]], chair=dict(pos=(0.92, 0, 1.05), yaw=np.pi + 0.05)),
    "room_003": dict(figures=[("turned",) + ROOM_FIG["desk"]], chair=CHAIR_AT_DESK),
    "room_004": dict(figures=[("asleep",) + ROOM_FIG["desk"]], chair=CHAIR_AT_DESK),
    "room_005": dict(figures=[], chair=dict(pos=(1.05, 0, 1.5), yaw=np.pi + 0.75)),
    "room_006": dict(figures=[("floor_knees", (2.02, 0.11, 1.7), -np.pi / 2)], chair=dict(pos=(1.0, 0, 1.45), yaw=np.pi + 0.75)),
    "room_007": dict(figures=[("floor_limp",) + ROOM_FIG["floor"]], chair=dict(pos=(0.72, 0, 1.22), yaw=np.pi + 0.9)),
    "room_008": dict(figures=[("floor_limp",) + ROOM_FIG["floor"]], chair=dict(pos=(0.5, 0.25, 1.55), yaw=np.pi * 0.3, tip=90),
                     screen=0.55),
    "room_009": dict(figures=[("typing",) + ROOM_FIG["desk"], ("floor_limp",) + ROOM_FIG["floor"]], chair=CHAIR_AT_DESK),
    "room_010": dict(figures=[], chair=dict(pos=(0.95, 0, 0.98), yaw=np.pi)),
}


def room_lights(state):
    lvl = state.get("screen", 1.0)
    c, u, v, n = screen_geom()
    wo = WINDOW
    street = unit(vec(-1.9, 1.15, -0.45))  # toward the street light, through the blinds

    def blinds(P, l):
        t = -P[0] / l[0]
        y, z = P[1] + l[1] * t, P[2] + l[2] * t
        inside = (z > wo["z0"] + 0.03) & (z < wo["z1"] - 0.03) & (y > wo["y0"] + 0.02) & (y < wo["y1"] - 0.03)
        ph = ((y - wo["y0"] - 0.02) / SLAT) % 1.0
        stripe = np.clip(1 - np.abs(ph - 0.5) / 0.12, 0, 1) * 0.18
        # the slats bent open let a wider patch through
        bent = np.exp(-((z - 1.25) / 0.1) ** 2 - ((y - 1.27) / 0.08) ** 2) * np.clip(1 - np.abs(ph - 0.5) / 0.3, 0, 1)
        return inside * np.clip(stripe + bent, 0, 1)

    def reach(P, l):
        return (0.12 - P[0]) / l[0]

    return [
        AreaLight(c, u, v, n, 1.1 * lvl, shadow_k=5.0),
        PointLight(c + n * 0.45 + vec(0, -0.12, 0), 0.03 * lvl, ao_mix=0.6, falloff_min=0.8),
        DirLight(street, 0.16, shadow_k=12.0, mask=blinds, reach=reach),
        Ambient(0.008, up_bias=0.4),
    ]


def render_room(name):
    state = ROOM_STATES[name]
    sc = build_room(state)
    cam = Camera(ROOM_CAM["pos"], ROOM_CAM["look"], ROOM_CAM["hfov"])
    lin, mat, _ = render(sc, cam, room_lights(state), steps=130, ao_dist=0.18)
    return lin, mat, sc


ROOM_DEVELOP = dict(exposure=5.0, bloom=(0.9, 0.35, 12.0), barrel_k=0.06, blur=0.6, vignette=0.5,
                    grain=(0.014, 0.042), jitter_rows=4)


def photo_room(name, seed):
    lin, mat, sc = render_room(name)
    opts = dict(ROOM_DEVELOP)
    if name == "room_008":
        opts.update(exposure=4.2, grain=(0.022, 0.06), jitter_rows=7)
    out = develop(lin, seed, **opts)
    extra = {}
    if name == "room_010":
        scr = sc.names["screen"]
        mask = barrel((mat == scr).astype(np.float64), opts["barrel_k"]) > 0.5
        grown = mask.copy()
        grown[1:] |= mask[:-1]
        grown[:-1] |= mask[1:]
        grown[:, 1:] |= mask[:, :-1]
        grown[:, :-1] |= mask[:, 1:]
        out = out.copy()
        out[grown] = GLASS_LEVEL
        extra["quad"] = screen_quad(opts["barrel_k"])
    return out, extra


def screen_quad(barrel_k):
    cam = Camera(ROOM_CAM["pos"], ROOM_CAM["look"], ROOM_CAM["hfov"])
    c, u, v, n = screen_geom()
    front = c + n * 0.006
    corners = [front - u + v, front + u + v, front + u - v, front - u - v]
    quad = []
    for p in corners:
        x, y = cam.project(p)
        x, y = barrel_point(x, y, barrel_k)
        quad.append([round(float(x), 1), round(float(y), 1)])
    return quad


# ------------------------------------------------------------------ everyday photos
def room_shell(sc, x0, x1, y1, z0, z1, wall, floor, ceiling):
    sc.add([halfspace(0, x0, 1, wall), halfspace(0, x1, -1, wall), halfspace(2, z0, 1, wall), halfspace(2, z1, -1, wall),
            halfspace(1, 0, 1, floor), halfspace(1, y1, -1, ceiling)], bounded=False)


def photo_desk(seed):
    """His desk from the chair, grey afternoon through the blinds."""
    sc = build_room(dict(figures=[], chair=None, window_glow=0.5))
    c, u, v, n = screen_geom()
    cam = Camera((0.84, 1.2, 1.32), (0.9, 0.86, 0.4), 64.0, roll_deg=-2.5)
    lights = [AreaLight(c, u, v, n, 0.5, shadow_k=5.0),
              PointLight((0.12, 1.5, 1.1), 0.4, shadow_k=10.0, falloff_min=0.8),
              Ambient(0.03, up_bias=0.5)]
    lin, _, _ = render(sc, cam, lights, steps=120, ao_dist=0.1)
    return develop(lin, seed, exposure=1.15, bloom=(0.9, 0.3, 16.0), barrel_k=0.05, blur=0.7, vignette=0.55,
                   grain=(0.016, 0.04)), {}


def draw_city(rng, w, h, horizon, S):
    """Night skyline, three hazy layers, scattered lit windows. Display-space floats."""
    img = Image.new("F", (w, h), 0.0)
    j = np.arange(h)[:, None] / h
    sky = 0.3 + 0.35 * np.clip(j / (horizon / h), 0, 1) ** 2.2
    jj, ii = np.mgrid[0:h, 0:w].astype(np.float32)
    clouds = fbm(ii * 0.004, jj * 0.012, 0.5, 4)
    base = (sky * (0.75 + 0.5 * clouds)).astype(np.float32)
    img = Image.fromarray(base, "F")
    d = ImageDraw.Draw(img)
    layers = [(0.36, 0.6, 0.12, 12, 30, 0.16), (0.22, 0.85, 0.22, 20, 50, 0.22), (0.12, 1.0, 0.32, 36, 90, 0.28)]
    for tone, lit, top_spread, wmin, wmax, pwin in layers:
        x = -rng.integers(0, 30) * S
        while x < w:
            bw = int(rng.integers(wmin, wmax)) * S
            top = int(horizon - rng.uniform(0.04, top_spread) * h * (1.4 if rng.random() < 0.15 else 1.0))
            d.rectangle([x, top, x + bw, h], fill=float(tone))
            if rng.random() < 0.25:
                ax = x + int(bw * rng.uniform(0.3, 0.7))
                at = top - int(rng.uniform(8, 26) * S)
                d.rectangle([ax, at, ax + S, top], fill=float(tone))
                d.rectangle([ax - S, at - S, ax + S, at + S], fill=float(lit))
            step_x, step_y = int(rng.integers(5, 8)) * S, int(rng.integers(6, 9)) * S
            for wy in range(top + 4 * S, h - 2 * S, step_y):
                for wx in range(x + 3 * S, x + bw - 3 * S, step_x):
                    if rng.random() < pwin:
                        d.rectangle([wx, wy, wx + 2 * S, wy + 2 * S], fill=float(lit * rng.uniform(0.5, 1.2)))
            x += bw + int(rng.integers(0, 8)) * S
        # haze between layers
        arr = np.asarray(img, dtype=np.float32)
        arr = arr * 0.9 + 0.1 * sky
        img = Image.fromarray(arr.astype(np.float32), "F")
        d = ImageDraw.Draw(img)
    return np.asarray(img, dtype=np.float64)


def photo_window(seed):
    """Out through the blinds at night: the city, and the slats someone bent open."""
    rng = np.random.default_rng(seed)
    S = 2
    w, h = W * S, H * S
    city = draw_city(rng, w, h, int(h * 0.7), S)
    city = gauss(city, 0.8 * S)  # focus is on the slats, the city is only a little soft
    j, i = np.mgrid[0:h, 0:w].astype(np.float64)
    x, y = i / w, j / h
    period = 15.0 * S
    # two fingers pulled the slats apart: an eye-shaped opening, the slats around it bowed away
    xc, yc, hh = 0.46, 0.42, 0.12 * h
    hw = np.where(x < xc, 0.16, 0.25)
    lens = hh * np.clip(1 - ((x - xc) / hw) ** 2, 0, 1) ** 1.6
    dy = j - yc * h
    # a finger pulled the lower slats down; the upper ones barely moved
    lens = np.where(dy < 0, lens * 0.25, lens)
    inside = np.abs(dy) < lens
    over = np.abs(dy) - lens
    yy = np.where(inside, 0.0, yc * h + np.sign(dy) * (np.abs(dy) - lens * np.exp(-np.maximum(over, 0) / (0.12 * h))))
    # near the opening the slats tilt: their gaps widen a little
    near = np.exp(-(np.maximum(np.abs(dy) - lens, 0) / (0.05 * h)) ** 2) * np.clip(1 - ((x - xc) / (hw * 1.3)) ** 2, 0, 1) * (dy > 0)
    ph = (yy / period) % 1.0
    gap = 0.12 + 0.3 * near
    edge = np.clip((gap - ph) / 0.04, 0, 1)
    soft = np.where(inside, 1.0, edge)
    # slat faces: faint room light, a brighter lip where each slat curls
    t = np.clip((ph - gap) / (1 - gap), 0, 1)
    slat = 0.045 + 0.05 * np.exp(-((t - 0.12) / 0.1) ** 2) + 0.03 * (1 - t) * (1 - 0.5 * x)
    out = slat * (1 - soft) + city * soft
    # ladder cords and the frame
    for cx in (0.2, 0.78):
        out = np.where(np.abs(x - cx) < 0.0035, 0.06, out)
    out = np.where((x < 0.035) | (x > 0.968), 0.03 + 0.02 * y, out)
    out = np.where(y < 0.04, 0.04, out)
    small = out.reshape(H, S, W, S).mean(axis=(1, 3))
    return develop(small, seed, bloom=(0.55, 0.4, 6.0), barrel_k=0.05, blur=0.6, vignette=0.6,
                   grain=(0.02, 0.05), display=True), {}


def photo_print(seed):
    """A printout on a dark table, shot from above under a lamp: a city and a big moon."""
    rng = np.random.default_rng(seed)
    S = 2
    w, h = W * S, H * S
    # table: dark wood
    j, i = np.mgrid[0:h, 0:w].astype(np.float32)
    grain = fbm(i * 0.004, j * 0.06 + fbm(i * 0.01, j * 0.01, 0.5, 2) * 6, 1.0, 3)
    table = 0.07 + 0.05 * grain
    # the sheet
    pw, ph = 300 * S, 424 * S
    paper = Image.new("L", (pw, ph), 232)
    d = ImageDraw.Draw(paper)
    m = 22 * S
    ill = (m, m, pw - m, int(ph * 0.64))
    d.rectangle(ill, fill=34)
    ix0, iy0, ix1, iy1 = ill
    # stars, moon with a soft ring
    for _ in range(60):
        sx, sy = rng.integers(ix0, ix1), rng.integers(iy0, iy0 + (iy1 - iy0) // 2)
        d.point((int(sx), int(sy)), fill=int(rng.integers(90, 200)))
    mx, my, mr = ix0 + (ix1 - ix0) * 0.68, iy0 + (iy1 - iy0) * 0.26, 46 * S
    for k in range(8, 0, -1):
        d.ellipse([mx - mr - k * 5 * S, my - mr - k * 5 * S, mx + mr + k * 5 * S, my + mr + k * 5 * S], fill=34 + (9 - k) * 4)
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=226)
    for cx_, cy_, cr_ in ((0.3, -0.2, 0.2), (-0.35, 0.25, 0.14), (0.1, 0.4, 0.1)):
        d.ellipse([mx + cx_ * mr - cr_ * mr, my + cy_ * mr - cr_ * mr, mx + cx_ * mr + cr_ * mr, my + cy_ * mr + cr_ * mr], fill=205)
    # skyline, drawn like an illustration: flat towers, lit windows in grids
    x = ix0
    while x < ix1:
        bw = int(rng.integers(14, 34)) * S
        top = int(iy1 - rng.uniform(0.18, 0.62) * (iy1 - iy0))
        d.rectangle([x, top, min(x + bw, ix1), iy1], fill=int(rng.integers(12, 26)))
        if rng.random() < 0.3:
            d.polygon([(x, top), (x + bw // 2, top - 12 * S), (min(x + bw, ix1), top)], fill=18)
        for wy in range(top + 5 * S, iy1 - 4 * S, 6 * S):
            for wx in range(x + 3 * S, min(x + bw, ix1) - 4 * S, 5 * S):
                if rng.random() < 0.28:
                    d.rectangle([wx, wy, wx + 2 * S, wy + 3 * S], fill=int(rng.integers(150, 225)))
        x += bw + int(rng.integers(0, 3)) * S
    d.rectangle(ill, outline=20, width=2 * S)
    # caption lines (unreadable), and a stamp in the corner
    ty = int(ph * 0.7)
    for li in range(4):
        x = m
        lw = pw - 2 * m if li < 3 else int((pw - 2 * m) * 0.55)
        while x < m + lw:
            ww = int(rng.integers(10, 40)) * S
            d.rectangle([x, ty, min(x + ww, m + lw), ty + 5 * S], fill=int(rng.integers(105, 135)))
            x += ww + 5 * S
        ty += 15 * S
    sx0, sy0 = pw - m - 70 * S, ph - m - 40 * S
    d.rectangle([sx0, sy0, sx0 + 70 * S, sy0 + 34 * S], outline=110, width=2 * S)
    d.rectangle([sx0 + 6 * S, sy0 + 7 * S, sx0 + 44 * S, sy0 + 11 * S], fill=130)
    d.rectangle([sx0 + 6 * S, sy0 + 17 * S, sx0 + 34 * S, sy0 + 21 * S], fill=140)
    d.ellipse([sx0 + 50 * S, sy0 + 8 * S, sx0 + 64 * S, sy0 + 26 * S], outline=120, width=2 * S)
    pa = np.asarray(paper, dtype=np.float32) / 255.0
    # printer banding, curl toward the right edge, a crease across the lower third
    py_, px_ = np.mgrid[0:ph, 0:pw].astype(np.float32)
    pa = pa * (0.97 + 0.03 * np.sin(py_ * 0.9 / S))
    curl = 1 - 0.22 * (px_ / pw) ** 4 - 0.08 * (1 - py_ / ph) ** 6
    crease_y = ph * 0.58 + (px_ - pw / 2) * 0.05
    crease = 1 - 0.12 * np.exp(-((py_ - crease_y) / (1.2 * S)) ** 2) + 0.04 * np.exp(-((py_ - crease_y - 4 * S) / (5 * S)) ** 2)
    pa = pa * curl * crease
    sheet = Image.fromarray((np.clip(pa, 0, 1) * 255).astype(np.uint8), "L")
    mask = Image.new("L", (pw, ph), 255)
    ang = -7.0
    sheet = sheet.rotate(ang, resample=Image.BICUBIC, expand=True)
    mask = mask.rotate(ang, resample=Image.BICUBIC, expand=True)
    ox, oy = (w - sheet.width) // 2 + 24 * S, (h - sheet.height) // 2
    canvas = np.array(table, dtype=np.float32)
    ma = np.zeros((h, w), np.float32)
    sa = np.zeros((h, w), np.float32)

    def paste(dst, src, x0, y0):
        sx0, sy0 = max(0, -x0), max(0, -y0)
        x0c, y0c = max(0, x0), max(0, y0)
        ww, hh = min(src.shape[1] - sx0, w - x0c), min(src.shape[0] - sy0, h - y0c)
        dst[y0c:y0c + hh, x0c:x0c + ww] = src[sy0:sy0 + hh, sx0:sx0 + ww]

    paste(ma, np.asarray(mask, np.float32) / 255, ox, oy)
    paste(sa, np.asarray(sheet, np.float32) / 255, ox, oy)
    shadow = gauss(np.roll(np.roll(ma, 6 * S, axis=0), 5 * S, axis=1), 6 * S)
    canvas = canvas * (1 - 0.6 * shadow)
    canvas = canvas * (1 - ma) + sa * ma
    # one lamp above and to the left
    lamp = 1.0 - 0.45 * np.clip(np.hypot(i / w - 0.35, j / h - 0.3) / 0.9, 0, 1) ** 1.5
    canvas = canvas * lamp
    small = canvas.reshape(H, S, W, S).mean(axis=(1, 3))
    small = small ** 1.15
    return develop(small, seed, bloom=(0.95, 0.2, 8.0), barrel_k=0.03, blur=0.55, vignette=0.5,
                   grain=(0.018, 0.035), display=True), {}


POSES["slumped"] = dict(neck=(0, 0.47, -0.09), head=(0.02, 0.535, 0.0), hfwd=(0.2, -0.75, 0.62), hup=(0.18, 0.62, 0.77),
                        sh=(0.175, 0.43, -0.085), el=(0.24, 0.16, -0.04), wr=(0.27, -0.05, 0.12), ha=(0.30, -0.075, 0.21),
                        hip=(0.09, -0.02, 0.03), knee=(0.12, -0.045, 0.46), ankle=(0.15, -0.06, 0.88), toe=(0.2, 0.01, 0.95))


def photo_rooms(seed):
    """The donor rooms: a long pale room, people sat against the wall, cables into the wall."""
    sc = Scene()
    Wr, Hr, L = 3.4, 2.7, 40.0
    wall = sc.mat("pale", lambda P, N: 0.8 * (0.95 + 0.07 * fbm(P[0] * 1.5, P[1] * 1.5, P[2] * 1.5, 2)))

    def lino(P, N):
        x, z = P[0], P[2]
        seam = (np.abs((x / 0.6) % 1 - 0.5) > 0.48) | (np.abs((z / 0.6) % 1 - 0.5) > 0.48)
        return np.where(seam, 0.4, 0.56 * (0.94 + 0.1 * fbm(x * 3, z * 3, 0.2, 2)))

    room_shell(sc, 0, Wr, Hr, -2.0, L, wall, sc.mat("lino", lino), sc.mat("ceil", 0.82))
    trim = sc.mat("trim2", 0.62)
    sc.add([box((0.006, 0.05, L / 2), (0.006, 0.05, L / 2 + 2), trim), box((Wr - 0.006, 0.05, L / 2), (0.006, 0.05, L / 2 + 2), trim)],
           bounded=False)
    panel = sc.mat("panel", 0.9, 3.0)
    sc.groups.append(Repeat([box((Wr / 2, Hr - 0.008, 0.8), (0.3, 0.01, 0.6), panel)], 3.0, 13))
    J = pose_joints("slumped", (0.26, 0.11, 2.7), np.pi / 2)
    prims = figure_prims(sc, J, "donor")
    cable_m = sc.mat("cable", 0.05)
    hc, f, u = J["head"], J["hfwd"], J["hup"]
    a = hc - f * 0.085 - u * 0.03
    b = vec(0.004, hc[1] + 0.32, hc[2] + 0.02)
    mid = (a + b) / 2 + vec(0, -0.05, 0)
    prims += [capsule(a, mid, 0.007, cable_m), capsule(mid, b, 0.007, cable_m),
              box(b + vec(0.0, 0.0, 0.0), (0.006, 0.055, 0.04), sc.mat("socket", 0.3), r=0.003)]
    sc.groups.append(Repeat(prims, 1.3, 22))
    cam = Camera((Wr - 0.8, 1.52, -1.2), (0.8, 0.6, 12.0), 64.0, roll_deg=1.3)
    lights = [Ambient(0.55, up_bias=0.75, ao_pow=1.4),
              DirLight((0.03, 1.0, 0.05), 0.45, shadow_k=3.0, reach=lambda P, l: (Hr - 0.03 - P[1]) / l[1])]
    lin, _, _ = render(sc, cam, lights, steps=140, tmax=60.0, ao_dist=0.25)
    return develop(lin, seed, exposure=1.35, bloom=(0.9, 0.2, 10.0), barrel_k=0.07, blur=0.8, vignette=0.4,
                   grain=(0.022, 0.03)), {}


def _sdbox(qx, qy, qz, bx, by, bz, r=0.0):
    qx, qy, qz = np.abs(qx) - bx + r, np.abs(qy) - by + r, np.abs(qz) - bz + r
    return np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2) + \
        np.minimum(np.maximum(np.maximum(qx, qy), qz), 0) - r


class Shelf:
    """A floor-to-ceiling rack of old monitors and beige cases, one hash per cell."""

    def __init__(self, origin, along, out, cols, rows, cw=0.56, ch=0.46, depth=0.5, seed=1, lit_cell=None):
        self.o, self.a, self.out = np.asarray(origin, float), unit(along), unit(out)
        self.cols, self.rows, self.cw, self.ch, self.depth, self.seed = cols, rows, cw, ch, depth, seed
        self.lit = lit_cell

    def local(self, x, y, z):
        dx, dy, dz = x - self.o[0], y - self.o[1], z - self.o[2]
        a = dx * self.a[0] + dy * self.a[1] + dz * self.a[2]
        c = dx * self.out[0] + dy * self.out[1] + dz * self.out[2]
        return a, dy, c

    def cells(self, a, b):
        ix = np.clip(np.floor(a / self.cw), 0, self.cols - 1)
        iy = np.clip(np.floor(b / self.ch), 0, self.rows - 1)
        h1 = hash3(ix.astype(np.int64), iy.astype(np.int64), np.full(ix.shape, self.seed, np.int64))
        h2 = hash3(ix.astype(np.int64) + 91, iy.astype(np.int64), np.full(ix.shape, self.seed, np.int64))
        kind = np.where(h1 < 0.5, 0, np.where(h1 < 0.78, 1, np.where(h1 < 0.94, 2, 3)))
        if self.lit is not None:
            kind = np.where((ix == self.lit[0]) & (iy == self.lit[1]), 0, kind)
        la = a - (ix + 0.5) * self.cw
        lb = b - iy * self.ch - 0.02
        return ix, iy, h1, h2, kind, la, lb

    def items(self, x, y, z):
        a, b, c = self.local(x, y, z)
        ix, iy, h1, h2, kind, la, lb = self.cells(a, b)
        dep = self.depth
        jit = (h2 - 0.5) * 0.06
        fw, fh = 0.16 + 0.05 * h2, 0.14 + 0.04 * h2
        crt = np.minimum(_sdbox(la - jit, lb - fh, c - (dep - 0.07), fw, fh, 0.05, 0.02),
                         _sdbox(la - jit, lb - fh * 0.95, c - (dep - 0.24), fw * 0.72, fh * 0.75, 0.13, 0.04))
        desk = np.minimum(_sdbox(la - jit, lb - 0.07, c - dep * 0.52, 0.21, 0.07, 0.2, 0.008),
                          np.where(h2 > 0.5, _sdbox(la + jit, lb - 0.205, c - dep * 0.5, 0.2, 0.065, 0.19, 0.008), 9.0))
        tower = _sdbox(la - jit * 2, lb - 0.19, c - dep * 0.5, 0.09, 0.19, 0.2, 0.008)
        d = np.where(kind == 0, crt, np.where(kind == 1, desk, np.where(kind == 2, tower, 9.0)))
        # never step past the cell wall into a neighbour's box unseen
        d = np.minimum(d, self.cw / 2 - np.abs(la) + 0.03)
        d = np.minimum(d, np.maximum(self.ch - lb, 0) + 0.03)
        return d

    def frame(self, x, y, z):
        a, b, c = self.local(x, y, z)
        span = self.cols * self.cw
        lvl = np.clip(np.round(b / self.ch), 0, self.rows)
        board = _sdbox(a - span / 2, b - lvl * self.ch - 0.01, c - self.depth / 2, span / 2, 0.012, self.depth / 2)
        post_i = np.clip(np.round(a / (self.cw * 3)), 0, np.ceil(self.cols / 3))
        post = _sdbox(a - np.minimum(post_i * self.cw * 3, span), b - self.rows * self.ch / 2, c - self.depth + 0.02,
                      0.02, self.rows * self.ch / 2 + 0.01, 0.02)
        return np.minimum(board, post)

    def albedo(self, P, N):
        a, b, c = self.local(*P)
        ix, iy, h1, h2, kind, la, lb = self.cells(a, b)
        alb = 0.3 + 0.28 * h2 + 0.04 * fbm(P[0] * 20, P[1] * 20, P[2] * 20, 1)
        jit = (h2 - 0.5) * 0.06
        fw, fh = 0.16 + 0.05 * h2, 0.14 + 0.04 * h2
        glass = (kind == 0) & (c > self.depth - 0.03) & (np.abs(la - jit) < fw * 0.74) & (np.abs(lb - fh * 1.05) < fh * 0.68)
        vents = (kind == 1) & (np.abs(np.sin(la * 180)) > 0.7) & (np.abs(la - jit) > 0.1) & (c > self.depth * 0.7)
        return np.where(glass, 0.05, np.where(vents, alb * 0.6, alb))

    def emit(self, P, N):
        if self.lit is None:
            return 0.0
        a, b, c = self.local(*P)
        ix, iy, h1, h2, kind, la, lb = self.cells(a, b)
        jit = (h2 - 0.5) * 0.06
        fw, fh = 0.16 + 0.05 * h2, 0.14 + 0.04 * h2
        on = (ix == self.lit[0]) & (iy == self.lit[1]) & (c > self.depth - 0.03) & \
             (np.abs(la - jit) < fw * 0.74) & (np.abs(lb - fh * 1.05) < fh * 0.68)
        rows = 0.5 + 0.5 * (np.sin(lb * 260) > 0.2)
        return np.where(on, 0.35 * rows, 0.0)

    def prims(self, sc, name):
        span = self.cols * self.cw
        pts = [self.o, self.o + self.a * span, self.o + self.out * self.depth, self.o + self.a * span + self.out * self.depth]
        lo = np.min(pts, axis=0) - 0.05
        hi = np.max(pts, axis=0) + 0.05
        hi[1] = self.o[1] + self.rows * self.ch + 0.1
        gear = sc.mat(name + "_gear", self.albedo, self.emit)
        wood = sc.mat(name + "_wood", lambda P, N: 0.26 * (0.85 + 0.3 * fbm(P[0] * 9, P[1] * 9, P[2] * 9, 2)))
        return [Prim(self.items, lo, hi, gear), Prim(self.frame, lo, hi, wood)]


def catenary(a, b, sag, r, mat, n=7):
    a, b = np.asarray(a, float), np.asarray(b, float)
    pts = [a + (b - a) * t - vec(0, sag * 4 * t * (1 - t), 0) for t in np.linspace(0, 1, n)]
    return [capsule(p, q, r, mat) for p, q in zip(pts[:-1], pts[1:])]


def photo_workshop(seed):
    """The old man's repair shop: racks of dead monitors, one lamp over the bench."""
    sc = Scene()
    concrete = sc.mat("concrete", lambda P, N: 0.28 * (0.75 + 0.5 * fbm(P[0] * 2.5, P[2] * 2.5, 0.3, 4)))
    wall = sc.mat("shopwall", lambda P, N: 0.3 * (0.85 + 0.3 * fbm(P[0] * 3, P[1] * 3, P[2] * 3, 3)))
    room_shell(sc, -3.3, 3.3, 3.0, -1.8, 5.7, wall, concrete, sc.mat("shopceil", 0.25))
    back = Shelf((-3.25, 0.0, 5.68), (1, 0, 0), (0, 0, -1), 11, 6, seed=3, lit_cell=(7, 3))
    left = Shelf((-3.28, 0.0, 5.1), (0, 0, -1), (1, 0, 0), 9, 6, seed=5)
    sc.add(back.prims(sc, "back"))
    sc.add(left.prims(sc, "left"))
    bench = sc.mat("bench", lambda P, N: 0.3 * (0.8 + 0.4 * fbm(P[0] * 6, P[1] * 6, P[2] * 6, 3)))
    metal = sc.mat("tool", 0.15)
    beige = sc.mat("beige2", 0.5)
    CX = Xf((-0.45, 0.93, 3.7), rot_y(np.radians(190)))
    sc.add([
        box((0.1, 0.9, 3.55), (1.1, 0.03, 0.42), bench, r=0.005),
        box((-0.95, 0.44, 3.2), (0.03, 0.44, 0.03), bench), box((1.15, 0.44, 3.2), (0.03, 0.44, 0.03), bench),
        box((-0.95, 0.44, 3.9), (0.03, 0.44, 0.03), bench), box((1.15, 0.44, 3.9), (0.03, 0.44, 0.03), bench),
        box((0.1, 0.25, 3.6), (1.05, 0.015, 0.36), bench),
        box((0.55, 0.36, 3.6), (0.2, 0.09, 0.22), beige, r=0.01),
        # an opened monitor on the bench, a case lying with its lid off, tools
        CX.box((0, 0.2, 0.0), (0.2, 0.18, 0.05), sc.mat("oldbeige", 0.32), r=0.02),
        CX.box((0, 0.2, 0.052), (0.155, 0.12, 0.004), sc.mat("deadglass", 0.05), r=0.01),
        CX.box((0, 0.19, -0.17), (0.14, 0.12, 0.13), sc.mat("tube", 0.12), r=0.05),
        CX.box((0.0, 0.01, -0.05), (0.14, 0.01, 0.12), sc.mat("oldbeige", 0.32)),
        box((0.45, 0.98, 3.6), (0.22, 0.05, 0.2), beige, R=rot_y(np.radians(-8)), r=0.006),
        box((0.45, 1.035, 3.6), (0.19, 0.006, 0.17), sc.mat("board", 0.22), R=rot_y(np.radians(-8))),
        capsule((0.02, 0.94, 3.35), (0.25, 0.94, 3.3), 0.008, metal),
        capsule((0.1, 0.94, 3.25), (0.2, 0.94, 3.45), 0.006, metal),
        cylinder((-0.1, 0.93, 3.5), (-0.1, 0.96, 3.5), 0.06, metal),
        capsule((-0.1, 0.96, 3.5), (-0.02, 1.08, 3.45), 0.006, metal),
        cylinder((0.85, 0.93, 3.35), (0.85, 1.0, 3.35), 0.045, sc.mat("spool", 0.4)),
        box((0.9, 0.95, 3.75), (0.05, 0.02, 0.08), sc.mat("meter", 0.3), r=0.01),
    ], margin=0.05)
    # stool
    sc.add([cylinder((0.55, 0.6, 3.0), (0.55, 0.65, 3.0), 0.17, sc.mat("stool", 0.12))] +
           [capsule((0.55, 0.6, 3.0), (0.55 + 0.2 * np.cos(a_), 0.0, 3.0 + 0.2 * np.sin(a_)), 0.014, metal) for a_ in (0.4, 2.5, 4.5)])
    # the lamp: cord, shade, bulb
    lamp_m = sc.mat("shade", 0.2, lambda P, N: 0.12 * np.clip(1.72 - P[1], 0, 1) * 8)
    bulb = sc.mat("bulb", 0.9, 8.0)
    lx, lz = 0.1, 3.5
    sc.add([capsule((lx, 3.0, lz), (lx, 1.76, lz), 0.006, metal),
            capped_cone((lx, 1.77, lz), (lx, 1.62, lz), 0.04, 0.19, lamp_m),
            sphere((lx, 1.6, lz), 0.035, bulb)])
    # cables hanging off the racks and from a ceiling hook
    cable = sc.mat("cables", 0.07)
    cab = []
    cab += catenary((-2.6, 2.3, 5.15), (-1.4, 2.25, 5.15), 0.45, 0.009, cable)
    cab += catenary((-1.0, 1.84, 5.15), (0.3, 1.8, 5.15), 0.3, 0.007, cable)
    cab += catenary((1.2, 2.3, 5.15), (2.3, 2.76, 5.15), 0.55, 0.011, cable)
    cab += catenary((-2.75, 2.76, 4.2), (-2.75, 2.3, 2.6), 0.5, 0.009, cable)
    for k_ in range(4):
        x_ = -1.6 + k_ * 0.07
        cab += [capsule((x_, 3.0, 2.2), (x_ + 0.05 * np.sin(k_), 1.9 - 0.25 * k_, 2.2 + 0.03 * k_), 0.008, cable)]
    sc.add(cab, margin=0.04)
    cam = Camera((1.35, 1.66, 0.7), (-0.4, 1.15, 4.6), 66.0, roll_deg=1.2)
    lights = [PointLight((lx, 1.555, lz), 1.3, shadow_k=10.0, spot=((0, -1, 0), 0.2, 0.75), falloff_min=0.1),
              PointLight((lx, 1.555, lz), 0.5, shadow_k=6.0, falloff_min=0.5),
              Ambient(0.012, up_bias=0.5)]
    lin, _, _ = render(sc, cam, lights, steps=140, tmax=20.0, ao_dist=0.15)
    return develop(lin, seed, exposure=2.4, bloom=(0.9, 0.35, 12.0), barrel_k=0.07, blur=0.7, vignette=0.55,
                   grain=(0.018, 0.05)), {}


def photo_moth(seed):
    """A friend's room: boxes to the ceiling, posters, two screens, one lamp, him at the desk."""
    sc = Scene()
    rng = np.random.default_rng(42)

    def walls(P, N):
        x, y, z = P
        a = 0.42 * (0.9 + 0.15 * fbm(x * 3, y * 3, z * 3, 2))
        posters = [(0, 0.95, 1.45, 1.2, 1.95, 0.7), (0, 1.62, 2.02, 1.33, 1.86, 0.25), (0, 2.2, 2.75, 1.12, 1.7, 0.55),
                   (1, 0.8, 1.5, 1.2, 1.85, 0.6), (1, 1.7, 2.1, 1.4, 1.95, 0.2)]
        for wall_i, u0, u1, v0, v1, tone in posters:
            on = (z < 0.01) & (x > u0) & (x < u1) if wall_i == 0 else (x > 3.39) & (z > u0) & (z < u1)
            on = on & (y > v0) & (y < v1)
            uu = ((x if wall_i == 0 else z) - u0) / (u1 - u0)
            vv = (y - v0) / (v1 - v0)
            art = 0.35 + tone * 0.6 + 0.12 * np.sin(uu * 9 + vv * 4) - 0.35 * (((uu - 0.5) / 0.22) ** 2 + ((vv - 0.62) / 0.16) ** 2 < 1) \
                - 0.3 * ((np.abs(uu - 0.5) < 0.3) & (vv < 0.45) & (vv > 0.1))
            art = np.where((uu < 0.05) | (uu > 0.95) | (vv < 0.04) | (vv > 0.96), 0.85, art)
            a = np.where(on, np.clip(art, 0.05, 0.9), a)
        return a

    room_shell(sc, 0, 3.4, 2.5, 0, 3.6, sc.mat("mwall", walls), sc.mat("carpet", lambda P, N: 0.26 * (0.8 + 0.4 * fbm(P[0] * 30, P[2] * 30, 0.1, 2))),
               sc.mat("mceil", 0.45))
    desk_m = sc.mat("mdesk", 0.32)
    top = 0.74
    sc.add([box((1.7, top - 0.015, 0.36), (0.92, 0.015, 0.36), desk_m, r=0.004),
            box((0.8, 0.36, 0.36), (0.015, 0.36, 0.34), desk_m), box((2.6, 0.36, 0.36), (0.015, 0.36, 0.34), desk_m)])
    # screen A: a CRT; screen B: a thin flat panel
    XA = Xf((1.2, top, 0.28), rot_y(np.radians(12)))
    XB = Xf((2.18, top, 0.3), rot_y(np.radians(-16)))
    beige = sc.mat("mbeige", 0.45)
    black = sc.mat("mblack", 0.1)
    cA, uA, vA, nA = XA.p((0, 0.245, 0.197)), XA.d((0.165, 0, 0)), XA.d((0, 0.123, 0)), XA.d((0, 0, 1))
    cB, uB, vB, nB = XB.p((0, 0.33, 0.026)), XB.d((0.25, 0, 0)), XB.d((0, 0.15, 0)), XB.d((0, 0, 1))
    sc.add([XA.box((0, 0.015, 0.02), (0.13, 0.015, 0.12), beige, r=0.006),
            XA.box((0, 0.245, 0.14), (0.215, 0.195, 0.055), beige, r=0.022),
            XA.box((0, 0.24, -0.04), (0.17, 0.155, 0.17), beige, r=0.05, k=0.03),
            XA.box((0, 0.245, 0.195), (0.172, 0.13, 0.006), sc.mat("scrA", 0.08, panel_emit(cA, uA, vA, 0.55, "text")), r=0.01),
            XB.box((0, 0.01, 0.0), (0.11, 0.01, 0.09), black, r=0.005),
            XB.box((0, 0.1, -0.02), (0.025, 0.1, 0.012), black),
            XB.box((0, 0.33, 0.0), (0.27, 0.17, 0.022), black, r=0.006),
            XB.box((0, 0.33, 0.021), (0.25, 0.15, 0.004), sc.mat("scrB", 0.08, panel_emit(cB, uB, vB, 0.6, "image")))], margin=0.05)
    # desk clutter: keyboard, cans, papers, mug, figurines, the lamp (on)
    lamp_m = sc.mat("mlamp", 0.2)
    lampbulb = sc.mat("mbulb", 0.9, 6.0)
    clutter = [box((1.62, top + 0.012, 0.6), (0.21, 0.012, 0.07), sc.mat("mkeys", 0.4), r=0.005),
               box((0.98, top + 0.01, 0.55), (0.12, 0.01, 0.15), sc.mat("mpaper", 0.7), R=rot_y(0.3)),
               box((1.0, top + 0.03, 0.52), (0.11, 0.01, 0.15), sc.mat("mpaper", 0.7), R=rot_y(-0.2))]
    for cx, cz in ((1.97, 0.55), (2.03, 0.62), (0.9, 0.2), (2.35, 0.62)):
        clutter.append(cylinder((cx, top, cz), (cx, top + 0.12, cz), 0.033, sc.mat("can", 0.55)))
    for i in range(5):
        fx = 0.9 + i * 0.07
        clutter.append(capsule((fx, top + 0.02, 0.08), (fx, top + 0.11 + 0.03 * (i % 2), 0.08), 0.022, sc.mat("fig%d" % (i % 2), 0.3 + 0.3 * (i % 2))))
        clutter.append(sphere((fx, top + 0.15 + 0.03 * (i % 2), 0.08), 0.03, sc.mat("fig%d" % (i % 2), 0.3 + 0.3 * (i % 2))))
    lb = vec(0.93, top, 0.36)
    clutter += [cylinder(lb, lb + vec(0, 0.02, 0), 0.07, lamp_m),
                capsule(lb + vec(0, 0.02, 0), lb + vec(0.02, 0.4, -0.06), 0.011, lamp_m),
                capsule(lb + vec(0.02, 0.4, -0.06), lb + vec(0.14, 0.46, 0.06), 0.011, lamp_m),
                capped_cone(lb + vec(0.14, 0.47, 0.06), lb + vec(0.18, 0.39, 0.12), 0.03, 0.075, lamp_m),
                sphere(lb + vec(0.178, 0.39, 0.118), 0.022, lampbulb)]
    sc.add(clutter, margin=0.05)
    # boxes stacked high on both sides
    def cardboard(P, N):
        return 0.5 * (0.8 + 0.35 * fbm(P[0] * 8, P[1] * 8, P[2] * 8, 2))
    card = sc.mat("card", cardboard)
    stacks = []
    for (sx, sz, n_) in ((0.28, 0.3, 5), (0.3, 0.8, 4), (0.28, 1.3, 3), (0.35, 2.7, 2), (3.1, 0.3, 5), (3.12, 0.85, 4),
                         (3.1, 1.45, 3), (2.95, 3.1, 2), (0.6, 3.2, 1)):
        y_ = 0.0
        for k_ in range(n_):
            bw, bh, bd = rng.uniform(0.16, 0.24), rng.uniform(0.1, 0.17), rng.uniform(0.16, 0.22)
            stacks.append(box((sx + rng.uniform(-0.03, 0.03), y_ + bh, sz + rng.uniform(-0.03, 0.03)), (bw, bh, bd), card,
                              R=rot_y(rng.uniform(-0.15, 0.15)), r=0.01))
            y_ += 2 * bh
    sc.add(stacks, margin=0.04)
    # floor: clothes, cables, a bag, a bin
    def lumpy(x, y, z):
        return 0.02 * np.sin(17 * x + 3) * np.sin(13 * z + 1) * np.sin(11 * y)
    cloth_m = sc.mat("clothes", 0.2)
    floor = [ellipsoid((2.75, 0.07, 2.3), (0.35, 0.09, 0.25), cloth_m, R=rot_y(0.4), disp=lumpy),
             ellipsoid((2.55, 0.05, 2.55), (0.2, 0.06, 0.16), sc.mat("clothes2", 0.4), disp=lumpy),
             ellipsoid((0.75, 0.17, 1.65), (0.16, 0.17, 0.12), sc.mat("bag", 0.12), disp=lumpy),
             cylinder((0.62, 0.0, 2.1), (0.62, 0.34, 2.1), 0.14, sc.mat("bin", 0.3)),
             sphere((0.64, 0.36, 2.08), 0.05, sc.mat("mpaper", 0.7)), sphere((0.58, 0.37, 2.13), 0.04, sc.mat("mpaper", 0.7))]
    floor += catenary((1.4, 0.74, 0.05), (1.9, 0.01, 1.0), -0.02, 0.006, sc.mat("mcable", 0.05))
    floor += [capsule((1.9, 0.008, 1.0), (2.6, 0.008, 1.3), 0.006, sc.mat("mcable", 0.05)),
              capsule((2.6, 0.008, 1.3), (3.2, 0.008, 1.2), 0.006, sc.mat("mcable", 0.05))]
    sc.add(floor, margin=0.04)
    chair(sc, {"pos": (1.66, 0, 1.12), "yaw": np.pi - 0.08})
    J = pose_joints("typing", (1.66, 0.565, 1.1), np.pi - 0.08)
    figure(sc, J, "moth")
    cam = Camera((2.25, 1.63, 3.3), (1.55, 0.95, 0.35), 70.0, roll_deg=-2.0)
    lamp_pos = lb + vec(0.18, 0.355, 0.12)
    lights = [AreaLight(cA, uA, vA, nA, 0.8, shadow_k=5.0), AreaLight(cB, uB, vB, nB, 1.0, shadow_k=5.0),
              PointLight(lamp_pos, 0.7, shadow_k=8.0, spot=((0.4, -1, 0.5), 0.3, 0.8), falloff_min=0.05),
              PointLight(lamp_pos + vec(0, 0.05, 0), 0.05, falloff_min=0.4),
              Ambient(0.02, up_bias=0.4)]
    lin, _, _ = render(sc, cam, lights, steps=130, ao_dist=0.15)
    return develop(lin, seed, exposure=3.2, bloom=(0.9, 0.3, 12.0), barrel_k=0.06, blur=0.7, vignette=0.5,
                   grain=(0.018, 0.045)), {}


POSES["sign"] = dict(POSES["standing"], sh=(0.16, 0.5, 0.0), el=(0.2, 0.25, 0.1), wr=(0.18, 0.33, 0.3), ha=(0.16, 0.37, 0.35),
                     hfwd=(0, -0.05, 1))
POSES["standing_him"] = dict(POSES["standing"], hfwd=(0.12, -0.04, 1), el=(0.23, 0.25, -0.04), wr=(0.21, 0.03, 0.04), ha=(0.19, -0.05, 0.08))
EXPO_WOMAN = (0.3, 0.965, 7.0)
EXPO_HIM = (-0.3, 0.97, 7.08)


def build_expo(with_him):
    sc = Scene()

    def plaza(P, N):
        x, z = P[0], P[2]
        seam = (np.abs((x / 1.2) % 1 - 0.5) > 0.485) | (np.abs((z / 1.2) % 1 - 0.5) > 0.485)
        base = 0.42 * (0.88 + 0.2 * fbm(x * 0.8, z * 0.8, 0.2, 3))
        return np.where(seam, base * 0.7, base)

    def facade(P, N):
        x, y, z = P
        front = N[2] < -0.5
        band = 0.5 + 0.12 * ((np.floor(y / 1.6) % 2) == 0)
        glass = (np.abs(x) < 13) & (y < 6.0)
        mull = (np.abs((x / 2.0) % 1 - 0.5) > 0.46) | (np.abs((y / 3.0) % 1 - 0.5) > 0.45)
        a = np.where(front & glass, np.where(mull, 0.4, 0.1), band)
        strip = front & (y > 7.0) & ((y % 1.6) < 0.5) & (np.abs(x) > 9)
        a = np.where(strip, 0.2, a)
        ban = front & (np.abs(x) < 7.5) & (y > 8.2) & (y < 14.4)
        bu, bv = x / 7.5, (y - 11.3) / 3.1
        art = 0.78 - 0.55 * (((bu + 0.55) / 0.3) ** 2 + (bv / 0.75) ** 2 < 1) - 0.3 * (np.abs(bv + bu * 0.8 - 0.2) < 0.12) \
            - 0.25 * ((bu > 0.0) & (bu < 0.85) & (np.abs(bv - 0.45) < 0.14)) - 0.25 * ((bu > 0.0) & (bu < 0.6) & (np.abs(bv - 0.05) < 0.1))
        a = np.where(ban, art, a)
        a = np.where(ban & ((np.abs(bu) > 0.97) | (np.abs(bv) > 0.95)), 0.3, a)
        return a

    sc.add([halfspace(1, 0, 1, sc.mat("plaza", plaza))], bounded=False)
    fac = sc.mat("facade", facade)
    concrete = sc.mat("canopy", 0.55)
    sc.add([box((0, 9.5, 58), (42, 9.5, 10), fac),
            box((0, 6.35, 46.2), (14, 0.18, 1.8), concrete),
            box((34, 6.5, 40), (10, 6.5, 6), sc.mat("wing", 0.45)),
            box((-36, 5.5, 36), (9, 5.5, 5), sc.mat("wing2", 0.38))], margin=0.1)
    sc.add([cylinder((xc, 0, 44.8), (xc, 6.2, 44.8), 0.25, concrete) for xc in (-12, -6, 6, 12)], margin=0.1)
    poles = sc.mat("pole", 0.25)
    for px, pz in ((-7.5, 16), (8.5, 21), (-11, 29)):
        sc.add([capsule((px, 0, pz), (px, 5.2, pz), 0.07, poles), box((px + 0.35, 5.2, pz), (0.45, 0.06, 0.12), poles)], margin=0.1)
    # the crowd: small people, clustered near the entrance, a few nearer
    rng = np.random.default_rng(2024)
    tones = [sc.mat("crowd%d" % i, a) for i, a in enumerate((0.12, 0.2, 0.3, 0.42, 0.55))]
    skin = sc.mat("crowdskin", 0.5)
    people = []
    clusters = [(-9, 40, 4.0, 3.0, 16), (-2, 42, 5.0, 2.5, 20), (6, 39, 4.0, 3.0, 16), (12, 42, 3, 2.5, 10), (-14, 38, 2.5, 2.0, 8),
                (-5, 30, 3.0, 2.5, 7), (4, 27, 2.0, 2.0, 4), (-8, 22, 1.5, 1.5, 2), (9, 18, 1.2, 1.2, 2), (1.5, 34, 3, 2, 7),
                (-3, 37, 3, 2, 8), (9, 34, 2.5, 2, 6), (-12, 32, 2, 2, 4)]
    for cx, cz, sx, sz, n_ in clusters:
        grp = []
        for _ in range(n_):
            x, z = cx + rng.normal(0, sx * 0.5), cz + rng.normal(0, sz * 0.5)
            hgt = rng.uniform(1.55, 1.85)
            tone = tones[int(rng.integers(0, 5))]
            ang = rng.uniform(0, 2 * np.pi)
            side = vec(np.cos(ang), 0, np.sin(ang)) * 0.09
            base = vec(x, 0, z)
            grp += [capsule(base + side + vec(0, 0.06, 0), base + side * 0.8 + vec(0, 0.5 * hgt, 0), 0.07, tones[0]),
                    capsule(base - side + vec(0, 0.06, 0), base - side * 0.8 + vec(0, 0.5 * hgt, 0), 0.07, tones[0]),
                    cone(base + vec(0, 0.52 * hgt, 0), base + vec(0, 0.8 * hgt, 0), 0.15, 0.19, tone, k=0.05),
                    sphere(base + vec(0, 0.92 * hgt, 0), 0.105, skin if rng.random() < 0.4 else tones[0], k=0.03)]
            if rng.random() < 0.3:
                grp.append(box(base + vec(0, 0.62 * hgt, 0) - side * 2.2, (0.1, 0.15, 0.06), tones[1], r=0.03))
        people.append(grp)
    for grp in people:
        sc.add(grp, margin=0.1)
    # her, holding up a small board
    J = pose_joints("sign", EXPO_WOMAN, np.pi)
    board_c = np.asarray(EXPO_WOMAN) + rot_y(np.pi) @ vec(0, 0.36, 0.37)

    def board_alb(P, N):
        u_ = -(P[0] - board_c[0]) / 0.2
        v_ = (P[1] - board_c[1]) / 0.14
        a = np.full(u_.shape, 0.86, F32)
        a = np.where((np.abs(v_ - 0.35) < 0.14) & (np.abs(u_) < 0.7), 0.2, a)
        a = np.where((np.abs(v_ + 0.15) < 0.1) & (np.abs(u_ + 0.15) < 0.55), 0.3, a)
        a = np.where(((u_ - 0.62) ** 2 + (v_ + 0.4) ** 2) < 0.03, 0.25, a)
        return np.where(N[2] < -0.3, a, 0.5)

    woman = figure_prims(sc, J, "woman")
    woman.append(box(board_c, (0.2, 0.14, 0.008), sc.mat("board", board_alb), R=rot_x(np.radians(-8)), r=0.004))
    sc.add(woman, margin=0.05)
    if with_him:
        figure(sc, pose_joints("standing_him", EXPO_HIM, np.pi - 0.06), "jackie")
    return sc


def expo_photo(with_him, seed):
    sc = build_expo(with_him)
    cam = Camera((0.1, 1.62, 0.0), (0.05, 3.2, 40.0), 56.0, roll_deg=1.1)

    def sky(rd):
        up = np.clip(rd[1], 0, 1)
        return 1.25 - 0.45 * up + 0.08 * fbm(rd[0] * 6, rd[1] * 14, 0.3, 3)

    lights = [DirLight((-0.5, 0.7, -0.45), 1.9, shadow_k=10.0),
              Ambient(0.55, up_bias=0.65, ao_pow=1.2)]
    lin, _, _ = render(sc, cam, lights, steps=150, tmax=120.0, ao_dist=0.3, background=sky)
    return develop(lin, 20250503, exposure=0.6, bloom=(0.95, 0.15, 10.0), barrel_k=0.05, blur=0.75, vignette=0.45,
                   grain=(0.02, 0.035)), {}


def photo_expo_01(seed):
    return expo_photo(False, seed)


def photo_expo_02(seed):
    return expo_photo(True, seed)


# ------------------------------------------------------------------ registry
PHOTOS = {name: photo_room for name in ROOM_STATES}
PHOTOS.update({"desk": photo_desk, "window": photo_window, "workshop": photo_workshop, "moth": photo_moth,
               "expo_01": photo_expo_01, "expo_02": photo_expo_02, "print": photo_print, "rooms": photo_rooms})


def run(name):
    t0 = time.time()
    seed = zlib.crc32(name.encode())
    img, extra = PHOTOS[name](name, seed) if PHOTOS[name] is photo_room else PHOTOS[name](seed)
    Image.fromarray(img.astype(np.uint8), "L").save(OUT / f"{name}.png", optimize=True)
    return name, time.time() - t0, float(img.mean()), extra


def contact_sheet(names):
    sheet_path = Path(os.environ.get("PHOTO_SHEET", ""))
    if not sheet_path.name:
        return
    tw, th, pad, lab = 320, 200, 8, 16
    cells = [n for n in names] + ["room_010 quad"]
    cols = 5
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + pad + lab) + pad), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for i, n in enumerate(cells):
        x, y = pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + pad + lab)
        if n == "room_010 quad":
            src = OUT / "room_010.png"
            if not src.exists():
                continue
            im = Image.open(src).convert("RGB")
            quad = json.loads((OUT / "room-screen.json").read_text())["screen"]
            dd = ImageDraw.Draw(im)
            dd.polygon([tuple(p) for p in quad], outline=(255, 40, 40))
            for p in quad:
                dd.ellipse([p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2], outline=(255, 220, 0))
            crop = im.crop((int(min(p[0] for p in quad)) - 40, int(min(p[1] for p in quad)) - 25,
                            int(max(p[0] for p in quad)) + 40, int(max(p[1] for p in quad)) + 25))
            im = crop.resize((tw, th), Image.NEAREST)
        else:
            src = OUT / f"{n}.png"
            if not src.exists():
                continue
            im = Image.open(src).convert("RGB").resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (x, y))
        d.text((x, y + th + 2), n, fill=(220, 220, 220), font=font)
    sheet.save(sheet_path)
    print("sheet", sheet_path)


def main():
    want = sys.argv[1:] or list(PHOTOS)
    unknown = [n for n in want if n not in PHOTOS]
    if unknown:
        sys.exit("unknown photo(s): " + ", ".join(unknown) + "\nknown: " + ", ".join(PHOTOS))
    OUT.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    workers = max(1, min(len(want), (os.cpu_count() or 2) - 1))
    with ProcessPoolExecutor(workers) as ex:
        for name, dt, mean, extra in ex.map(run, want):
            print(f"{name:10s} {dt:6.1f}s  mean {mean:5.1f}")
            if "quad" in extra:
                (OUT / "room-screen.json").write_text(json.dumps({"screen": extra["quad"]}) + "\n")
    print(f"total {time.time() - t0:.1f}s")
    contact_sheet(list(PHOTOS))


if __name__ == "__main__":
    main()
