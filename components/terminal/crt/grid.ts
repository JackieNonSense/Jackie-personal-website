import { cellText, charWidth, glyphCells, isLeftHalf, isRightHalf } from './font';

/**
 * A text-mode page: 80 x 25 character cells, one glyph and one attribute each. A
 * full-width (Chinese) character fills two cells with its two halves.
 */
export const COLS = 80;
export const ROWS = 25;

/** 80 x 25 for desks; 40 x 12 with doubled glyphs when the tube is small, as on a phone. */
export const TEXT_MODES = {
  wide: { cols: COLS, rows: ROWS, zoom: 1 },
  large: { cols: 40, rows: 12, zoom: 2 },
} as const;
export type TextMode = keyof typeof TEXT_MODES;

/** `accent` is the tube's accent colour: a title, a banner, a directory. On a monochrome tube it reads as bright. */
export const ATTR = { dim: 1, bright: 2, inverse: 4, underline: 8, blink: 16, accent: 32 } as const;

export type Grid = {
  cols: number;
  rows: number;
  codes: Uint16Array;
  attrs: Uint8Array;
  cursor: { x: number; y: number; visible: boolean };
  /** Bumped on every change so the rasteriser only redraws when needed. */
  version: number;
  /** When set, rows scrolled off the top are kept here (the DOS shell's scrollback). */
  scrollback?: GridRow[];
};

export type GridRow = { codes: Uint16Array; attrs: Uint8Array };
/** How many rows of scrollback are kept. */
export const SCROLLBACK_ROWS = 600;

export function createGrid(cols = COLS, rows = ROWS): Grid {
  const codes = new Uint16Array(cols * rows).fill(32);
  return { cols, rows, codes, attrs: new Uint8Array(cols * rows), cursor: { x: 0, y: 0, visible: true }, version: 0 };
}

export function clearGrid(grid: Grid): void {
  grid.codes.fill(32); grid.attrs.fill(0);
  grid.cursor.x = 0; grid.cursor.y = 0;
  grid.version++;
}

export function scrollGrid(grid: Grid, lines = 1): void {
  const n = Math.min(lines, grid.rows) * grid.cols;
  if (grid.scrollback) {
    for (let r = 0; r < Math.min(lines, grid.rows); r++) {
      const at = r * grid.cols;
      grid.scrollback.push({ codes: grid.codes.slice(at, at + grid.cols), attrs: grid.attrs.slice(at, at + grid.cols) });
    }
    if (grid.scrollback.length > SCROLLBACK_ROWS) grid.scrollback.splice(0, grid.scrollback.length - SCROLLBACK_ROWS);
  }
  grid.codes.copyWithin(0, n); grid.codes.fill(32, grid.codes.length - n);
  grid.attrs.copyWithin(0, n); grid.attrs.fill(0, grid.attrs.length - n);
  grid.cursor.y = Math.max(0, grid.cursor.y - lines);
  grid.version++;
}

function setCell(grid: Grid, x: number, y: number, code: number, attr: number): void {
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return;
  const i = y * grid.cols + x, old = grid.codes[i];
  // Never leave half of a full-width character behind.
  if (isRightHalf(old) && x > 0 && !isRightHalf(code)) grid.codes[i - 1] = 32;
  if (isLeftHalf(old) && x + 1 < grid.cols && !isLeftHalf(code)) grid.codes[i + 1] = 32;
  grid.codes[i] = code;
  grid.attrs[i] = attr;
}

/** Writes one character; a full-width one takes this cell and the next. Returns the cells used. */
export function putChar(grid: Grid, x: number, y: number, ch: string, attr = 0): number {
  const cells = glyphCells(ch);
  if (cells.length === 2 && x + 1 >= grid.cols) { setCell(grid, x, y, 32, attr); grid.version++; return 1; }
  cells.forEach((code, i) => setCell(grid, x + i, y, code, attr));
  grid.version++;
  return cells.length;
}

function newline(grid: Grid): void {
  grid.cursor.x = 0;
  if (grid.cursor.y + 1 >= grid.rows) scrollGrid(grid);
  grid.cursor.y = Math.min(grid.rows - 1, grid.cursor.y + 1);
}

/** Teletype output at the cursor: wraps at the right margin and scrolls at the bottom. */
export function writeText(grid: Grid, text: string, attr = 0): void {
  for (const ch of text) {
    if (ch === '\n') { newline(grid); continue; }
    if (ch === '\r') { grid.cursor.x = 0; continue; }
    if (ch === '\b') {
      if (grid.cursor.x > 0) grid.cursor.x--;
      putChar(grid, grid.cursor.x, grid.cursor.y, ' ');
      continue;
    }
    if (grid.cursor.x + charWidth(ch) > grid.cols) newline(grid);
    grid.cursor.x += putChar(grid, grid.cursor.x, grid.cursor.y, ch, attr);
  }
  grid.version++;
}

export function rowText(grid: Grid, y: number): string {
  let out = '';
  for (let x = 0; x < grid.cols; x++) out += cellText(grid.codes[y * grid.cols + x]);
  return out;
}
