/** The head unit's display, laid out the way a 2002 Panasonic crowded its glass:
 *    - an amber title band in dot-matrix cells, with TRACK / DISC tell-tales in the step;
 *    - twin channel gauges down the left, segmented, with their level in dB;
 *    - a tunnel spectrum: bars on a wall seen through one perspective camera, with their
 *      reflection below the seam;
 *    - a progress dial on the right, the time inside it, the track above;
 *    - a row of transport tell-tales and the band scale along the foot.
 *  Everything is placed in the model's centimetres so it lands inside the glass. */

export const DISPLAY_CANVAS = { width: 1280, height: 528 };
// The display glass's bounds on the faceplate, in cm (matches the Blender source).
const X0 = -13.6, X1 = 7.75, Z0 = 2.8, Z1 = 11.6;
const DX0 = -13.6, DX1 = 7.0;

export const INK = {
  deep: '#1f7a52', jade: '#34c98a', mint: '#8ff5c4', dim: '#0c2219', faint: '#123a2b',
  amber: '#f0b25a', amberHi: '#ffe0a0', amberDim: '#2b200f', violet: '#6f6bff', violetHi: '#c2b8ff', violetDim: '#1a1740',
  cyan: '#3fc8ef', cyanDim: '#0b2733', coral: '#ff8457', coralDim: '#32160d',
};

export type DisplayFrame = {
  title: string; track: number; tracks?: number; time: number; duration?: number;
  status?: string; muted?: boolean; scanning?: boolean; disc?: boolean;
  /** 0..1 per column, low to high. */
  bands: ArrayLike<number>;
  peaks?: ArrayLike<number>;
  /** Channel levels, 0..1. */
  left: number; right: number;
  /** Time-domain samples, -1..1, or empty for a flat seam. */
  wave: ArrayLike<number>;
  /** 0..1: how far the display has woken. */
  lit: number;
  /** Seconds, for the parts that move on their own; bass 0..1 rolls the floor. */
  clock?: number; bass?: number;
  /** 0..1 after a track change: a light sweeps the title band. */
  swap?: number;
};

const DOT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [15, 16, 16, 16, 16, 16, 15], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [15, 16, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [31, 4, 4, 4, 4, 4, 31], J: [7, 2, 2, 2, 18, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 25, 21, 19, 19, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '_': [0, 0, 0, 0, 0, 0, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [30, 1, 1, 14, 1, 1, 30],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};
const SEG: Record<string, [number, number, number, number]> = { a: [5, 0, 25, 0], b: [29, 4, 29, 23], c: [29, 31, 29, 50], d: [5, 54, 25, 54], e: [1, 31, 1, 50], f: [1, 4, 1, 23], g: [5, 27, 25, 27] };
const PATTERN = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgecd', 'abc', 'abcdefg', 'abfgcd'];

/** Map the model's cm to canvas pixels. */
export function toCanvas(x: number, z: number) {
  return [(x - X0) / (X1 - X0) * DISPLAY_CANVAS.width, (1 - (z - Z0) / (Z1 - Z0)) * DISPLAY_CANVAS.height] as const;
}
const S = DISPLAY_CANVAS.width / (X1 - X0);

/* The tunnel is a real wall seen in perspective through one pinhole camera, so every
 * line that runs along it - bar edges, the seam, the floor rails - meets at the same
 * vanishing point. The wall starts at depth 1 and runs away along (1, 0, 1). */
const TUNNEL = { near: DX0 + 5.2, vx: DX1 - 3.9, seam: Z0 + 3.95, up: 3.4, floor: 2.75, columns: 24, depth: 3.1 };
const CAM = { cx: TUNNEL.near - 2.2, f: 0 };
CAM.f = TUNNEL.vx - CAM.cx;
const WALL_X = (TUNNEL.near - CAM.cx) / CAM.f;
const WORLD = (cm: number) => cm / CAM.f;

/** Screen position (cm) of a point on the wall: t along the wall, y up, l out across the floor. */
export function wallPoint(t: number, y: number, l = 0): [number, number] {
  const X = WALL_X + t - l, Z = 1 + t - l;
  return [CAM.cx + CAM.f * X / Z, TUNNEL.seam + CAM.f * y / Z];
}

/** A column's front edge along the wall, its width there, and its full height on screen. */
export function tunnelColumn(i: number, count: number = TUNNEL.columns) {
  const pitch = TUNNEL.depth / count, t = i * pitch, w = pitch * .62;
  const [x0] = wallPoint(t, 0), [x1] = wallPoint(t + w, 0);
  const [, top] = wallPoint(t, WORLD(TUNNEL.up));
  return { t, w, x: x0, width: x1 - x0, span: top - TUNNEL.seam };
}

function quad(c: CanvasRenderingContext2D, pts: [number, number][]) {
  c.beginPath();
  pts.forEach(([x, z], i) => { const [px, py] = toCanvas(x, z); if (i) c.lineTo(px, py); else c.moveTo(px, py); });
  c.closePath(); c.fill();
}
function rect(c: CanvasRenderingContext2D, x0: number, z0: number, x1: number, z1: number) {
  const [a, b] = toCanvas(x0, z1), [d, e] = toCanvas(x1, z0);
  c.fillRect(a, b, d - a, e - b);
}
function line(c: CanvasRenderingContext2D, pts: [number, number][]) {
  c.beginPath();
  pts.forEach(([x, z], i) => { const [px, py] = toCanvas(x, z); if (i) c.lineTo(px, py); else c.moveTo(px, py); });
  c.stroke();
}
function label(c: CanvasRenderingContext2D, text: string, x: number, z: number, size: number, color: string, align: CanvasTextAlign = 'left') {
  const [px, py] = toCanvas(x, z);
  c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle';
  c.font = `bold ${Math.round(size * S)}px "Arial Narrow", "Tw Cen MT Condensed", Arial, sans-serif`;
  c.fillText(text, px, py);
}

function seven(c: CanvasRenderingContext2D, text: string, x: number, z: number, scale: number, color: string, dim: string, width = .07) {
  c.lineCap = 'round'; c.lineWidth = width * S;
  [...text].forEach((ch, i) => {
    if (ch === ':') {
      c.fillStyle = color;
      for (const y of [17, 38]) rect(c, x + (i * 39 + 11) * scale, z - (y + 5) * scale, x + (i * 39 + 16) * scale, z - y * scale);
      return;
    }
    for (const [key, [x1, y1, x2, y2]] of Object.entries(SEG)) {
      c.strokeStyle = PATTERN[Number(ch)]?.includes(key) ? color : dim;
      // A slight italic, the way segment glass was moulded.
      const sl = (y: number) => (54 - y) * scale * .12;
      line(c, [[x + (i * 39 + x1) * scale + sl(y1), z - y1 * scale], [x + (i * 39 + x2) * scale + sl(y2), z - y2 * scale]]);
    }
  });
}

function dots(c: CanvasRenderingContext2D, ch: string, x: number, top: number, pitch: number, dot: number) {
  (DOT[ch] ?? DOT[' ']).forEach((bits, row) => {
    for (let col = 0; col < 5; col++) if (bits & (1 << (4 - col))) rect(c, x + col * pitch, top - row * pitch - dot, x + col * pitch + dot, top - row * pitch);
  });
}

/** Draw the display with a phosphor glow: the art is drawn once onto a layer, then
 *  laid down blurred and added, then sharp on top. */
export function drawGlowingDisplay(target: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, f: DisplayFrame) {
  const { width, height } = DISPLAY_CANVAS;
  drawDisplay(layer, f);
  target.save();
  target.globalCompositeOperation = 'copy';
  target.drawImage(layer.canvas, 0, 0);
  target.globalCompositeOperation = 'lighter';
  target.globalAlpha = .7; target.filter = 'blur(10px)';
  target.drawImage(layer.canvas, 0, 0, width, height);
  target.globalAlpha = .5; target.filter = 'blur(3px)';
  target.drawImage(layer.canvas, 0, 0, width, height);
  target.restore();
}

export function drawDisplay(c: CanvasRenderingContext2D, f: DisplayFrame) {
  const { width, height } = DISPLAY_CANVAS;
  const t = f.clock ?? 0, status = f.status ?? 'playing';
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#010302'; c.fillRect(0, 0, width, height);
  if (f.lit <= 0) { c.restore(); return; }
  // Waking: every segment flashes once (the self-test), then the grid comes up left to right.
  const test = f.lit < .35;
  c.beginPath(); c.rect(0, 0, width * Math.min(1, f.lit * 1.2), height); c.clip();

  // ----- furniture printed on the glass: corner sweeps, edge scale, the tunnel floor.
  c.strokeStyle = INK.faint; c.lineCap = 'butt';
  c.lineWidth = .14 * S;
  for (const [x, z, r, a0, a1] of [[DX0 + 3.6, Z1 - 2.6, 3.0, 118, 172], [DX0 + 3.3, Z0 + 2.4, 2.8, 188, 246]]) {
    const [cx, cy] = toCanvas(x, z);
    c.beginPath(); c.arc(cx, cy, r * S, -a0 * Math.PI / 180, -a1 * Math.PI / 180, true); c.stroke();
  }
  c.lineWidth = .03 * S; c.strokeStyle = INK.deep;
  for (let i = 0; i < 18; i++) { const z = Z0 + 1.1 + i * .36; line(c, [[DX0 + .15, z], [DX0 + (i % 3 ? .3 : .5), z]]); }
  // ----- title band: amber dot-matrix cells, a light sweeping them after a change.
  const msg = ('<<' + f.title.toUpperCase().replace(/[^A-Z0-9 <>_]/g, '_') + '>>').slice(0, 13);
  const cells = 13, cw = .62, gap = .07, tx = DX0 + 5.95, top = Z1 - .22;
  const padded = test ? '█'.repeat(cells) : msg.padStart(Math.floor((cells + msg.length) / 2)).padEnd(cells);
  const sweep = f.swap !== undefined && f.swap < 1 ? tx + f.swap * cells * (cw + gap) : -99;
  for (let i = 0; i < cells; i++) {
    const x = tx + i * (cw + gap);
    c.fillStyle = INK.amberDim; rect(c, x, top - .86, x + cw, top);
    const near = Math.abs(x + cw / 2 - sweep) < .8;
    c.fillStyle = near ? INK.amberHi : INK.amber;
    if (padded[i] === '█') rect(c, x + .06, top - .8, x + cw - .06, top - .06);
    else dots(c, padded[i], x + .09, top - .08, .094, .076);
  }
  // Tell-tales in the step: what the title band is showing, and whether a disc is in.
  label(c, 'TRACK', DX0 + .95, Z1 - 1.12, .26, INK.amber);
  label(c, 'TITLE', DX0 + .95, Z1 - 1.46, .26, INK.amber);
  label(c, 'DISC', DX0 + 2.55, Z1 - 1.12, .26, f.disc === false ? INK.amberDim : INK.jade);
  label(c, 'CD-DA', DX0 + 2.55, Z1 - 1.46, .26, INK.deep);

  // ----- twin channel gauges.
  const gx = DX0 + 2.3;
  ([[Z0 + 5.35, f.left, 'L'], [Z0 + 2.55, f.right, 'R']] as const).forEach(([gz, level, name]) => {
    const [cx, cy] = toCanvas(gx, gz);
    const n = 14, lit = test ? n : Math.round(level * n);
    for (let i = 0; i < n; i++) {
      const a0 = (100 + i * 12) * Math.PI / 180, a1 = a0 + 9.4 * Math.PI / 180;
      c.fillStyle = i < lit ? (i >= n - 3 ? INK.amberHi : i >= n - 6 ? INK.amber : INK.coral) : INK.coralDim;
      c.beginPath(); c.arc(cx, cy, 1.38 * S, -a0, -a1, true); c.arc(cx, cy, .98 * S, -a1, -a0, false); c.closePath(); c.fill();
    }
    c.strokeStyle = INK.deep; c.lineWidth = .03 * S;
    for (let i = 0; i <= 14; i++) {
      const a = (100 + i * 12 - 1) * Math.PI / 180, r0 = .8, r1 = i % 2 ? .88 : .92;
      c.beginPath(); c.moveTo(cx + r0 * S * Math.cos(-a), cy + r0 * S * Math.sin(-a)); c.lineTo(cx + r1 * S * Math.cos(-a), cy + r1 * S * Math.sin(-a)); c.stroke();
    }
    label(c, name, gx + .22, gz + .18, .5, INK.jade, 'center');
    const db = level > .01 ? Math.max(-40, Math.round(20 * Math.log10(level))) : -40;
    label(c, `${db <= -40 ? '-∞' : db}dB`, gx + .22, gz - .38, .24, INK.deep, 'center');
  });

  // ----- tunnel spectrum: each bar is a panel on the wall, cells stacked in world height,
  // so their edges converge with everything else. The lower row is the bar's reflection.
  const n = 9, cellH = WORLD(TUNNEL.up) / n;
  c.strokeStyle = INK.deep; c.lineWidth = .025 * S;
  line(c, [wallPoint(0, 0), wallPoint(80, 0)]);
  for (let i = 0; i < TUNNEL.columns; i++) {
    const col = tunnelColumn(i);
    const src = Math.min(f.bands.length - 1, Math.floor(i / TUNNEL.columns * f.bands.length));
    const level = test ? 1 : f.bands[src] ?? 0, peak = test ? 0 : f.peaks?.[src] ?? 0;
    const lit = Math.round(level * n);
    const face = (y0: number, y1: number) => [wallPoint(col.t, y0), wallPoint(col.t + col.w, y0), wallPoint(col.t + col.w, y1), wallPoint(col.t, y1)] as [number, number][];
    for (let j = 0; j < n; j++) {
      const y0 = j * cellH + cellH * .14, y1 = (j + 1) * cellH - cellH * .14, on = j < lit;
      c.fillStyle = on ? (j >= n - 2 ? INK.violetHi : INK.violet) : INK.violetDim;
      quad(c, face(y0, y1));
      if (j < 6) {
        c.fillStyle = on ? INK.cyan : INK.cyanDim;
        c.globalAlpha = on ? .75 - j * .09 : 1;
        quad(c, face(-y1 * .8, -y0 * .8));
        c.globalAlpha = 1;
      }
    }
    if (peak > .06) {
      const j = Math.min(n - 1, Math.max(lit, Math.floor(peak * n)));
      c.fillStyle = INK.violetHi; quad(c, face((j + 1) * cellH - cellH * .12, (j + 1) * cellH - cellH * .02));
    }
  }
  // Band scale under the wall, each label under its column.
  for (const [text, i] of [['60', 0], ['250', 5], ['1K', 10], ['4K', 16], ['16K', 23]] as const) {
    const col = tunnelColumn(i);
    label(c, text, col.x + col.width / 2, Z0 + .62, .24, INK.amber, 'center');
  }

  // ----- progress dial with the time inside, the track above.
  const dx = DX1 - 1.55, dz = Z0 + 4.2, [pcx, pcy] = toCanvas(dx, dz);
  const progress = test ? 1 : f.duration ? Math.min(1, f.time / f.duration) : (f.time % 60) / 60;
  const marks = 36;
  for (let i = 0; i < marks; i++) {
    const a = -Math.PI / 2 - i / marks * Math.PI * 2 * .82 - Math.PI * .18;
    c.strokeStyle = i / marks < progress ? (i / marks > progress - .06 ? INK.mint : INK.jade) : INK.dim;
    c.lineWidth = .1 * S;
    c.beginPath(); c.moveTo(pcx + 1.35 * S * Math.cos(a), pcy + 1.35 * S * Math.sin(a)); c.lineTo(pcx + 1.62 * S * Math.cos(a), pcy + 1.62 * S * Math.sin(a)); c.stroke();
  }
  c.strokeStyle = INK.deep; c.lineWidth = .025 * S;
  c.beginPath(); c.arc(pcx, pcy, 1.22 * S, 0, Math.PI * 2); c.stroke();
  const secs = Math.max(0, Math.floor(f.time));
  const mm = String(Math.min(99, Math.floor(secs / 60))).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  seven(c, test ? '88:88' : `${mm}:${ss}`, dx - 1.02, dz + .38, .0112, INK.mint, INK.dim, .06);
  label(c, 'ELAPSED', dx, dz - .72, .2, INK.deep, 'center');
  seven(c, test ? '88' : String(f.track + 1).padStart(2, '0'), dx - .82, Z1 - .95, .012, INK.jade, INK.dim, .06);
  label(c, `/${String(f.tracks ?? 3).padStart(2, '0')}`, dx + .45, Z1 - 1.4, .3, INK.deep);

  // ----- tell-tales along the foot: only what is true right now is lit.
  const tells: [string, boolean][] = [
    ['▶ PLAY', status === 'playing'], ['‖ PAUSE', status === 'paused'], ['■ STOP', status === 'stopped' || status === 'idle'],
    ['◀▶ SCAN', !!f.scanning], ['MUTE', !!f.muted], ['⟲ REP', true],
  ];
  tells.forEach(([text, on], i) => {
    const x = DX0 + 5.2 + i * 1.72;
    const blink = text === 'MUTE' && on ? (Math.sin(t * 6) > 0 ? INK.coral : INK.coralDim) : null;
    label(c, text, x, Z0 + .25, .24, test ? INK.jade : blink ?? (on ? INK.jade : INK.dim));
  });
  c.restore();
}
