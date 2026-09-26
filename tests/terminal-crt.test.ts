import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { CP437, GLYPH_H, decodeAtlas, glyphCode, UNKNOWN_GLYPH } from '../components/terminal/crt/font';
import { ATTR, COLS, ROWS, TEXT_MODES, clearGrid, createGrid, rowText, writeText } from '../components/terminal/crt/grid';
import { RASTER_H, RASTER_W, rasterizeText } from '../components/terminal/crt/raster';
import { INK } from '../components/terminal/crt/palette';
import { COLLAPSE, IGNITE, beamAt, switchPower, type Power } from '../components/terminal/crt/power';
import { GLASS, SHELL, beamSpread, layoutShell } from '../components/terminal/crt/geometry';
import { diffKeys } from '../components/terminal/system/soft-keyboard';

/** Minimal decoder for the 8-bit greyscale atlas PNG, expanded to RGBA. */
function readGreyPng(file: Buffer): { width: number; rgba: Uint8ClampedArray } {
  let pos = 8, width = 0, height = 0;
  const idat: Buffer[] = [];
  while (pos < file.length) {
    const length = file.readUInt32BE(pos), type = file.toString('latin1', pos + 4, pos + 8), data = file.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); expect([data[8], data[9], data[12]]).toEqual([8, 0, 0]); }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat)), px = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (width + 1)];
    for (let x = 0; x < width; x++) {
      const v = raw[y * (width + 1) + 1 + x], a = x ? px[y * width + x - 1] : 0, b = y ? px[(y - 1) * width + x] : 0, c = x && y ? px[(y - 1) * width + x - 1] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      px[y * width + x] = (v + pred) & 0xff;
    }
  }
  const rgba = new Uint8ClampedArray(width * height * 4);
  px.forEach((v, i) => { rgba.fill(v, i * 4, i * 4 + 3); rgba[i * 4 + 3] = 255; });
  return { width, rgba };
}

function glyphs(): Uint8Array {
  // A synthetic atlas: every glyph is a solid block except '_' which is a single bottom row.
  const bits = new Uint8Array(256 * GLYPH_H).fill(0xff);
  bits.fill(0, 32 * GLYPH_H, 33 * GLYPH_H);
  bits.fill(0, 95 * GLYPH_H, 96 * GLYPH_H);
  bits[95 * GLYPH_H + 15] = 0xff;
  return bits;
}

describe('code page 437', () => {
  it('has exactly one character per cell and round-trips box drawing', () => {
    expect(CP437).toHaveLength(256);
    expect(glyphCode('A')).toBe(65);
    expect(glyphCode(' ')).toBe(32);
    expect(glyphCode('█')).toBe(219);
    expect(glyphCode('┌')).toBe(218);
    expect(glyphCode('░')).toBe(176);
    expect(glyphCode('’')).toBe(39);
    expect(glyphCode('字')).toBe(UNKNOWN_GLYPH);
  });

  it('decodes the committed atlas into lit VGA glyphs', () => {
    const image = readGreyPng(readFileSync(resolve('public/terminal/vga-8x16.png')));
    const bits = decodeAtlas(image.rgba, image.width);
    expect(bits.subarray(32 * GLYPH_H, 33 * GLYPH_H).every(v => v === 0)).toBe(true);
    expect(bits.subarray(219 * GLYPH_H, 220 * GLYPH_H).every(v => v === 0xff)).toBe(true);
    // 'A' in the VGA font starts two rows down and is symmetric.
    const a = Array.from(bits.subarray(65 * GLYPH_H, 66 * GLYPH_H));
    expect(a[0]).toBe(0);
    expect(a.filter(Boolean).length).toBeGreaterThan(6);
  });
});

describe('text grid', () => {
  it('wraps at the right margin and scrolls at the bottom', () => {
    const grid = createGrid();
    writeText(grid, 'x'.repeat(COLS + 3));
    expect(grid.cursor).toMatchObject({ x: 3, y: 1 });
    for (let i = 0; i < ROWS + 2; i++) writeText(grid, `line ${i}\n`);
    expect(grid.cursor.y).toBe(ROWS - 1);
    expect(rowText(grid, ROWS - 2).trimEnd()).toBe(`line ${ROWS + 1}`);
  });

  it('backspace erases, and clear homes the cursor', () => {
    const grid = createGrid();
    writeText(grid, 'dir\b\b');
    expect(rowText(grid, 0).trimEnd()).toBe('d');
    clearGrid(grid);
    expect(grid.cursor).toMatchObject({ x: 0, y: 0 });
    expect(rowText(grid, 0).trim()).toBe('');
  });
});

describe('rasteriser', () => {
  it("fills 8x16 cells with each attribute's colour, with inverse and cursor", () => {
    const grid = createGrid(), out = new Uint8Array(RASTER_W * RASTER_H);
    expect(RASTER_W / RASTER_H).toBeCloseTo(1.6);
    writeText(grid, 'A'); writeText(grid, 'B', ATTR.bright); writeText(grid, 'C', ATTR.dim); writeText(grid, ' ', ATTR.inverse);
    grid.cursor.visible = false;
    rasterizeText(grid, glyphs(), out, 0);
    const at = (x: number, y: number) => out[y * RASTER_W + x];
    expect(at(0, 5)).toBe(INK.tmText);
    expect(at(8, 5)).toBe(INK.tmBright);
    expect(at(16, 5)).toBe(INK.tmDim);
    // Inverse lights the whole cell.
    expect(at(24, 5)).toBe(INK.tmText);
    expect(at(40, 5)).toBe(INK.tmBg);
    grid.cursor.visible = true;
    rasterizeText(grid, glyphs(), out, 0);
    expect(at(grid.cursor.x * 8 + 3, 15)).toBe(INK.tmText);
  });

  it('doubles every glyph pixel in the 40-column mode and centres the page', () => {
    const { cols, rows, zoom } = TEXT_MODES.large;
    const grid = createGrid(cols, rows), out = new Uint8Array(RASTER_W * RASTER_H);
    expect(cols * 8 * zoom).toBe(RASTER_W);
    grid.cursor.visible = false;
    writeText(grid, 'A_');
    rasterizeText(grid, glyphs(), out, 0, zoom);
    const top = (RASTER_H - rows * 16 * zoom) / 2;
    expect(out[0]).toBe(INK.tmBg);
    expect(out[(top + 1) * RASTER_W + 15]).toBe(INK.tmText);
    // '_' lights only its last glyph row, which is two raster rows tall.
    expect(out[(top + 29) * RASTER_W + 16]).toBe(INK.tmBg);
    expect(out[(top + 30) * RASTER_W + 16]).toBe(INK.tmText);
    expect(out[(top + 31) * RASTER_W + 31]).toBe(INK.tmText);
  });
});

describe('power timeline', () => {
  const on = switchPower({ phase: 'standby', since: 0 }, true, 10);

  it('shows only the afterglow dot while cold', () => {
    const b = beamAt({ phase: 'standby', since: 0 }, 3, false);
    expect(b.emitting).toBe(false);
    expect(b.dot).toBeGreaterThan(0.3);
  });

  it('flares the dot, sweeps a line, then opens the raster', () => {
    expect(beamAt(on, 10 + IGNITE.flare / 2, false).dot).toBeGreaterThan(1);
    const line = beamAt(on, 10 + (IGNITE.flare + IGNITE.sweep) / 2, false);
    expect(line.sy).toBeLessThan(0.01);
    expect(line.sx).toBeGreaterThan(0.1);
    const open = beamAt(on, 10 + IGNITE.open + 3, false);
    expect(open).toMatchObject({ sx: 1, sy: 1, emitting: true });
    expect(open.brightness).toBeGreaterThan(0.95);
  });

  it('collapses on switch-off and settles back to the dot', () => {
    const off: Power = switchPower(on, false, 20);
    expect(beamAt(off, 20 + COLLAPSE.line * 0.99, false).sy).toBeLessThan(0.1);
    expect(beamAt(off, 20 + (COLLAPSE.line + COLLAPSE.dot) / 2, false).sx).toBeLessThan(1);
    expect(beamAt(off, 25, false).emitting).toBe(false);
  });

  it('skips the theatrics under reduced motion', () => {
    expect(beamAt(on, 10, true)).toMatchObject({ sx: 1, sy: 1, brightness: 1, emitting: true });
  });

  it('never divides the raster energy by zero', () => {
    for (let t = 10; t < 11; t += 0.01) expect(Number.isFinite(beamAt(on, t, false).gain)).toBe(true);
  });
});

describe('layout', () => {
  it('keeps the set on screen with room for the tabletop', () => {
    for (const [w, h] of [[1440, 900], [1920, 1080], [1366, 768]]) {
      const l = layoutShell(w, h);
      expect(l.closeUp).toBe(false);
      const { bounds } = SHELL;
      expect(l.x + bounds.x * l.scale).toBeGreaterThanOrEqual(0);
      expect(l.x + (bounds.x + bounds.w) * l.scale).toBeLessThanOrEqual(w);
      expect(l.y + bounds.y * l.scale).toBeGreaterThanOrEqual(0);
      expect(l.y + (bounds.y + bounds.h) * l.scale).toBeLessThan(h * 0.9);
    }
  });

  it('closes in on a phone so the glass fills the width, above the keyboard', () => {
    const open = layoutShell(390, 844);
    expect(open.closeUp).toBe(true);
    const glassWidth = 2 * GLASS.rx * open.scale;
    expect(glassWidth).toBeGreaterThan(360);
    expect(glassWidth).toBeLessThanOrEqual(390);
    const typing = layoutShell(390, 844, { top: 0, height: 480 });
    const glassBottom = typing.y + (GLASS.cy + GLASS.ry) * typing.scale;
    expect(glassBottom).toBeLessThan(480);
    expect(typing.y + (GLASS.cy - GLASS.ry) * typing.scale).toBeGreaterThan(0);
  });

  it('widens the beam instead of aliasing scanlines on coarse displays', () => {
    expect(beamSpread(2)).toBe(0);
    expect(beamSpread(0.67)).toBeGreaterThan(0.2);
    expect(beamSpread(0.3)).toBeLessThanOrEqual(0.3);
  });
});

describe('phone keyboard', () => {
  it('replays edits of the text field as keystrokes', () => {
    expect(diffKeys('', 'help')).toEqual(['h', 'e', 'l', 'p'].map(key => ({ key, ctrl: false })));
    expect(diffKeys('help', 'hel')).toEqual([{ key: 'Backspace', ctrl: false }]);
  });

  it('turns an autocorrected word into backspaces and the replacement', () => {
    const keys = diffKeys('teh', 'the').map(k => k.key);
    expect(keys).toEqual(['Backspace', 'Backspace', 'h', 'e']);
  });

});
