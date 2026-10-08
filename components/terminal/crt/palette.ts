/**
 * What a byte of the beam raster means. The raster holds palette indices, not
 * brightness; the tube's theme (crt/themes.ts) says what each index glows. Every
 * index means the same under every theme, so switching the tube only swaps the
 * palette and never redraws a thing.
 *
 *   0..15    the 16 hardware colours, in VGA order (0 black, 7 light grey, 15 white)
 *   16..63   roles: the desk, window faces, title bars, text mode's attributes
 *   64..127  a ramp for pictures, 64 steps (a VGA card's own depth) from black to the brightest the tube shows
 *   128..191 colour pictures: four levels each of red, green and blue, which pictures reach
 *            through an ordered dither, as a VGA card's 256-colour mode showed photographs
 *   192..255 the web's own colours (the pages NAVIGATOR shows were made in them)
 */
export const ROLE_BASE = 16;
export const RAMP_BASE = 64;
export const COLOUR_BASE = 128;
export const WEB_BASE = 192;
export const RAMP_STEPS = COLOUR_BASE - RAMP_BASE;
/** Levels of each primary in the colour cube. */
export const COLOUR_LEVELS = 4;

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

/**
 * The colours the web's pages were made in, whatever a tube makes of them: paper and
 * risograph inks, a fan site's pastels, a forum's blues, a shop's neon at night.
 */
export const WEB_COLOURS = {
  paper: '#F4F1E8', paperDark: '#E6E0D0', riso: '#1C3FAE', risoRed: '#E0443C', ink: '#1A1A1A',
  pink: '#FFD6F0', pinkPale: '#FFE8F6', lilac: '#EEDDFF', lilacDeep: '#8888DD', periwinkle: '#AAAAFF',
  purple: '#5522AA', violet: '#6633AA', orchid: '#AA55CC', rose: '#FF77BB',
  forum: '#336699', forumPale: '#CCDDEE', forumRowA: '#F0F4F8', forumRowB: '#E4ECF4', forumLine: '#99AABB', forumBar: '#DDE6EE',
  cream: '#FFF8E7', kraft: '#C8A878', umber: '#5A3E1B', leaf: '#2E7D32', leafPale: '#DCEFD8', gold: '#E8B830', stampRed: '#B22222',
  night: '#140C22', nightPanel: '#231638', neonPink: '#FF3C8E', neonCyan: '#33E1FF', neonYellow: '#FFE45C', dusk: '#6E5A8A',
  jrBlack: '#050505', jrGreen: '#64FF35', jrCobalt: '#1948D5', jrAmber: '#FFB000', jrPaper: '#DEDBD2', jrGrey: '#7A776F',
  g95: '#F2F2F2', g85: '#D9D9D9', g70: '#B3B3B3', g55: '#8C8C8C', g40: '#666666', g25: '#404040',
  seekBlue: '#2A5DB0', seekSky: '#E8F0FF', linkBlue: '#0000EE', visited: '#551A8B', alarm: '#CC0000', white: '#FFFFFF', black: '#000000',
} as const;
export type WebColour = keyof typeof WEB_COLOURS;
export const WEB = Object.fromEntries(Object.keys(WEB_COLOURS).map((name, i) => [name, WEB_BASE + i])) as Readonly<Record<WebColour, number>>;

/** Picture intensity (0..255, what pictures are stored as) to its index on the ramp. */
export const GREY = Uint8Array.from({ length: 256 }, (_, v) => RAMP_BASE + Math.round((v * (RAMP_STEPS - 1)) / 255));
export const grey = (v: number): number => GREY[Math.max(0, Math.min(255, Math.round(v)))];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

/**
 * A colour picture's pixel (sRGB, 0..255 each) at screen position (x, y), as its index
 * in the colour cube: each primary rounded up or down by a 4 x 4 pattern fixed to the
 * screen, so flat areas cross-hatch the way they did on a VGA card.
 */
export function cube(r: number, g: number, b: number, x: number, y: number): number {
  const t = BAYER[(y & 3) * 4 + (x & 3)], top = COLOUR_LEVELS - 1;
  const q = (v: number) => { const k = Math.floor((v * top) / 255 + t); return k < 0 ? 0 : k > top ? top : k; };
  return COLOUR_BASE + q(r) * COLOUR_LEVELS * COLOUR_LEVELS + q(g) * COLOUR_LEVELS + q(b);
}
