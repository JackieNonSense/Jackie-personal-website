/**
 * Measurements of the photographed set, in pixels of the 1536 x 1024 cutout.
 * scripts/build-terminal-shell.py uses the same glass and ring values.
 */
export const SHELL = {
  photo: '/portfolio/monitor-cyan-cutout-v02.png',
  normal: '/terminal/shell-normal.png',
  occlusion: '/terminal/shell-occlusion.png',
  width: 1536,
  height: 1024,
  /** Opaque silhouette, feet included. */
  bounds: { x: 114, y: 78, w: 1306, h: 870 },
  /** Where the front feet meet the tabletop. */
  floor: 946,
  heightRange: 64,
} as const;

/** The tube face: a superellipse, with the active raster inset by overscan. */
export const GLASS = { cx: 764.5, cy: 443.5, rx: 459.5, ry: 278.5, n: 12, overscan: 0.935, curvature: 0.045 } as const;

export type Layout = { scale: number; x: number; y: number; closeUp: boolean };
/** Visible band of the viewport; a phone keyboard covers the rest. */
export type Visible = { top: number; height: number };

/** Narrowest character, in CSS pixels, at which 80 columns still read. */
const MIN_CHAR_WIDTH = 5.5;

/**
 * Places the set in a viewport. On a desk the whole set stands centred, a little high
 * so the tabletop shows beneath it. When 80 columns would be too small to read, the
 * view closes in until the glass fills the width, centred in the visible band.
 */
export function layoutShell(width: number, height: number, visible: Visible = { top: 0, height }): Layout {
  const { bounds } = SHELL;
  const scale = Math.min((width * 0.88) / bounds.w, (height * 0.76) / bounds.h);
  if ((2 * GLASS.rx * GLASS.overscan * scale) / 80 >= MIN_CHAR_WIDTH) return {
    scale,
    x: width / 2 - (bounds.x + bounds.w / 2) * scale,
    y: height * 0.46 - (bounds.y + bounds.h / 2) * scale,
    closeUp: false,
  };
  const close = Math.min((width * 0.96) / (2 * GLASS.rx), (visible.height * 0.8) / (2 * GLASS.ry));
  return {
    scale: close,
    x: width / 2 - GLASS.cx * close,
    y: visible.top + visible.height * 0.48 - GLASS.cy * close,
    closeUp: true,
  };
}

/**
 * Extra beam width, in scanlines, for displays too coarse to resolve 400 lines.
 * The content stays at full resolution; the lines just merge instead of aliasing.
 */
export function beamSpread(scale: number): number {
  const pixelsPerLine = (2 * GLASS.ry * GLASS.overscan * scale) / 400;
  return Math.min(1, Math.max(0, (2.3 - pixelsPerLine) / 1.3)) * 0.3;
}

/**
 * Where a point of the viewport falls on the raster, as the composite shader draws
 * it: into the photograph, onto the glass, through the tube's curvature. u and v run
 * 0..1 across the raster (v down); outside the glass they run past 0 or 1.
 */
export function rasterAt(layout: Layout, x: number, y: number): { u: number; v: number } {
  const ix = (x - layout.x) / layout.scale, iy = (y - layout.y) / layout.scale;
  const qx = (ix - GLASS.cx) / GLASS.rx, qy = (iy - GLASS.cy) / GLASS.ry;
  const k = (1 + GLASS.curvature * (qx * qx + qy * qy)) / GLASS.overscan;
  return { u: qx * k * 0.5 + 0.5, v: qy * k * 0.5 + 0.5 };
}

/** A rectangle in pixels of the shell photograph. */
export type ShellRect = { x: number; y: number; w: number; h: number };

/**
 * The controls on the front of the set, measured on the photograph: six push
 * buttons in a row under the screen (each `hit` reaches to the next; `face` is
 * the key itself), and the round knob on the right, which is the power.
 */
export const CONTROLS = {
  buttons: [
    { hit: { x: 709, y: 869, w: 32, h: 37 }, face: { x: 710, y: 871, w: 25, h: 34 } },
    { hit: { x: 741, y: 869, w: 36, h: 37 }, face: { x: 742, y: 871, w: 24, h: 34 } },
    { hit: { x: 777, y: 869, w: 35, h: 37 }, face: { x: 777, y: 871, w: 27, h: 34 } },
    { hit: { x: 812, y: 869, w: 35, h: 37 }, face: { x: 813, y: 871, w: 25, h: 34 } },
    { hit: { x: 847, y: 869, w: 38, h: 37 }, face: { x: 847, y: 871, w: 26, h: 34 } },
    { hit: { x: 885, y: 869, w: 40, h: 37 }, face: { x: 885, y: 871, w: 38, h: 34 } },
  ],
  knob: { cx: 1206, cy: 855, r: 16 },
} as const;

export type Control = { kind: 'button'; index: number } | { kind: 'knob' };

/** A point of the viewport in pixels of the photograph. */
export function shellAt(layout: Layout, x: number, y: number): { x: number; y: number } {
  return { x: (x - layout.x) / layout.scale, y: (y - layout.y) / layout.scale };
}

/** The control under a point of the viewport, if any; `slop` widens every target, in photograph pixels. */
export function controlAt(layout: Layout, x: number, y: number, slop = 0): Control | null {
  const p = shellAt(layout, x, y);
  const k = CONTROLS.knob;
  if (Math.hypot(p.x - k.cx, p.y - k.cy) <= k.r + slop) return { kind: 'knob' };
  // The buttons touch one another: only the row's outer edges widen.
  const row = CONTROLS.buttons, first = row[0].hit, last = row[row.length - 1].hit;
  if (p.x < first.x - slop || p.x >= last.x + last.w + slop || p.y < first.y - slop || p.y >= first.y + first.h + slop) return null;
  const index = row.findIndex(({ hit }) => p.x < hit.x + hit.w);
  return { kind: 'button', index: index < 0 ? row.length - 1 : index };
}

/** How far out on the glass a point is: under 1 is on the tube face (the shader's superellipse). */
export function glassRadius(layout: Layout, x: number, y: number): number {
  const p = shellAt(layout, x, y);
  const qx = Math.abs((p.x - GLASS.cx) / GLASS.rx), qy = Math.abs((p.y - GLASS.cy) / GLASS.ry);
  return (qx ** GLASS.n + qy ** GLASS.n) ** (1 / GLASS.n);
}

/**
 * A point of the viewport on the raster, in raster pixels. `inside` is whether it
 * is on the glass; on the glass but past the raster's edge (the overscan border),
 * the point is held at the edge.
 */
export function rasterPoint(layout: Layout, x: number, y: number, width = 640, height = 400): { x: number; y: number; inside: boolean } {
  const { u, v } = rasterAt(layout, x, y);
  return {
    x: Math.min(width - 1, Math.max(0, u * width)),
    y: Math.min(height - 1, Math.max(0, v * height)),
    inside: glassRadius(layout, x, y) < 0.996,
  };
}

/** Where a raster point shows in the viewport: rasterAt, undone (for scripts and tests). */
export function cssAt(layout: Layout, rx: number, ry: number, width = 640, height = 400): { x: number; y: number } {
  // Solve for the glass point q whose curved image is the wanted raster point.
  const tx = ((rx / width - 0.5) * 2) * GLASS.overscan, ty = ((ry / height - 0.5) * 2) * GLASS.overscan;
  let qx = tx, qy = ty;
  for (let i = 0; i < 8; i++) {
    const k = 1 + GLASS.curvature * (qx * qx + qy * qy);
    qx = tx / k; qy = ty / k;
  }
  return { x: layout.x + (GLASS.cx + qx * GLASS.rx) * layout.scale, y: layout.y + (GLASS.cy + qy * GLASS.ry) * layout.scale };
}
