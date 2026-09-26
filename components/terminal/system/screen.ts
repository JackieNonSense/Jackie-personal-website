import { ATTR, clearGrid, putChar, type Grid } from '../crt/grid';
import { charWidth, strWidth } from '../crt/font';

export { strWidth };

/**
 * Drawing on the text page. Every full-screen program uses the same frame: a box
 * with its title in the top edge, and a status bar of key help on the last row.
 * Widths are in cells: a Chinese character takes two.
 */
export function text(grid: Grid, x: number, y: number, s: string, attr = 0, max = grid.cols - x): void {
  let used = 0;
  for (const ch of s) {
    if (used + charWidth(ch) > max) break;
    used += putChar(grid, x + used, y, ch, attr);
  }
}

export function fill(grid: Grid, x: number, y: number, width: number, ch = ' ', attr = 0): void {
  for (let i = 0; i < width; i++) putChar(grid, x + i, y, ch, attr);
}

export function centered(grid: Grid, y: number, s: string, attr = 0): void {
  text(grid, Math.max(0, Math.floor((grid.cols - strWidth(s)) / 2)), y, s, attr);
}

/** Pads with `ch` to `width` cells. */
export function padTo(s: string, width: number, ch = ' '): string {
  return s + ch.repeat(Math.max(0, width - strWidth(s)));
}

/** Cuts to at most `width` cells. */
export function clip(s: string, width: number): string {
  let out = '', used = 0;
  for (const c of s) {
    if (used + charWidth(c) > width) break;
    out += c; used += charWidth(c);
  }
  return out;
}

/** Content area inside the frame. */
export function body(grid: Grid) {
  return { x: 2, y: 2, width: grid.cols - 4, height: grid.rows - 4 };
}

export function frame(grid: Grid, title: string, right = ''): void {
  clearGrid(grid);
  grid.cursor.visible = false;
  const w = grid.cols, bottom = grid.rows - 2;
  text(grid, 0, 0, '┌' + '─'.repeat(w - 2) + '┐', ATTR.dim);
  for (let y = 1; y < bottom; y++) { putChar(grid, 0, y, '│', ATTR.dim); putChar(grid, w - 1, y, '│', ATTR.dim); }
  text(grid, 0, bottom, '└' + '─'.repeat(w - 2) + '┘', ATTR.dim);
  const label = ` ${title} `;
  text(grid, 2, 0, label, ATTR.bright, w - 4);
  if (right && strWidth(label) + strWidth(right) + 6 < w) text(grid, w - strWidth(right) - 4, 0, ` ${right} `, ATTR.dim);
}

export function statusBar(grid: Grid, left: string, right = ''): void {
  const y = grid.rows - 1, w = grid.cols;
  const r = right ? ` ${right} ` : '';
  const l = clip(' ' + left, w - strWidth(r));
  text(grid, 0, y, padTo(l, w - strWidth(r)) + r, ATTR.inverse);
}

export function clock(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Punctuation that may not begin a line, and that may not end one (Chinese line breaking). */
const NO_START = new Set('，。、；：？！）》」』】〉…·,.;:?!)%');
const NO_END = new Set('（《「『【〈(');

type Token = { text: string; space: boolean };

/**
 * Splits a paragraph into pieces that are never broken: Western words, and single
 * Chinese characters with their punctuation held on. `space` marks a space before.
 */
function tokens(paragraph: string): Token[] {
  const out: Token[] = [];
  let word = '', space = false;
  const flush = () => { if (word) { out.push({ text: word, space }); word = ''; space = false; } };
  for (const ch of paragraph) {
    if (ch === ' ') { flush(); space = true; continue; }
    if (charWidth(ch) === 2 || NO_START.has(ch) && ch.charCodeAt(0) > 0x2000) { flush(); out.push({ text: ch, space }); space = false; continue; }
    word += ch;
  }
  flush();
  // Hold punctuation to its neighbours.
  const held: Token[] = [];
  for (const t of out) {
    const prev = held[held.length - 1];
    if (prev && !t.space && (NO_START.has(t.text[0]) || NO_END.has(prev.text[prev.text.length - 1]))) prev.text += t.text;
    else held.push({ ...t });
  }
  return held;
}

/** Word wrap for the page width; blank lines survive, overlong words break. */
export function wrap(source: string, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of source.split('\n')) {
    if (!paragraph.trim()) { out.push(''); continue; }
    // A line that fits is kept exactly as written, so pictures made of characters survive.
    if (strWidth(paragraph) <= width) { out.push(paragraph.trimEnd()); continue; }
    const indent = paragraph.match(/^ */)![0];
    const room = width - indent.length;
    let line = '';
    for (const token of tokens(paragraph.trim())) {
      let piece = token.text;
      const gap = line && token.space ? ' ' : '';
      if (strWidth(line) + strWidth(gap) + strWidth(piece) <= room) { line += gap + piece; continue; }
      if (line) { out.push(indent + line); line = ''; }
      while (strWidth(piece) > room) {
        const head = clip(piece, room);
        out.push(indent + head);
        piece = piece.slice(head.length);
      }
      line = piece;
    }
    if (line) out.push(indent + line);
  }
  return out;
}

export type Snapshot = { codes: Uint16Array; attrs: Uint8Array; cursor: Grid['cursor'] };
export function snapshot(grid: Grid): Snapshot {
  return { codes: grid.codes.slice(), attrs: grid.attrs.slice(), cursor: { ...grid.cursor } };
}
export function restore(grid: Grid, snap: Snapshot): void {
  grid.codes.set(snap.codes); grid.attrs.set(snap.attrs);
  Object.assign(grid.cursor, snap.cursor);
  grid.version++;
}
