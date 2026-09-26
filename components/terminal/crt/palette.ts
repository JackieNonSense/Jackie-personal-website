/**
 * What a byte of the beam raster means. The raster holds palette indices, not
 * brightness; the tube's theme (crt/themes.ts) says what each index glows. Every
 * index means the same under every theme, so switching the tube only swaps the
 * palette and never redraws a thing.
 *
 *   0..15    the 16 hardware colours, in VGA order (0 black, 7 light grey, 15 white)
 *   16..63   roles: the desk, window faces, title bars, text mode's attributes
 *   64..255  a ramp for pictures, from black to the brightest the tube shows
 */
export const ROLE_BASE = 16;
export const RAMP_BASE = 64;
export const RAMP_STEPS = 256 - RAMP_BASE;

/** The 16 hardware colours by name, for pictures and games drawn in them. */
export const HW = {
  black: 0, blue: 1, green: 2, cyan: 3, red: 4, magenta: 5, brown: 6, grey: 7,
  darkGrey: 8, lightBlue: 9, lightGreen: 10, lightCyan: 11, lightRed: 12, lightMagenta: 13, yellow: 14, white: 15,
} as const;

export const ROLES = [
  // The pixel desk: its pattern, and the labels under its icons.
  'desk', 'deskAlt', 'deskText', 'deskLabel',
  'face', 'faceText', 'faceDim', 'light', 'shadow', 'frame',
  'titleOn', 'titleOnText', 'titleOff', 'titleOffText',
  'bar', 'barText',
  'select', 'selectText', 'selectOff', 'selectOffText',
  'field', 'fieldText',
  'accent', 'accentText', 'link',
  'iconLine', 'iconFill', 'iconAccent', 'iconShade',
  'cursorFill', 'cursorLine', 'dropShadow', 'danger',
  // The maker's nameplate (content/mark.ts): its frame and letters, its field, the small print on its band.
  'plate', 'plateField', 'plateInk',
  // Text mode: what each attribute shows (crt/raster.ts).
  'tmBg', 'tmText', 'tmDim', 'tmBright', 'tmAccent', 'tmInvText',
] as const;
export type Role = typeof ROLES[number];

export const INK = Object.fromEntries(ROLES.map((role, i) => [role, ROLE_BASE + i])) as Readonly<Record<Role, number>>;

/** A colour to draw with: a role, or a palette index. */
export type Ink = Role | number;
export const ink = (i: Ink): number => (typeof i === 'number' ? i : INK[i]);

/** Picture intensity (0..255, what pictures are stored as) to its index on the ramp. */
export const GREY = Uint8Array.from({ length: 256 }, (_, v) => RAMP_BASE + Math.round((v * (RAMP_STEPS - 1)) / 255));
export const grey = (v: number): number => GREY[Math.max(0, Math.min(255, Math.round(v)))];
