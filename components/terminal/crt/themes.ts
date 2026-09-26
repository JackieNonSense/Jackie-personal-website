import { RAMP_BASE, RAMP_STEPS, ROLES, INK, type Role } from './palette';
import type { Text } from '../system/i18n';

/*
 * The tubes the six buttons under the screen select. Three are monochrome
 * phosphors (the green the machine came with, amber, paper white); three are
 * colour tubes with palettes of their own. A theme is only colours and a few
 * physical constants: every index of the raster means the same in each.
 */

export type ThemeId = 'p1' | 'p3' | 'p4' | 'classic' | 'pc98' | 'jr';
/** Linear light; a little over 1 blooms. */
export type Rgb = readonly [number, number, number];

/** How the tube behaves, beyond which colours it shows. */
export type Tube = {
  mono: boolean;
  /** What an overdriven spot blooms toward, on a monochrome tube. */
  core: Rgb;
  /** The faint glow of the swept raster where nothing is drawn. */
  baseGlow: Rgb;
  /** The afterglow dot left in standby. */
  dot: Rgb;
  /** Phosphor decay in seconds: the image, and the slow tail; and how much of the tail shows. */
  fastTau: number;
  slowTau: number;
  tail: number;
  /** How far red and blue land apart toward the edges, in raster pixels (colour tubes). */
  converge: number;
  /** Overall emission. */
  gain: number;
  /** Light the screen throws on the bezel and the room. */
  spill: number;
};

type MonoSpec = { kind: 'mono'; phosphor: Rgb; levels: Record<Role, number> };
type ColourSpec = {
  kind: 'colour';
  /** The 16 hardware colours, in VGA order, as sRGB hex. */
  hardware: readonly string[];
  roles: Record<Role, string>;
  /** Pictures: dark tones take the first tint, light tones the second. */
  ramp: { dark: string; light: string; saturation: number };
};
export type ThemeSpec = {
  id: ThemeId;
  name: Text;
  /** For the BIOS table, at most 13 characters. */
  bios: string;
  /** How the desk's two colours are woven (gui/gfx.ts PATTERNS). */
  pattern: 'solid' | 'half' | 'quarter' | 'sparse';
  tube: Tube;
} & (MonoSpec | ColourSpec);

export type Theme = ThemeSpec & {
  /** 256 colours, RGBA, linear: what the shader looks each index up in. */
  palette: Float32Array;
  /** The same, packed for ImageData, for the flat display. */
  srgb: Uint32Array;
  /** How bright each index reads to a camera, 0..255, on this tube's own scale. */
  level: Uint8Array;
};

// ── Colour arithmetic ───────────────────────────────────────────────────────────

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function hex(h: string): Rgb {
  const n = parseInt(h.slice(1), 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

export const luminance = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** The 16 VGA colours, whose brightness a monochrome monitor showed as shades. */
const VGA = ['#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
  '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'];

// ── The tubes ───────────────────────────────────────────────────────────────────

/** Text mode's levels, the ones the green tube has always shown. */
const TEXT = { normal: 188 / 255, dim: 104 / 255 };

/** A monochrome desk on a dark tube: black faces, lit lines and letters; selections inverted. */
const DARK: Record<Role, number> = {
  desk: 0, deskAlt: 0.2, deskText: TEXT.normal, deskLabel: 0,
  face: 0, faceText: TEXT.normal, faceDim: TEXT.dim, light: TEXT.normal, shadow: 0.3, frame: TEXT.normal,
  titleOn: TEXT.normal, titleOnText: 0, titleOff: 0, titleOffText: TEXT.dim,
  bar: 0, barText: TEXT.normal,
  select: TEXT.normal, selectText: 0, selectOff: 0.3, selectOffText: 0.9,
  field: 0, fieldText: 1,
  accent: 1, accentText: 0, link: 1,
  iconLine: 0.85, iconFill: 0, iconAccent: 1, iconShade: 0.35,
  cursorFill: 1, cursorLine: 0, dropShadow: 0, danger: 1,
  plate: 1, plateField: 0.12, plateInk: 0,
  tmBg: 0, tmText: TEXT.normal, tmDim: TEXT.dim, tmBright: 1, tmAccent: 1, tmInvText: 0,
};

/** Paper white: black on white, the other way round, as on a Macintosh. */
const LIGHT: Record<Role, number> = {
  desk: 0.42, deskAlt: 0.8, deskText: 0, deskLabel: 1,
  face: 0.92, faceText: 0, faceDim: 0.45, light: 1, shadow: 0.45, frame: 0,
  titleOn: 0.92, titleOnText: 0, titleOff: 0.92, titleOffText: 0.45,
  bar: 0.92, barText: 0,
  select: 0, selectText: 0.92, selectOff: 0.45, selectOffText: 1,
  field: 1, fieldText: 0,
  accent: 0, accentText: 0.92, link: 0,
  iconLine: 0, iconFill: 0.92, iconAccent: 0, iconShade: 0.45,
  cursorFill: 0, cursorLine: 1, dropShadow: 0, danger: 0,
  plate: 1, plateField: 0.12, plateInk: 0,
  tmBg: 0, tmText: TEXT.normal, tmDim: TEXT.dim, tmBright: 1, tmAccent: 1, tmInvText: 0,
};

const COLOUR_TUBE = { mono: false, core: [1, 1, 1], fastTau: 0.008, slowTau: 0.07, tail: 0.06 } as const;

const SPECS: ThemeSpec[] = [
  {
    id: 'p1', name: { en: 'P1 green', zh: 'P1 绿色' }, bios: 'VGA, P1 green', pattern: 'quarter',
    kind: 'mono', phosphor: [0.05, 1, 0.1], levels: DARK,
    tube: { mono: true, core: [0.5, 0.9, 0.45], baseGlow: [0.05, 1, 0.1], dot: [0.05, 1, 0.1], fastTau: 0.012, slowTau: 0.15, tail: 0.2, converge: 0, gain: 1, spill: 9 },
  },
  {
    id: 'p3', name: { en: 'P3 amber', zh: 'P3 琥珀' }, bios: 'VGA, P3 amber', pattern: 'quarter',
    kind: 'mono', phosphor: [1.05, 0.46, 0.03], levels: DARK,
    tube: { mono: true, core: [1, 0.8, 0.45], baseGlow: [1.05, 0.46, 0.03], dot: [1.05, 0.46, 0.03], fastTau: 0.014, slowTau: 0.22, tail: 0.24, converge: 0, gain: 1, spill: 9 },
  },
  {
    id: 'p4', name: { en: 'P4 paper white', zh: 'P4 纸白' }, bios: 'VGA, P4 white', pattern: 'half',
    kind: 'mono', phosphor: [0.82, 0.86, 0.95], levels: LIGHT,
    tube: { mono: true, core: [1, 1, 1], baseGlow: [0.82, 0.86, 0.95], dot: [0.82, 0.86, 0.95], fastTau: 0.01, slowTau: 0.09, tail: 0.1, converge: 0, gain: 0.95, spill: 7.5 },
  },
  {
    id: 'classic', name: { en: 'Classic', zh: '经典' }, bios: 'VGA, 16 color', pattern: 'solid',
    kind: 'colour', hardware: VGA,
    roles: {
      desk: '#008080', deskAlt: '#008080', deskText: '#FFFFFF', deskLabel: '#008080',
      face: '#C0C0C0', faceText: '#000000', faceDim: '#808080', light: '#FFFFFF', shadow: '#808080', frame: '#000000',
      titleOn: '#000080', titleOnText: '#FFFFFF', titleOff: '#808080', titleOffText: '#C0C0C0',
      bar: '#C0C0C0', barText: '#000000',
      select: '#000080', selectText: '#FFFFFF', selectOff: '#808080', selectOffText: '#FFFFFF',
      field: '#FFFFFF', fieldText: '#000000',
      accent: '#000080', accentText: '#FFFFFF', link: '#0000FF',
      iconLine: '#000000', iconFill: '#FFFFFF', iconAccent: '#008080', iconShade: '#808080',
      cursorFill: '#FFFFFF', cursorLine: '#000000', dropShadow: '#000000', danger: '#FF0000',
      plate: '#F2F0EA', plateField: '#1F3FC4', plateInk: '#16161A',
      tmBg: '#000000', tmText: '#AAAAAA', tmDim: '#555555', tmBright: '#FFFFFF', tmAccent: '#55FFFF', tmInvText: '#000000',
    },
    ramp: { dark: '#808080', light: '#FFFFFF', saturation: 0 },
    tube: { ...COLOUR_TUBE, baseGlow: [0.5, 0.55, 0.65], dot: [0.85, 0.9, 1], converge: 0.35, gain: 0.95, spill: 6 },
  },
  {
    id: 'pc98', name: { en: 'PC-98 night', zh: 'PC-98 夜色' }, bios: 'VGA, PC-98', pattern: 'sparse',
    kind: 'colour',
    hardware: ['#000000', '#221166', '#11775A', '#1E7C9A', '#9A2244', '#6A2E8E', '#A8651E', '#B8A8CC',
      '#4A3A66', '#6F7BFF', '#6AF0B0', '#8CEEFF', '#FF6A8A', '#FF8ACB', '#FFE98A', '#FFF6FF'],
    roles: {
      desk: '#0B0620', deskAlt: '#221548', deskText: '#F2E6FF', deskLabel: '#0B0620',
      face: '#1E1344', faceText: '#F2E6FF', faceDim: '#7F6FA8', light: '#4D3C86', shadow: '#070312', frame: '#000000',
      titleOn: '#FF8ACB', titleOnText: '#1A0B2E', titleOff: '#3A2A62', titleOffText: '#A898CC',
      bar: '#140A30', barText: '#FFD2EE',
      select: '#8CEEFF', selectText: '#0B0620', selectOff: '#3A2A62', selectOffText: '#F2E6FF',
      field: '#0B0620', fieldText: '#F2E6FF',
      accent: '#8CEEFF', accentText: '#0B0620', link: '#8CEEFF',
      iconLine: '#F2E6FF', iconFill: '#1E1344', iconAccent: '#FF8ACB', iconShade: '#4D3C86',
      cursorFill: '#FFFFFF', cursorLine: '#1A0B2E', dropShadow: '#000000', danger: '#FF6A8A',
      plate: '#FFF6FF', plateField: '#C2306F', plateInk: '#1A0B2E',
      tmBg: '#000000', tmText: '#C9B8F0', tmDim: '#6E5E9E', tmBright: '#FFF0FA', tmAccent: '#FF8ACB', tmInvText: '#000000',
    },
    ramp: { dark: '#4A2A8C', light: '#FFD6F0', saturation: 0.55 },
    tube: { ...COLOUR_TUBE, baseGlow: [0.55, 0.45, 0.8], dot: [0.9, 0.85, 1], converge: 0.3, gain: 1, spill: 7 },
  },
  {
    id: 'jr', name: { en: 'JR', zh: 'JR' }, bios: 'VGA, JR color', pattern: 'sparse',
    kind: 'colour',
    // The colours of Jackie's own site: ink, paper, cobalt, the signal green, the amber.
    hardware: ['#050505', '#10287A', '#179B18', '#137F8C', '#B3261E', '#6E2A78', '#A86A00', '#9E9B93',
      '#3C3B38', '#1948D5', '#64FF35', '#4FD8E8', '#FF4A2E', '#E04CD0', '#FFB000', '#F0EDE4'],
    roles: {
      desk: '#050505', deskAlt: '#171717', deskText: '#DEDBD2', deskLabel: '#050505',
      face: '#DEDBD2', faceText: '#050505', faceDim: '#9E9B93', light: '#F0EDE4', shadow: '#9E9B93', frame: '#050505',
      titleOn: '#1948D5', titleOnText: '#F0EDE4', titleOff: '#9E9B93', titleOffText: '#DEDBD2',
      bar: '#050505', barText: '#DEDBD2',
      select: '#64FF35', selectText: '#050505', selectOff: '#9E9B93', selectOffText: '#050505',
      field: '#F0EDE4', fieldText: '#050505',
      accent: '#FFB000', accentText: '#050505', link: '#1948D5',
      iconLine: '#050505', iconFill: '#DEDBD2', iconAccent: '#1948D5', iconShade: '#9E9B93',
      cursorFill: '#F0EDE4', cursorLine: '#050505', dropShadow: '#000000', danger: '#FF4A2E',
      plate: '#F0EDE4', plateField: '#1948D5', plateInk: '#050505',
      tmBg: '#050505', tmText: '#DEDBD2', tmDim: '#7A776F', tmBright: '#64FF35', tmAccent: '#FFB000', tmInvText: '#050505',
    },
    ramp: { dark: '#1948D5', light: '#F0EDE4', saturation: 0.42 },
    tube: { ...COLOUR_TUBE, baseGlow: [0.6, 0.6, 0.55], dot: [0.95, 0.93, 0.88], converge: 0.25, gain: 0.95, spill: 6 },
  },
];

// ── Building a palette ─────────────────────────────────────────────────────────

/** Scales a colour to luminance 1, keeping its hue; `saturation` 0 gives white. */
function normalised(c: Rgb, saturation: number): Rgb {
  const l = Math.max(1e-4, luminance(c));
  return [0, 1, 2].map(k => 1 + (c[k] / l - 1) * saturation) as unknown as Rgb;
}

const smoothstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function build(spec: ThemeSpec): Theme {
  const palette = new Float32Array(256 * 4);
  const set = (i: number, c: Rgb) => { palette.set([c[0], c[1], c[2], 1], i * 4); };
  if (spec.kind === 'mono') {
    const p = spec.phosphor, at = (level: number): Rgb => [p[0] * level, p[1] * level, p[2] * level];
    // A monochrome monitor shows a colour as its brightness.
    VGA.forEach((h, i) => set(i, at(Math.sqrt(luminance(hex(h))))));
    for (const role of ROLES) set(INK[role], at(spec.levels[role]));
    for (let i = 0; i < RAMP_STEPS; i++) set(RAMP_BASE + i, at(i / (RAMP_STEPS - 1)));
  } else {
    spec.hardware.forEach((h, i) => set(i, hex(h)));
    for (const role of ROLES) set(INK[role], hex(spec.roles[role]));
    // Pictures keep their brightness; only the tint changes from shadows to highlights.
    const dark = normalised(hex(spec.ramp.dark), spec.ramp.saturation), light = normalised(hex(spec.ramp.light), spec.ramp.saturation);
    for (let i = 0; i < RAMP_STEPS; i++) {
      const t = i / (RAMP_STEPS - 1), k = smoothstep(0.1, 0.85, t);
      set(RAMP_BASE + i, [0, 1, 2].map(c => t * (dark[c] + (light[c] - dark[c]) * k)) as unknown as Rgb);
    }
  }
  const white = spec.kind === 'mono' ? luminance(spec.phosphor) : 1;
  const srgb = new Uint32Array(256), level = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const c: Rgb = [palette[i * 4], palette[i * 4 + 1], palette[i * 4 + 2]];
    srgb[i] = packSrgb(c);
    level[i] = Math.round(255 * Math.min(1, luminance(c) / white));
  }
  return { ...spec, palette, srgb, level };
}

/** A linear colour as ImageData wants it (little-endian RGBA). */
export function packSrgb(c: Rgb): number {
  const b = (v: number) => Math.round(255 * toSrgb(Math.max(0, Math.min(1, v))));
  return ((255 << 24) | (b(c[2]) << 16) | (b(c[1]) << 8) | b(c[0])) >>> 0;
}

export const THEMES = Object.fromEntries(SPECS.map(s => [s.id, build(s)])) as Record<ThemeId, Theme>;
/** Left to right under the screen. */
export const BUTTONS: readonly ThemeId[] = ['p1', 'p3', 'p4', 'classic', 'pc98', 'jr'];
export const DEFAULT_THEME: ThemeId = 'classic';
export const isTheme = (id: unknown): id is ThemeId => typeof id === 'string' && id in THEMES;

/** A palette part way from one to another. */
export function mixPalette(out: Float32Array, a: Float32Array, b: Float32Array, k: number): Float32Array {
  for (let i = 0; i < out.length; i++) out[i] = a[i] + (b[i] - a[i]) * k;
  return out;
}

export function mixTube(a: Tube, b: Tube, k: number): Tube {
  const n = (x: number, y: number) => x + (y - x) * k;
  const v = (x: Rgb, y: Rgb): Rgb => [n(x[0], y[0]), n(x[1], y[1]), n(x[2], y[2])];
  return {
    mono: k < 0.5 ? a.mono : b.mono, core: v(a.core, b.core), baseGlow: v(a.baseGlow, b.baseGlow), dot: v(a.dot, b.dot),
    fastTau: n(a.fastTau, b.fastTau), slowTau: n(a.slowTau, b.slowTau), tail: n(a.tail, b.tail),
    converge: n(a.converge, b.converge), gain: n(a.gain, b.gain), spill: n(a.spill, b.spill),
  };
}
