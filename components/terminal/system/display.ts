import { createGrid, type Grid } from '../crt/grid';
import { rasterizeStatic, rasterizeText, RASTER_H, RASTER_W } from '../crt/raster';
import { INK } from '../crt/palette';
import type { Picture } from '../graphics/bitmap';
import type { Text } from './i18n';
import type { DisplayMode, Machine } from './machine';

/**
 * What a television channel draws on: a text page and a graphics page, as the
 * machine's own screen has. The machine is one; a set in a window is another.
 */
export interface Display {
  readonly grid: Grid;
  readonly cols: number;
  readonly rows: number;
  readonly glyphs: Uint8Array | null;
  mode: DisplayMode;
  t(text: Text): string;
  has(flag: string): boolean;
  graphics(): Uint8Array;
  present(): void;
  setMode(mode: DisplayMode): void;
  loadPicture(url: string): Promise<Picture>;
}

/** A second screen, drawn off to the side: the television in its window. */
export class OffscreenDisplay implements Display {
  readonly grid = createGrid(80, 25);
  mode: DisplayMode = 'text';
  private readonly page = new Uint8Array(RASTER_W * RASTER_H);

  constructor(private readonly m: Machine) {}

  get cols(): number { return this.grid.cols; }
  get rows(): number { return this.grid.rows; }
  get glyphs(): Uint8Array | null { return this.m.glyphs; }
  t(text: Text): string { return this.m.t(text); }
  has(flag: string): boolean { return this.m.has(flag); }
  loadPicture(url: string): Promise<Picture> { return this.m.loadPicture(url); }

  graphics(): Uint8Array {
    if (this.mode === 'text') this.mode = 'graphics';
    return this.page;
  }

  present(): void {}

  setMode(mode: DisplayMode): void {
    this.mode = mode;
    if (mode === 'text') this.page.fill(INK.tmBg);
  }

  /** The frame as a tube would draw it: palette indices, 640 x 400. */
  compose(out: Uint8Array, time: number): void {
    if (this.mode === 'static') rasterizeStatic(out, time, 777);
    else if (this.mode === 'graphics') out.set(this.page);
    else out.fill(INK.tmBg);
    if (this.glyphs) rasterizeText(this.grid, this.glyphs, out, time, 1, this.mode !== 'text');
  }
}
