import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const base = resolve('public/studies/inktrace/living-archive/review');
const sheetPath = resolve(base, 'sprite-sheet.png');
const metadataPath = resolve(base, 'sprite-sheet.json');

describe('living archive generated sprite asset contract', () => {
  it('provides a registered transparent 8 × 3 sheet with 32 × 48 native cells', async () => {
    expect(existsSync(sheetPath), 'The generated cast must be packaged, not baked into a background').toBe(true);
    const image = await sharp(sheetPath).metadata();
    expect([image.width, image.height, image.hasAlpha]).toEqual([256, 144, true]);
  });

  it('declares the three cast rows and separate pose sequences', () => {
    expect(existsSync(metadataPath), 'The renderer needs an explicit sprite contract').toBe(true);
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect([metadata.cellWidth, metadata.cellHeight, metadata.columns, metadata.rows]).toEqual([32, 48, 8, 3]);
    expect(metadata.characters.map((person: { id: string }) => person.id)).toEqual(['mara', 'ivo', 'sen']);
    expect(metadata.actions.walk.frames).toEqual([1, 2, 3, 4]);
    expect(metadata.actions.idle.frames).toEqual([0]);
    expect(metadata.actions.turn.frames).toEqual([0, 5]);
    expect(metadata.actions.work.frames).toEqual([0, 6, 7, 0]);
    expect(metadata.reviewOnly).toBe(true);
  });

  it('keeps every frame inside its cell and registers the feet on one baseline', async () => {
    expect(existsSync(sheetPath)).toBe(true);
    const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const feet: number[] = [];
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 8; column++) {
        let count = 0;
        let bottom = -1;
        for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
          const alpha = data[((row * 48 + y) * info.width + column * 32 + x) * 4 + 3];
          if (alpha >= 128) {
            expect(x, `row ${row}, frame ${column} must have left gutter`).toBeGreaterThan(0);
            expect(x, `row ${row}, frame ${column} must have right gutter`).toBeLessThan(31);
            expect(y).toBeLessThan(47);
            bottom = Math.max(bottom, y);
            count++;
          }
        }
        expect(count).toBeGreaterThan(180);
        feet.push(bottom);
      }
    }
    expect(Math.max(...feet) - Math.min(...feet)).toBeLessThanOrEqual(1);
  });

  it('contains genuinely different raster poses, including alternate walk silhouettes', async () => {
    expect(existsSync(sheetPath)).toBe(true);
    for (let row = 0; row < 3; row++) {
      const frames = await Promise.all(Array.from({ length: 8 }, (_, column) => sharp(sheetPath)
        .extract({ left: column * 32, top: row * 48, width: 32, height: 48 }).ensureAlpha().raw().toBuffer()));
      const hashes = frames.map(frame => createHash('sha256').update(frame).digest('hex'));
      expect(new Set(hashes).size).toBe(8);
      for (const [a, b] of [[1, 3], [2, 4], [0, 5], [6, 7]]) {
        let difference = 0;
        for (let pixel = 3; pixel < frames[a].length; pixel += 4) {
          if ((frames[a][pixel] >= 128) !== (frames[b][pixel] >= 128)) difference++;
        }
        expect(difference, `row ${row}, frames ${a}/${b} need a changed silhouette`).toBeGreaterThan(20);
      }
    }
  });

  it('exports an actually animated, silent GIF proof instead of a static GIF', async () => {
    const gifPath = resolve(base, 'cast-action-proof.gif');
    expect(existsSync(gifPath)).toBe(true);
    const image = await sharp(gifPath, { animated: true }).metadata();
    expect(image.pages).toBeGreaterThan(8);
    expect(image.width).toBe(384);
    expect(image.pageHeight).toBe(168);
  });
});
