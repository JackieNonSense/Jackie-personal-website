import { describe, expect, it } from 'vitest';
import { RASTER_W } from '../components/terminal/crt/raster';
import { INK } from '../components/terminal/crt/palette';
import { BAR_H } from '../components/terminal/system/gui/desktop';
import { Gfx, PATTERNS } from '../components/terminal/system/gui/gfx';
import { TvApp } from '../components/terminal/system/apps/tv';
import { harness } from './terminal-harness';

/** The pixel desk, driven by a pointer the way a visitor drives it. */
function desk() {
  const h = harness();
  h.onPixelDesk();
  return h;
}

describe('pixel desk', () => {
  it('comes up on the board, newest message first', () => {
    const h = desk();
    expect(h.gui().openWindows).toEqual(['board']);
    expect(h.screen()).toContain("I didn't write anything.");
  });

  it('opens a window with a single click on its icon', () => {
    const h = desk();
    h.click(...h.at('files'));
    expect(h.gui().openWindows.at(-1)).toBe('files');
    expect(h.screen()).toContain('DIARY');
  });

  it('moves a window by its title bar, and never off the desk', () => {
    const h = desk();
    const r = h.gui().rectOf('board')!;
    h.drag([r.x + 60, r.y + 8], [r.x + 20, r.y + 58]);
    expect(h.gui().rectOf('board')).toMatchObject({ x: r.x - 40, y: r.y + 50 });
    h.drag([r.x + 20, r.y + 58], [r.x - 900, r.y - 900]);
    const after = h.gui().rectOf('board')!;
    expect(after.y).toBe(BAR_H);
    expect(after.x + after.w).toBeGreaterThanOrEqual(48);
  });

  it('draws a window being dragged exactly as a whole new drawing would', () => {
    const h = desk();
    h.click(...h.at('files'));
    h.click(...h.at('system'));
    const r = h.gui().rectOf('system')!;
    h.pointer('down', r.x + 40, r.y + 8);
    for (let i = 1; i <= 8; i++) { h.pointer('move', r.x + 40 - i * 9, r.y + 8 + i * 5); h.run(1 / 60); }
    const dragged = Uint8Array.from(h.m.graphics());
    h.gui().invalidate();
    h.run(1 / 60);
    expect(Buffer.compare(Buffer.from(dragged), Buffer.from(h.m.graphics()))).toBe(0);
    h.pointer('up', r.x - 32, r.y + 48);
    expect(h.gui().rectOf('system')).toMatchObject({ x: r.x - 72, y: r.y + 40 });
    expect(h.gui().openWindows).toEqual(['board', 'files', 'system']);
  });

  it('keeps a window on whole pixels when the pointer is between them, and its picture with it', () => {
    const h = desk();
    h.click(...h.at('tv'));
    h.run(0.6);
    const r = h.gui().rectOf('tv')!;
    h.pointer('down', r.x + 60.37, r.y + 8.61);
    for (let i = 1; i <= 6; i++) { h.pointer('move', r.x + 60.37 + i * 7.29, r.y + 8.61 + i * 3.13); h.run(1 / 60); }
    h.pointer('up', r.x + 60.37 + 43.74, r.y + 8.61 + 18.78);
    h.run(0.3);
    const after = h.gui().rectOf('tv')!;
    expect(Number.isInteger(after.x) && Number.isInteger(after.y)).toBe(true);
    // The set still shows its channel: the middle of its screen is not all black.
    const page = h.m.graphics(), cx = after.x + after.w / 2, cy = after.y + after.h / 2;
    let lit = 0;
    for (let y = cy - 30; y < cy + 30; y++) for (let x = cx - 60; x < cx + 60; x++) if (page[y * RASTER_W + x]) lit++;
    expect(lit).toBeGreaterThan(1000);
  });

  it('fills the screen with the television from its corner box, its title, or its button', () => {
    for (const how of ['box', 'title', 'button'] as const) {
      const h = desk();
      h.click(...h.at('tv'));
      h.run(0.5);
      const r = h.gui().rectOf('tv')!;
      if (how === 'box') h.click(r.x + r.w - 12 - 20, r.y + 8);
      else if (how === 'title') h.dblclick(r.x + 60, r.y + 8);
      else h.clickText('Full');
      expect(h.m.top, how).toBeInstanceOf(TvApp);
    }
  });

  it('never leaves the desk in a scroll track drawn between pixels', () => {
    const page = new Uint8Array(RASTER_W * 400), g = new Gfx(page, new Uint8Array(4096 * 16), 1);
    g.pattern({ x: 0, y: 0, w: 640, h: 400 }, PATTERNS.solid, 'deskAlt', 'desk');
    g.pattern({ x: 100.4, y: 50.6, w: 12, h: 120 }, PATTERNS.half, 'shadow', 'face');
    for (let y = 52; y < 169; y++) for (let x = 101; x < 111; x++) expect([INK.shadow, INK.face]).toContain(page[y * RASTER_W + x]);
  });

  it('draws the desk in the pattern of the tube just chosen', () => {
    const h = desk();
    h.press('Escape');
    const page = h.m.graphics(), row = (BAR_H + 180) * RASTER_W + 600;
    const before = Array.from(page.subarray(row, row + 8));
    // Classic (the tube it starts on) weaves its desk in one flat colour; green in a sparse quarter.
    expect(before.every(v => v === INK.deskAlt)).toBe(true);
    h.m.setTheme('p1');
    h.run(1 / 60);
    const after = Array.from(page.subarray(row, row + 8));
    expect(after).not.toEqual(before);
  });

  it('closes a window with its close box, and with ESC', () => {
    const h = desk();
    const r = h.gui().rectOf('board')!;
    h.click(r.x + r.w - 12, r.y + 8);
    expect(h.gui().openWindows).toEqual([]);
    h.click(...h.at('files'));
    h.press('Escape');
    expect(h.gui().openWindows).toEqual([]);
  });

  it('takes one click to look and two to open', () => {
    const h = desk();
    h.click(...h.at('files'));
    h.clickText('NOTES', 'file-list');
    expect(h.screen()).toContain('DIRECTORY  C:\\NOTES');
    h.dblclickText('NOTES', 'file-list');
    expect(h.screen()).toContain('Files  C:\\NOTES');
  });

  it('opens an icon on a click, and moves it on a drag, remembering where', () => {
    const h = desk();
    const [x, y] = h.at('photos');
    h.drag([x, y], [x + 2, y + 1]);
    expect(h.gui().openWindows.at(-1)).toBe('photos');
    h.press('Escape');
    h.drag([x, y], [x + 200, y + 40]);
    expect(h.gui().openWindows.at(-1)).not.toBe('photos');
    const [nx, ny] = h.at('photos');
    expect(Math.abs(nx - (x + 200))).toBeLessThanOrEqual(8);
    expect(Math.abs(ny - (y + 40))).toBeLessThanOrEqual(8);
    const again = harness('wide', h.store);
    again.onPixelDesk();
    expect(again.at('photos')).toEqual([nx, ny]);
  });

  it('opens the menu under the mark and runs what is chosen', () => {
    const h = desk();
    h.click(10, 8);
    expect(h.screen()).toContain('About JR-DESK');
    h.clickText('Settings...');
    expect(h.gui().openWindows.at(-1)).toBe('settings');
    h.clickText('P3 amber');
    expect(h.themes).toEqual(['p3']);
    expect(h.store.get('theme', null)).toBe('p3');
  });

  it('holds everything else while a dialog is open', () => {
    const h = desk();
    h.click(10, 8);
    h.clickText('About JR-DESK');
    const open = h.gui().openWindows.length;
    h.click(...h.at('files'));
    expect(h.sounds).toContain('beep');
    expect(h.gui().openWindows.length).toBe(open);
    h.clickText('OK');
    expect(h.gui().openWindows.length).toBe(open - 1);
  });

  it('scrolls the list under the pointer with the wheel', () => {
    const h = desk();
    h.click(...h.at('diary'));
    const row = h.gui().find('0001 ', 'file-list');
    expect(row).not.toBeNull();
    h.wheel(row!.x, row!.y, 5);
    expect(h.gui().find('0001 ', 'file-list')).toBeNull();
  });

  it('opens the diary on the first entry not yet read', () => {
    const h = desk();
    h.m.mark('file:DIARY/0001.TXT');
    h.click(...h.at('diary'));
    expect(h.screen()).toContain('Files  C:\\DIARY');
    expect(h.screen()).toContain('Work. Today');
  });

  it('undeletes a file when its lost letter is pointed at, and counts a wrong one', () => {
    const h = desk();
    h.click(...h.at('files'));
    h.dblclickText('SYSTEM', 'file-list');
    expect(h.screen()).not.toContain('?EED');
    h.click(...h.at('show-deleted'));
    expect(h.screen()).toContain('?EED');
    h.dblclickText('?EED', 'file-list');
    expect(h.screen()).toContain('UNDELETE');
    const letters = h.gui().locate('letters')!, w = Math.floor(letters.w / 12);
    const letter = (ch: string) => {
      const i = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.indexOf(ch);
      h.click(letters.x + (i % 12) * w + w / 2, letters.y + Math.floor(i / 12) * 20 + 9);
    };
    const before = h.m.hesitations;
    letter('X');
    expect(h.m.hesitations).toBe(before + 1);
    expect(h.m.has('undeleted:SYSTEM/SEED.LOG')).toBe(false);
    letter('S');
    expect(h.m.has('undeleted:SYSTEM/SEED.LOG')).toBe(true);
    expect(h.said.join(' ')).toContain('File successfully undeleted: SEED.LOG');
    expect(h.screen()).toContain('SEED COLLECTION LOG');
  });

  it('counts clicks with the keys on the top bar', () => {
    const h = desk();
    h.click(300, 300); h.click(300, 300); h.click(300, 300);
    h.run(0.1);
    expect(h.m.clicks).toBe(3);
    expect(h.screen()).toContain('000003');
  });

  it('walks the icons with the arrows when no window is open', () => {
    const h = desk();
    h.press('Escape');
    h.press('ArrowDown'); h.press('Enter');
    expect(h.gui().openWindows).toEqual(['board']);
  });
});

describe('pointer on the tube', () => {
  it('draws the pointer into the frame without touching the page under it', () => {
    const h = desk();
    const raster = new Uint8Array(RASTER_W * 400);
    h.move(300, 200);
    expect(h.m.render(raster, 0, 1)).toBe(true);
    // The arrow's first pixel is its outline, at the hot spot.
    expect(raster[200 * RASTER_W + 300]).toBe(INK.cursorLine);
    expect(h.m.render(raster, 0, 1)).toBe(false);
    h.move(310, 200);
    expect(h.m.render(raster, 0, 1)).toBe(true);
    expect(raster[200 * RASTER_W + 300]).not.toBe(INK.cursorLine);
  });

  it('hides the pointer for a finger', () => {
    const h = desk();
    const raster = new Uint8Array(RASTER_W * 400);
    h.click(300, 200, { kind: 'touch' });
    h.m.render(raster, 0, 1);
    expect(raster[200 * RASTER_W + 300]).not.toBe(INK.cursorLine);
  });
});
