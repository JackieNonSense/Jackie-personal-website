"""Builds the relighting maps for the /terminal CRT shell.

The shell is the photographed cutout `public/portfolio/monitor-cyan-cutout-v02.png`.
Its macro geometry (glass cap, recess wall, bezel bevel, frame face) is measured by
hand from that photo and rebuilt here as a height field, so the phosphor can light
the plastic from the correct direction. Fine relief comes from the photo itself.

Output `public/terminal/shell-normal.png`:
  RGB  surface normal, image space (x right, y down, z toward the viewer), 0.5 + 0.5n
Output `public/terminal/shell-occlusion.png`:
  R    cavity occlusion
  G    bevel mask (surfaces that catch the phosphor)
  B    height above the glass edge, 0..HEIGHT_RANGE px mapped to 0..255
Heights and masks live in opaque RGB so browsers never premultiply them away.

Run: python scripts/build-terminal-shell.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/portfolio/monitor-cyan-cutout-v02.png"
OUT = ROOT / "public/terminal"

# Glass cap: superellipse measured by flood fill of the unlit glass.
GLASS_C = (764.5, 443.5)
GLASS_R = (459.5, 278.5)
GLASS_N = 12.0
HEIGHT_RANGE = 64.0

# Nested edges [left, right, top, bottom] from the glass outward:
# glass edge, recess lip, bevel outer edge, frame outer edge (groove).
RINGS = np.array([
    [305, 1224, 165, 722],
    [292, 1238, 130, 730],
    [265, 1272, 118, 740],
    [249, 1279, 114, 762],
], dtype=float)
# Height at each ring. The recess wall is steep, the bevel moderate, the frame flat.
RING_H = np.array([0.0, 26.0, 38.0, 40.0])
BODY_H = 34.0


def side_level(coord, edges, outward):
    """Ring level (0..3, extrapolated) of a coordinate along one side."""
    e = edges if outward > 0 else -edges
    c = coord if outward > 0 else -coord
    # e increases with level for this orientation
    lv = np.interp(c, e, np.arange(4.0))
    lv = np.where(c < e[0], (c - e[0]) / (e[1] - e[0]), lv)
    lv = np.where(c > e[3], 3 + (c - e[3]) / 6.0, lv)
    return lv


def main():
    img = np.asarray(Image.open(SRC)).astype(np.float64)
    h, w = img.shape[:2]
    alpha = img[..., 3] / 255.0
    lum = img[..., :3].mean(-1) / 255.0
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64)

    # Superellipse glass mask and its normalised radius.
    gx = (xs - GLASS_C[0]) / GLASS_R[0]
    gy = (ys - GLASS_C[1]) / GLASS_R[1]
    radius = (np.abs(gx) ** GLASS_N + np.abs(gy) ** GLASS_N) ** (1 / GLASS_N)
    glass = radius < 1.0

    # Level from the nested rectangles: the side the point is furthest out on wins.
    left = side_level(xs, RINGS[:, 0], -1)
    right = side_level(xs, RINGS[:, 1], 1)
    top = side_level(ys, RINGS[:, 2], -1)
    bottom = side_level(ys, RINGS[:, 3], 1)
    level = np.maximum.reduce([left, right, top, bottom])
    # Rounded glass corners: pixels outside the cap but inside the first rectangle
    # belong to the recess wall; measure them by distance from the cap instead.
    dist_out = nd.distance_transform_edt(~glass)
    corner = (~glass) & (level < 0)
    level = np.where(corner, dist_out / 14.0, level)

    height = np.interp(level, np.arange(4.0), RING_H)
    height = np.where(level > 3.0, BODY_H + (RING_H[3] - BODY_H) * np.exp(-(level - 3.0) * 3.0), height)
    # Convex cap: the centre of the tube bulges toward the viewer.
    cap = 14.0 * np.clip(1.0 - radius ** 2, 0.0, 1.0)
    height = np.where(glass, cap, height)

    # Fine relief from the photograph: ribs, grille holes, grain. High-pass only,
    # so the baked studio light does not become fake geometry.
    shell = (~glass) & (alpha > 0.5)
    detail = lum - nd.gaussian_filter(lum, 3.0)
    height_fine = height + np.where(shell, np.clip(detail, -0.15, 0.15) * 18.0, 0.0)
    height_fine = nd.gaussian_filter(height_fine, 0.6)

    gy_, gx_ = np.gradient(height_fine)
    normal = np.stack([-gx_, -gy_, np.ones_like(gx_)], -1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    normal[alpha < 0.02] = (0.0, 0.0, 1.0)

    # Cavity occlusion: how far below its neighbourhood each point sits.
    around = nd.gaussian_filter(height, 14.0)
    occlusion = np.clip(1.0 - np.maximum(around - height, 0.0) * 0.045, 0.25, 1.0)
    occlusion = np.where(glass, 1.0, occlusion)

    # Surfaces between the glass and the frame face catch most of the phosphor.
    bevel = np.clip(1.0 - np.abs(level - 1.2) / 1.9, 0.0, 1.0) * (~glass)

    OUT.mkdir(parents=True, exist_ok=True)
    rgb = np.clip((normal * 0.5 + 0.5) * 255.0 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(OUT / "shell-normal.png", optimize=True)

    occ = np.zeros((h, w, 3), np.uint8)
    occ[..., 0] = (occlusion * 255).astype(np.uint8)
    occ[..., 1] = (bevel * 255).astype(np.uint8)
    occ[..., 2] = np.clip(height_fine / HEIGHT_RANGE * 255.0 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(occ).save(OUT / "shell-occlusion.png", optimize=True)
    print("wrote", OUT / "shell-normal.png", OUT / "shell-occlusion.png")


if __name__ == "__main__":
    main()
