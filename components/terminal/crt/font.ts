/** IBM VGA 8x16 in code page 437 order; see public/fonts/oldschool-pc/SOURCE.md. */
export const GLYPH_W = 8;
export const GLYPH_H = 16;
export const ATLAS_URL = '/terminal/vga-8x16.png';

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
export const CP437 =
  ' ☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼' + ASCII + '⌂' +
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»' +
  '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
  'αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00a0';

const codes = new Map<string, number>();
for (let i = CP437.length - 1; i >= 0; i--) codes.set(CP437[i], i);
codes.set(' ', 32);
// Typography a visitor might paste; the terminal answers in its own character set.
for (const [from, to] of [['‘', "'"], ['’', "'"], ['“', '"'], ['”', '"'], ['–', '-'], ['—', '-'], ['β', 'ß'], ['μ', 'µ']] as const) codes.set(from, codes.get(to)!);

export const UNKNOWN_GLYPH = 63; // '?'

/*
 * Beyond code page 437: the Chinese character ROM (public/terminal/hzk16.bin, built
 * by scripts/build-terminal-hzk.py), loaded when the machine speaks Chinese. A
 * full-width character takes two cells, as under UCDOS: its left and right halves
 * are glyphs of their own, numbered after the 256 of the VGA ROM.
 */
export const WIDE_FONT_URL = '/terminal/hzk16.bin';
/** What each code above 255 shows: its character, or '' for the right half of a wide one. */
const extraText: string[] = [];
const RIGHT_HALF = new Set<number>();
const wide = new Set<string>();

export function glyphCode(ch: string): number {
  return codes.get(ch) ?? UNKNOWN_GLYPH;
}

/** The cells a character occupies: one code, or two for a full-width character. */
export function glyphCells(ch: string): number[] {
  const code = glyphCode(ch);
  return wide.has(ch) ? [code, code + 1] : [code];
}

export function charWidth(ch: string): 1 | 2 { return wide.has(ch) ? 2 : 1; }

/** Width on the page, in cells. */
export function strWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += wide.has(ch) ? 2 : 1;
  return w;
}

/** The character a cell shows; '' for the right half of a full-width one. */
export function cellText(code: number): string {
  return code < 256 ? CP437[code] : extraText[code - 256] ?? '?';
}
export function isRightHalf(code: number): boolean { return RIGHT_HALF.has(code); }
export function isLeftHalf(code: number): boolean { return code >= 256 && RIGHT_HALF.has(code + 1); }
export function wideFontInstalled(): boolean { return extraText.length > 0; }

/**
 * Registers the character ROM and returns the whole glyph table: the VGA glyphs
 * followed by the new ones, 16 bytes each.
 */
export function installWideFont(rom: ArrayBuffer, base: Uint8Array): Uint8Array {
  const view = new DataView(rom);
  if (String.fromCharCode(...new Uint8Array(rom, 0, 4)) !== 'HZ16') throw new Error('Not a character ROM');
  const count = view.getUint32(4, true);
  let meta = 8, bits = 8 + count * 3, cells = 0;
  for (let i = 0; i < count; i++) cells += view.getUint8(8 + i * 3 + 2);
  const table = new Uint8Array(256 * GLYPH_H + cells * GLYPH_H);
  table.set(base.subarray(0, 256 * GLYPH_H));
  extraText.length = 0; RIGHT_HALF.clear(); wide.clear();
  let code = 256;
  for (let i = 0; i < count; i++, meta += 3) {
    const ch = String.fromCharCode(view.getUint16(meta, true)), width = view.getUint8(meta + 2);
    for (let y = 0; y < GLYPH_H; y++) for (let half = 0; half < width; half++) {
      table[(code + half) * GLYPH_H + y] = view.getUint8(bits + y * width + half);
    }
    bits += GLYPH_H * width;
    codes.set(ch, code);
    extraText.push(ch);
    if (width === 2) { wide.add(ch); RIGHT_HALF.add(code + 1); extraText.push(''); }
    code += width;
  }
  return table;
}

export async function loadWideFont(base: Uint8Array, url = WIDE_FONT_URL): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Character ROM: ${response.status}`);
  return installWideFont(await response.arrayBuffer(), base);
}

/** One byte per glyph row, most significant bit on the left: 256 glyphs x 16 rows. */
export function decodeAtlas(rgba: Uint8ClampedArray, width: number): Uint8Array {
  const bits = new Uint8Array(256 * GLYPH_H);
  for (let g = 0; g < 256; g++) {
    const ox = (g % 16) * GLYPH_W, oy = Math.floor(g / 16) * GLYPH_H;
    for (let y = 0; y < GLYPH_H; y++) {
      let row = 0;
      for (let x = 0; x < GLYPH_W; x++) if (rgba[((oy + y) * width + ox + x) * 4] > 127) row |= 0x80 >> x;
      bits[g * GLYPH_H + y] = row;
    }
  }
  return bits;
}

export async function loadGlyphs(url = ATLAS_URL): Promise<Uint8Array> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  return decodeAtlas(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width);
}
