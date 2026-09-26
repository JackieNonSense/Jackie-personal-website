import { describe, expect, it } from 'vitest';
import { GREY, INK, RAMP_BASE, ROLES, type Role } from '../components/terminal/crt/palette';
import { BUTTONS, THEMES, luminance, mixPalette, type Rgb, type ThemeId } from '../components/terminal/crt/themes';
import { DEGAUSS, degaussAt } from '../components/terminal/crt/degauss';
import { CONTROLS, GLASS, controlAt, cssAt, layoutShell, rasterAt, rasterPoint } from '../components/terminal/crt/geometry';
import { BOOT } from '../components/terminal/content/boot';
import { harness } from './terminal-harness';

const ids = Object.keys(THEMES) as ThemeId[];
const colour = (id: ThemeId, i: number): Rgb => { const p = THEMES[id].palette; return [p[i * 4], p[i * 4 + 1], p[i * 4 + 2]]; };
const contrast = (a: Rgb, b: Rgb) => { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

describe('tubes', () => {
  it('gives every tube a full palette: black at 0, and a picture ramp that only gets brighter', () => {
    expect(ids).toHaveLength(6);
    expect([...BUTTONS].sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const t = THEMES[id];
      expect(t.palette).toHaveLength(256 * 4);
      expect(luminance(colour(id, 0))).toBeLessThan(0.01);
      for (let i = RAMP_BASE + 1; i < 256; i++) expect(luminance(colour(id, i))).toBeGreaterThanOrEqual(luminance(colour(id, i - 1)) - 1e-6);
      expect(t.bios.length).toBeLessThanOrEqual(13);
    }
    expect(ROLES.length).toBeLessThanOrEqual(RAMP_BASE - 16);
  });

  it('keeps text readable on every tube', () => {
    const pairs: [Role, Role][] = [['faceText', 'face'], ['fieldText', 'field'], ['selectText', 'select'], ['titleOnText', 'titleOn'], ['barText', 'bar'], ['tmText', 'tmBg'], ['tmBright', 'tmBg'], ['tmInvText', 'tmText']];
    for (const id of ids) for (const [fg, bg] of pairs) {
      const least = THEMES[id].tube.mono ? 3 : 4.5;
      expect(contrast(colour(id, INK[fg]), colour(id, INK[bg])), `${id} ${fg} on ${bg}`).toBeGreaterThanOrEqual(least);
    }
  });

  it('shows the green tube exactly as the machine always did', () => {
    const P1: Rgb = [0.05, 1, 0.1];
    const is = (i: number, level: number) => colour('p1', i).forEach((c, k) => expect(c).toBeCloseTo(P1[k] * level, 5));
    is(INK.tmText, 188 / 255);
    is(INK.tmDim, 104 / 255);
    is(INK.tmBright, 1);
    is(INK.tmBg, 0);
    // Pictures: each intensity on the ramp within half a step of what it was.
    for (const v of [0, 60, 128, 200, 255]) expect(colour('p1', GREY[v])[1]).toBeCloseTo(v / 255, 2);
  });

  it('mixes one palette into another', () => {
    const out = new Float32Array(256 * 4);
    expect([...mixPalette(out, THEMES.p1.palette, THEMES.jr.palette, 0)]).toEqual([...THEMES.p1.palette]);
    expect([...mixPalette(out, THEMES.p1.palette, THEMES.jr.palette, 1)]).toEqual([...THEMES.jr.palette]);
  });

  it('names the tube in the BIOS table without breaking its frame', () => {
    const h = harness();
    for (const id of ids) {
      h.m.setTheme(id);
      const lines = BOOT.config(h.m);
      expect(lines.join('\n')).toContain(THEMES[id].bios);
      expect(new Set(lines.map(l => l.length)).size).toBe(1);
    }
  });

  it('starts on the Classic tube, remembers the tube, and tells the page when it changes', () => {
    const h = harness();
    expect(h.m.theme.id).toBe('classic');
    h.m.setTheme('p3');
    expect(h.themes).toEqual(['p3']);
    expect(h.store.get('theme', null)).toBe('p3');
    h.m.setTheme('p3');
    expect(h.themes).toEqual(['p3']);
    const again = harness('wide', h.store);
    expect(again.m.theme.id).toBe('p3');
  });
});

describe('degaussing', () => {
  it('brings the new palette in fast, swims, smears, and settles', () => {
    expect(degaussAt(0, false).mix).toBe(0);
    expect(degaussAt(DEGAUSS.mixFrom + DEGAUSS.mixFor, false).mix).toBeCloseTo(1, 5);
    expect(degaussAt(DEGAUSS.wobblePeak, false).wobble).toBeCloseTo(1, 1);
    expect(degaussAt(DEGAUSS.purityPeak, false).purity).toBeGreaterThan(0.8);
    expect(degaussAt(1.4, false).wobble).toBeLessThan(0.05);
    expect(degaussAt(DEGAUSS.length, false)).toEqual({ mix: 1, wobble: 0, purity: 0, done: true });
  });

  it('switches at once for a visitor who wants less motion', () => {
    expect(degaussAt(0, true)).toEqual({ mix: 1, wobble: 0, purity: 0, done: true });
  });
});

describe('controls', () => {
  const layout = layoutShell(1440, 900);
  const at = (x: number, y: number) => ({ x: layout.x + x * layout.scale, y: layout.y + y * layout.scale });

  it('finds each button under the screen, and the knob', () => {
    CONTROLS.buttons.forEach(({ hit }, index) => {
      const p = at(hit.x + hit.w / 2, hit.y + hit.h / 2);
      expect(controlAt(layout, p.x, p.y)).toEqual({ kind: 'button', index });
    });
    const k = at(CONTROLS.knob.cx, CONTROLS.knob.cy);
    expect(controlAt(layout, k.x, k.y)).toEqual({ kind: 'knob' });
    const glass = at(GLASS.cx, GLASS.cy);
    expect(controlAt(layout, glass.x, glass.y)).toBeNull();
  });

  it('reaches further for a finger', () => {
    const { hit } = CONTROLS.buttons[2];
    const below = at(hit.x + hit.w / 2, hit.y + hit.h + 10);
    expect(controlAt(layout, below.x, below.y)).toBeNull();
    expect(controlAt(layout, below.x, below.y, 20)).toEqual({ kind: 'button', index: 2 });
  });
});

describe('pointing at the raster', () => {
  const layout = layoutShell(1440, 900);

  it('puts the middle of the glass in the middle of the raster, and holds the edge in the border', () => {
    const c = rasterPoint(layout, layout.x + GLASS.cx * layout.scale, layout.y + GLASS.cy * layout.scale);
    expect(c.x).toBeCloseTo(320, 3);
    expect(c.y).toBeCloseTo(200, 3);
    expect(c.inside).toBe(true);
    // Just inside the glass, past the raster: held at the raster's edge.
    const edge = rasterPoint(layout, layout.x + (GLASS.cx + GLASS.rx * 0.985) * layout.scale, layout.y + GLASS.cy * layout.scale);
    expect(edge).toMatchObject({ x: 639, inside: true });
    const off = rasterPoint(layout, 5, 5);
    expect(off.inside).toBe(false);
  });

  it('turns a raster point back into the viewport point that shows it', () => {
    for (const [rx, ry] of [[0, 0], [320, 200], [600, 30], [17, 390]]) {
      const p = cssAt(layout, rx, ry);
      const { u, v } = rasterAt(layout, p.x, p.y);
      expect(u * 640).toBeCloseTo(rx, 3);
      expect(v * 400).toBeCloseTo(ry, 3);
    }
  });
});

describe('the ident', () => {
  const ident = BOOT.ident;
  const kinds = (page: Uint8Array) => new Set(page);

  it('comes on from black, holds the whole plate, and goes off to a point', () => {
    const length = ident.length(false, false), page = new Uint8Array(640 * 400);
    ident.draw(page, 0, length, false, false);
    expect(page.some(v => v !== 0)).toBe(false);
    ident.draw(page.fill(0), length / 2, length, false, false);
    for (const v of [INK.plate, INK.plateField, INK.plateInk]) expect(kinds(page).has(v)).toBe(true);
    ident.draw(page.fill(0), length - 0.01, length, false, false);
    const lit = page.reduce((n, v) => n + (v ? 1 : 0), 0);
    expect(lit).toBeGreaterThan(0);
    expect(lit).toBeLessThan(40);
  });

  it('is shorter for a returning visitor, and still for one who wants less motion', () => {
    expect(ident.length(true, false)).toBeLessThan(ident.length(false, false));
    const page = new Uint8Array(640 * 400);
    ident.draw(page, 0, ident.length(false, true), true, false);
    for (const v of [INK.plate, INK.plateField, INK.plateInk]) expect(kinds(page).has(v)).toBe(true);
  });

  it('never spells out the full name', () => {
    expect(ident.name).toBe('J&R.');
  });
});
