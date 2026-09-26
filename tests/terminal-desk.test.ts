import { describe, expect, it } from 'vitest';
import { GLASS, layoutShell, rasterAt } from '../components/terminal/crt/geometry';
import { RAMP_BASE } from '../components/terminal/crt/palette';
import { TvApp } from '../components/terminal/system/apps/tv';
import { harness } from './terminal-harness';

/*
 * JR-DESK as the visitor uses it: by pointing. What is behind each window (the
 * board, the disk, the album, the settings) and what it opens.
 */

describe('desk', () => {
  it('shows the clock and the counter on the top bar', () => {
    const h = harness();
    h.onDesk();
    expect(h.screen()).toMatch(/\d\d:\d\d {2}\d{6}/);
  });

  it('opens a work and its link from the library', () => {
    const h = harness();
    h.onDesk();
    h.click(...h.at('library'));
    h.clickText('InkTrace');
    expect(h.screen()).toContain('independent platform');
    h.clickText('Open link');
    expect(h.opened).toEqual(['https://inktrace.app']);
  });

  it('toggles and remembers sound in the settings', () => {
    const h = harness();
    h.onDesk();
    h.click(10, 8);
    h.clickText('Settings...');
    h.clickText('Sound on');
    expect(h.audio.enabled).toBe(false);
    expect(h.store.get('sound', true)).toBe(false);
  });

  it('logs off after asking, closing the session', () => {
    const h = harness();
    h.onDesk();
    h.click(10, 8);
    h.clickText('Log off');
    expect(h.screen()).toContain('Close the session');
    h.press('Enter'); h.run(3);
    expect(h.said.join(' ')).toContain('Closing session');
    expect(h.exited).toBe(true);
  });

  it('opens the help from the mark', () => {
    const h = harness();
    h.onDesk();
    h.click(10, 8);
    h.clickText('Help');
    expect(h.screen()).toContain('Click an icon to open it.');
  });

  it('gives the phone keyboard a field while a line is typed', () => {
    const h = harness();
    h.onDesk();
    expect(h.m.line).toBeNull();
    h.clickText('New');
    expect(h.m.line).toBe('');
    h.keys('hi');
    expect(h.m.line).toBe('hi');
    h.press('Escape');
    expect(h.m.line).toBeNull();
  });

  it('lists every caller: the friends, the JACKIEs, and the visitor now', () => {
    const h = harness();
    h.toDesk();
    h.click(...h.at('system'));
    h.clickText('Last callers');
    const s = h.screen();
    expect(s).toContain('LAST CALLERS');
    expect(s).toMatch(/JACKIE\s+← now/);
    expect(s).toContain('GUEST_2250');
  });
});

describe('television', () => {
  it('plays in a window on the desk, fills the screen on a double click, and goes quiet when closed', () => {
    const h = harness();
    h.onDesk();
    h.click(...h.at('tv'));
    expect(h.gui().openWindows.at(-1)).toBe('tv');
    expect(h.sounds).toContain('tune');
    expect(h.sounds).toContain('hiss:true');
    h.run(1);
    expect(h.screen()).toContain('CH 02');
    h.clickText('►');
    h.run(1);
    expect(h.screen()).toContain('CH 03');
    // The knob turns a notch at a time.
    const knob = h.gui().rectOf('tv')!;
    h.wheel(knob.x + knob.w - 16, knob.y + knob.h - 16, 1);
    h.run(1);
    expect(h.screen()).toContain('CH 04');
    const screen = h.gui().rectOf('tv')!;
    h.dblclick(screen.x + screen.w / 2, screen.y + 80);
    expect(h.m.top).toBeInstanceOf(TvApp);
    h.press('Escape');
    const r = h.gui().rectOf('tv')!;
    h.click(r.x + r.w - 12, r.y + 8);
    expect(h.sounds.at(-1)).toBe('hiss:false');
  });
});

describe('files and photos', () => {
  /** A grey picture the size of a photo, so thumbnails have something to show. */
  const photo = { width: 640, height: 400, data: new Uint8Array(640 * 400).fill(200) };

  it('shows the selected file beside the disk, and counts it read after a while', () => {
    const h = harness();
    h.onDesk();
    h.click(...h.at('files'));
    h.dblclickText('DIARY', 'file-list');
    expect(h.screen()).toContain('Files  C:\\DIARY');
    h.clickText('0001', 'file-list');
    expect(h.screen()).toContain('Saw a drawing in my feed');
    expect(h.m.has('file:DIARY/0001.TXT')).toBe(false);
    h.run(2.2);
    expect(h.m.has('file:DIARY/0001.TXT')).toBe(true);
    // Read on in the reader, a file at a time.
    h.dblclickText('0001', 'file-list');
    h.clickText('Next ►');
    expect(h.screen()).toContain('Work. Today');
    expect(h.m.has('file:DIARY/0002.TXT')).toBe(true);
  });

  it('draws the album in thumbnails and opens a photo with a double click', async () => {
    const h = harness('wide', undefined, photo);
    h.onDesk();
    h.click(...h.at('photos'));
    await h.settle(); h.run(0.1); await h.settle(); h.run(0.1);
    // The thumbnails land on the picture ramp.
    const page = h.m.graphics();
    expect([...page].some(v => v >= RAMP_BASE)).toBe(true);
    h.dblclickText('DESK');
    expect(h.m.mode).toBe('graphics');
    await h.settle(); h.run(2);
    expect(h.screen()).toContain('DESK.PCX');
  });
});

describe('on a phone', () => {
  it('lays the icons out in a grid and gives every window the whole screen', () => {
    const h = harness('large');
    h.onDesk();
    expect(h.m.scale).toBe(2);
    const board = h.gui().rectOf('board')!;
    expect(board).toMatchObject({ x: 0, w: 320 });
    h.press('Escape');
    for (const id of ['board', 'files', 'diary', 'photos', 'library', 'tv', 'games', 'dos', 'system']) {
      const [x, y] = h.at(id);
      expect(x).toBeLessThan(320);
      expect(y).toBeLessThan(200);
    }
  });

  it('shows a file on a tap, with a way back to the list', () => {
    const h = harness('large');
    h.onDesk();
    h.press('Escape');
    h.click(...h.at('files'), { kind: 'touch' });
    h.clickText('DIARY', 'file-list', { kind: 'touch' });
    expect(h.screen()).toContain('C:\\DIARY');
    h.clickText('0001', 'file-list', { kind: 'touch' });
    expect(h.screen()).toContain('Saw a drawing in my feed');
    h.clickText('◄ Back', undefined, { kind: 'touch' });
    expect(h.gui().find('0001', 'file-list')).not.toBeNull();
  });

  it('scrolls a list with a finger, and a drag is not a tap', () => {
    const h = harness('large');
    h.onDesk();
    h.press('Escape');
    h.click(...h.at('diary'), { kind: 'touch' });
    const first = h.gui().find('0002', 'file-list')!;
    h.pointer('down', first.x, first.y + 60, { kind: 'touch' });
    for (let i = 1; i <= 6; i++) h.pointer('move', first.x, first.y + 60 - i * 12, { kind: 'touch' });
    h.pointer('up', first.x, first.y - 12, { kind: 'touch' });
    h.run(0.5);
    expect(h.gui().find('0002', 'file-list')).toBeNull();
    // Nothing was opened by the drag.
    expect(h.gui().openWindows.at(-1)).toBe('files');
  });
});

describe('taps', () => {
  it('finds the raster under a point of the viewport, through the curvature', () => {
    const layout = layoutShell(390, 844);
    const centre = rasterAt(layout, layout.x + GLASS.cx * layout.scale, layout.y + GLASS.cy * layout.scale);
    expect(centre.u).toBeCloseTo(0.5, 5);
    expect(centre.v).toBeCloseTo(0.5, 5);
    const a = rasterAt(layout, 100, 400), b = rasterAt(layout, 200, 400), c = rasterAt(layout, 200, 500);
    expect(b.u).toBeGreaterThan(a.u);
    expect(c.v).toBeGreaterThan(b.v);
  });
});
