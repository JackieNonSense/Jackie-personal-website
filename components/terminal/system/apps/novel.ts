import { ATTR, clearGrid } from '../../crt/grid';
import { W, blit, type Picture } from '../../graphics/bitmap';
import { padTo, statusBar, text, wrap } from '../screen';
import { ButtonTracker, closeBox, drawButtons, type OverlayButton } from '../gui/overlay';
import { GLYPH } from '../gui/icons';
import type { Gfx } from '../gui/gfx';
import type { Text } from '../i18n';
import type { App, Key, Machine, Pointer } from '../machine';

/** One page: an optional picture above, text below. */
export type NovelPage = { picture?: string; speaker?: Text; text: Text };

/** Characters per second for the text box, like a visual novel on a slow machine. */
const TEXT_CPS = 55;
/** A blank that still covers what is underneath, unlike a space over graphics. */
const OPAQUE = '\u00a0';

/**
 * An illustrated story, PC-98 style: a dithered picture fills the top of the screen
 * and the text types itself out in a box underneath. A click (or SPACE) finishes the
 * line, then turns the page; the arrow in the corner (or B) goes back; the box
 * closes (or ESC).
 */
export class NovelApp implements App {
  private readonly buttons = new ButtonTracker();
  private page = 0;
  /** Which boxful of the page's text: long pages continue in the next box. */
  private part = 0;
  private shown = 0;
  private pictures = new Map<string, Picture | 'loading' | 'failed'>();

  constructor(private readonly title: Text, private readonly pages: NovelPage[], private readonly flag?: string) {}

  show(m: Machine): void { this.open(m, this.page); }

  private controls(m: Machine): OverlayButton[] {
    const width = 640 / m.scale;
    return [closeBox(width), { id: 'back', rect: { x: 2, y: 2, w: 22, h: 16 }, glyph: GLYPH.left }];
  }

  overlay(m: Machine, g: Gfx): void { drawButtons(g, m, this.controls(m), this.buttons.hover, this.buttons.down); }

  pointer(m: Machine, p: Pointer): void {
    if (this.buttons.pointer(m, p, this.controls(m), id => (id === 'close' ? m.pop() : this.open(m, this.page - 1)))) return;
    if (p.phase === 'up') this.next(m);
  }

  wheel(m: Machine, lines: number): void {
    if (lines > 0) this.next(m); else this.open(m, this.page - 1);
  }

  /** On: the rest of the line, the rest of the page, the next page, the end. */
  private next(m: Machine): void {
    const length = this.length(m);
    if (this.shown < length) { this.shown = length; this.drawText(m); return; }
    if (this.part < this.parts(m) - 1) { this.part++; this.shown = 0; this.drawText(m); return; }
    if (this.page < this.pages.length - 1) this.open(m, this.page + 1);
    else m.pop();
  }

  private open(m: Machine, index: number): void {
    this.page = Math.max(0, Math.min(this.pages.length - 1, index));
    this.part = 0;
    this.shown = 0;
    const page = this.pages[this.page];
    if (page.picture && !this.pictures.has(page.picture)) {
      const url = page.picture;
      this.pictures.set(url, 'loading');
      m.loadPicture(url).then(p => { this.pictures.set(url, p); if (m.top === this) this.drawPicture(m); })
        .catch(() => this.pictures.set(url, 'failed'));
    }
    this.drawPicture(m);
    if (this.flag && this.page === this.pages.length - 1) m.mark(this.flag);
    m.announce(`${page.speaker ? m.t(page.speaker) + ': ' : ''}${m.t(page.text)}`);
  }

  private drawPicture(m: Machine): void {
    const b = m.graphics();
    b.fill(0);
    const url = this.pages[this.page].picture;
    const pic = url ? this.pictures.get(url) : undefined;
    if (pic && typeof pic === 'object') blit(b, pic, Math.floor((W - pic.width) / 2), 0);
    m.present();
  }

  /** Rows given to the text box at the bottom of the screen. */
  private boxRows(m: Machine): number { return m.narrow ? 5 : 7; }

  private drawText(m: Machine): void {
    const g = m.grid, rows = this.boxRows(m), top = g.rows - rows - 1;
    clearGrid(g);
    const page = this.pages[this.page];
    text(g, 0, top, '─'.repeat(g.cols), ATTR.dim);
    text(g, 2, top, ` ${m.t(page.speaker ?? this.title)} `, page.speaker ? ATTR.bright : ATTR.dim);
    const lines = this.lines(m);
    let left = Math.floor(this.shown);
    lines.slice(0, rows - 1).forEach((line, i) => {
      const part = Array.from(line).slice(0, Math.max(0, left)).join('');
      left -= Array.from(line).length;
      // Every cell is filled with an opaque blank (CP437 255) so the picture never shows through.
      text(g, 0, top + 1 + i, padTo(OPAQUE + OPAQUE + part.replace(/ /g, OPAQUE), g.cols, OPAQUE), 0);
    });
    for (let i = lines.length; i < rows - 1; i++) text(g, 0, top + 1 + i, OPAQUE.repeat(g.cols));
    const done = this.shown >= this.length(m);
    statusBar(g, m.t(m.narrow ? { en: 'Tap to read on', zh: '点一下继续' } : { en: 'Click to read on', zh: '点一下继续读' }), `${this.page + 1}/${this.pages.length}`);
    if (done && (this.page < this.pages.length - 1 || this.part < this.parts(m) - 1)) text(g, g.cols - 3, g.rows - 2, '▼', ATTR.blink | ATTR.bright);
  }

  private all(m: Machine): string[] { return wrap(m.t(this.pages[this.page].text), m.cols - 4); }
  private parts(m: Machine): number { return Math.max(1, Math.ceil(this.all(m).length / (this.boxRows(m) - 1))); }
  private lines(m: Machine): string[] {
    const per = this.boxRows(m) - 1;
    return this.all(m).slice(this.part * per, (this.part + 1) * per);
  }
  /** Characters to type out on this page. */
  private length(m: Machine): number { return this.lines(m).reduce((n, l) => n + Array.from(l).length, 0); }

  tick(m: Machine, dt: number): void {
    const length = this.length(m);
    if (this.shown < length || this.shown === 0) { this.shown = Math.min(length, this.shown + dt * TEXT_CPS); this.drawText(m); }
  }

  key(m: Machine, { key, ctrl }: Key): void {
    if (ctrl) return;
    if (key === 'Escape' || key === 'q' || key === 'Q' || key === 'Backspace') { m.pop(); return; }
    if (key === 'b' || key === 'B' || key === 'ArrowLeft' || key === 'PageUp') { this.open(m, this.page - 1); return; }
    if (key === ' ' || key === 'Enter' || key === 'ArrowRight' || key === 'PageDown') this.next(m);
  }
}
