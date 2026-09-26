import { ATTR } from '../../crt/grid';
import { body, frame, statusBar, text, wrap } from '../screen';
import { ButtonTracker, closeBox, drawButtons, type OverlayButton } from '../gui/overlay';
import { strWidth } from '../screen';
import type { Gfx } from '../gui/gfx';
import type { Text } from '../i18n';
import type { App, Key, Machine, Pointer } from '../machine';

export type PagerAction = { hotkey: string; label: Text; run(m: Machine): void };

/**
 * A document, a page at a time: a click (or SPACE) turns forward, the wheel and
 * the arrows move by lines, the box in the corner (or ESC) closes. Text wraps to
 * whichever page width the screen has.
 */
export class PagerApp implements App {
  private readonly buttons = new ButtonTracker();
  private top = 0;
  private lines: string[] = [];

  constructor(
    private readonly title: Text,
    private readonly source: Text,
    private readonly actions: PagerAction[] = [],
    private readonly subtitle = '',
    /** Marked as seen when opened. */
    private readonly flag?: string,
  ) {}

  show(m: Machine): void {
    this.lines = wrap(m.t(this.source), body(m.grid).width);
    this.draw(m);
    if (this.flag) m.mark(this.flag);
    m.announce(`${m.t(this.title)}. ${m.t(this.source)}`);
  }

  private draw(m: Machine): void {
    const g = m.grid, area = body(g);
    frame(g, m.t(this.title), this.subtitle);
    this.lines.slice(this.top, this.top + area.height).forEach((line, i) => text(g, area.x, area.y + i, line));
    const pages = Math.max(1, Math.ceil(this.lines.length / area.height));
    const more = this.top + area.height < this.lines.length;
    const page = more ? Math.floor(this.top / area.height) + 1 : pages;
    const acts = this.actions.map(a => `${a.hotkey.toUpperCase()} ${m.t(a.label)}`).join('  ');
    const say = (en: string, zh: string) => m.t({ en, zh });
    const help = m.narrow
      ? [more ? say('SPACE more', '空格 下页') : '', acts, say('BKSP back', '退格 返回')].filter(Boolean).join(' · ')
      : [more ? say('SPACE more', '空格 下一页') : say('End', '完'), say('B back', 'B 上一页'), acts, say('ESC close', 'ESC 关闭')].filter(Boolean).join('  ·  ');
    statusBar(g, help, pages > 1 ? `${page}/${pages}` : '');
    if (more) text(g, g.cols - 12, g.rows - 2, m.t({ en: ' -- More -- ', zh: ' -- 未完 -- ' }), ATTR.bright);
  }

  private go(m: Machine, top: number): void {
    const height = body(m.grid).height, last = Math.max(0, this.lines.length - height);
    const next = Math.max(0, Math.min(last, top));
    if (next === this.top) return;
    this.top = next;
    this.draw(m);
    m.announce(this.lines.slice(this.top, this.top + height).join(' '));
  }

  scroll(m: Machine, lines: number): void { this.go(m, this.top + lines); }

  /** The corner box, and a button for each of the pager's own actions (next file, previous). */
  private controls(m: Machine): OverlayButton[] {
    const width = 640 / m.scale;
    const out = [closeBox(width)];
    let x = width - 30;
    for (const a of this.actions) {
      const label = m.t(a.label), w = strWidth(label) * 8 + 12;
      x -= w + 4;
      out.push({ id: a.hotkey, rect: { x, y: 2, w, h: 16 }, label });
    }
    return out;
  }

  overlay(m: Machine, g: Gfx): void { drawButtons(g, m, this.controls(m), this.buttons.hover, this.buttons.down); }

  pointer(m: Machine, p: Pointer): void {
    const used = this.buttons.pointer(m, p, this.controls(m), id => {
      if (id === 'close') m.pop();
      else this.actions.find(a => a.hotkey === id)?.run(m);
    });
    if (!used && p.phase === 'up') this.key(m, { key: ' ', ctrl: false });
  }

  key(m: Machine, { key, ctrl }: Key): void {
    if (ctrl) return;
    const height = body(m.grid).height, last = Math.max(0, this.lines.length - height);
    const go = (top: number) => this.go(m, top);
    if (key === ' ' || key === 'PageDown' || key === 'Enter') { if (this.top >= last && key !== 'PageDown') { m.pop(); return; } go(this.top + height); return; }
    if (key === 'b' || key === 'B' || key === 'PageUp') return go(this.top - height);
    if (key === 'ArrowDown') return go(this.top + 1);
    if (key === 'ArrowUp') return go(this.top - 1);
    if (key === 'Escape' || key === 'q' || key === 'Q' || key === 'Backspace') { m.pop(); return; }
    const action = this.actions.find(a => a.hotkey.toLowerCase() === key.toLowerCase());
    action?.run(m);
  }
}
