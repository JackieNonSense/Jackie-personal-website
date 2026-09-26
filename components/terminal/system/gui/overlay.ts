import { contains, inset, type Rect } from './geometry';
import { GLYPH } from './icons';
import type { Gfx, Icon } from './gfx';
import type { Text } from '../i18n';
import type { Machine, Pointer } from '../machine';

/*
 * Buttons laid over a full-screen program (the picture viewer, the reader, DOS, a
 * game): a way out and a way on, for a visitor with only a mouse or a finger. They
 * are drawn over whatever the program shows and never take its keys.
 */
export type OverlayButton = { id: string; rect: Rect; label?: Text; glyph?: Icon };

/** The usual way out: a close box in the top right corner. */
export const closeBox = (width: number): OverlayButton => ({ id: 'close', rect: { x: width - 24, y: 2, w: 22, h: 16 }, glyph: GLYPH.close });

export function drawButtons(g: Gfx, m: Machine, buttons: readonly OverlayButton[], hover: string | null, down: string | null): void {
  for (const b of buttons) {
    const on = b.id === hover, pressed = on && b.id === down, r = b.rect;
    g.fill(r, on ? 'select' : 'face');
    g.rect(r, 'frame');
    g.bevel(inset(r, 1), pressed ? 'pressed' : 'raised');
    const colour = on ? 'selectText' : 'faceText';
    const label = b.label ? m.t(b.label) : '';
    const gw = b.glyph ? b.glyph.w + (label ? 4 : 0) : 0, w = gw + g.measure(label);
    let x = r.x + Math.floor((r.w - w) / 2) + (pressed ? 1 : 0);
    const y = r.y + (pressed ? 1 : 0);
    if (b.glyph) { g.icon(b.glyph, x, y + Math.floor((r.h - b.glyph.h) / 2), { '#': colour }); x += gw; }
    if (label) g.text(x, y + Math.floor((r.h - 16) / 2), label, colour);
  }
}

export const buttonAt = (buttons: readonly OverlayButton[], x: number, y: number): OverlayButton | null => buttons.find(b => contains(b.rect, x, y)) ?? null;

/**
 * The pointer over a row of overlay buttons: hover, press and release, the way a
 * real button behaves (let go somewhere else and nothing happens). `press` is
 * called with the button's id on a completed click.
 */
export class ButtonTracker {
  hover: string | null = null;
  down: string | null = null;

  /** Returns true when the pointer was over a button, so the program does nothing else with it. */
  pointer(m: Machine, p: Pointer, buttons: readonly OverlayButton[], press: (id: string) => void): boolean {
    const at = p.inside ? buttonAt(buttons, p.lx, p.ly)?.id ?? null : null;
    const was = { hover: this.hover, down: this.down };
    if (p.kind === 'mouse') this.hover = at;
    if (p.phase === 'down') this.down = at;
    let used = at !== null || was.down !== null;
    if (p.phase === 'up' || p.phase === 'cancel') {
      const fire = p.phase === 'up' && at !== null && at === this.down;
      this.down = null;
      if (p.kind !== 'mouse') this.hover = null;
      if (fire) press(at!);
      used = used || fire;
    }
    if (p.phase === 'leave') this.hover = null;
    if (was.hover !== this.hover || was.down !== this.down) m.redraw();
    // A hand over a button; programs with shapes of their own set them after this.
    m.cursor(at ? 'hand' : 'arrow');
    return used;
  }
}
