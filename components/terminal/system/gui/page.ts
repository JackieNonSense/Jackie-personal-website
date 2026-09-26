import { GLYPH_H, GLYPH_W, charWidth, glyphCode } from '../../crt/font';
import { HW } from '../../crt/palette';
import { cutRight, inset, type Rect } from './geometry';
import { LINE, SCROLL_W, ScrollBar } from './widgets';
import { Widget, type DrawState, type GuiEvent } from './widget';
import type { CursorShape } from './cursors';
import type { Gfx } from './gfx';
import type { Text } from '../i18n';
import type { Key, Machine } from '../machine';

/*
 * A web page as a browser of 1996 would show it: headings, paragraphs with links in
 * them, pictures (or, where a picture will not come, its box and its alt text),
 * rules, lists, a marquee, boxes of colour, a search field. Laid out for the width
 * it is given, top to bottom, and shown only as far as it has arrived down the line.
 */

type Align = 'left' | 'centre';
/** A stretch of words: a link when it has `href`; an outside link opens a real page. */
export type Run = { text: Text; href?: string; bold?: boolean; colour?: number; external?: boolean };
export type Block =
  | { kind: 'h'; text: Text; size?: 1 | 2; align?: Align; colour?: number }
  | { kind: 'p'; runs: (Text | Run)[]; align?: Align; colour?: number }
  | { kind: 'hr' }
  | { kind: 'img'; w: number; h: number; alt: Text; draw?: (g: Gfx, r: Rect, time: number) => void; align?: Align; href?: string }
  | { kind: 'list'; items: (Text | Run)[][] }
  | { kind: 'marquee'; text: Text; colour?: number; bg?: number }
  | { kind: 'box'; blocks: Block[]; bg: number; fg?: number; border?: number }
  | { kind: 'field'; placeholder: Text; button: Text; go(query: string): string }
  | { kind: 'space'; h?: number };

export type Page = {
  url: string;
  title: Text;
  bg: number;
  fg: number;
  link: number;
  blocks: Block[];
  /** What the status bar says once it has all come: "Document: Done" unless it says otherwise. */
  done?: Text;
};

const ROW = LINE + 2;

// ── Laying out ───────────────────────────────────────────────────────────────

type Item =
  | { t: 'text'; x: number; y: number; w: number; s: string; colour: number; bold: boolean; href?: string; external?: boolean; size: 1 | 2 }
  | { t: 'rect'; x: number; y: number; w: number; h: number; colour: number }
  | { t: 'frame'; x: number; y: number; w: number; h: number; colour: number }
  | { t: 'img'; x: number; y: number; w: number; h: number; block: Extract<Block, { kind: 'img' }>; alt: string }
  | { t: 'marquee'; x: number; y: number; w: number; s: string; colour: number; bg: number }
  | { t: 'field'; x: number; y: number; w: number; button: string; placeholder: string; go(query: string): string };

type Laid = { items: Item[]; height: number };

const isWide = (ch: string) => charWidth(ch) === 2;
const cells = (s: string) => { let n = 0; for (const ch of s) n += charWidth(ch); return n; };

/** Words (or Chinese characters) with their style, broken into lines no wider than `width`. */
function flow(runs: Run[], m: Machine, width: number, x0: number, y: number, align: Align, fg: number, link: number, size: 1 | 2): { items: Item[]; y: number } {
  const k = size, items: Item[] = [];
  type Piece = { s: string; run: Run };
  const pieces: Piece[] = [];
  for (const run of runs) {
    const s = m.t(run.text);
    let word = '';
    for (const ch of s) {
      if (isWide(ch)) { if (word) pieces.push({ s: word, run }); word = ''; pieces.push({ s: ch, run }); continue; }
      word += ch;
      if (ch === ' ') { pieces.push({ s: word, run }); word = ''; }
    }
    if (word) pieces.push({ s: word, run });
  }
  let line: Piece[] = [], lineW = 0;
  const flush = () => {
    const trimmed = line.map(p => p.s).join('').trimEnd();
    const used = cells(trimmed) * GLYPH_W * k;
    let x = x0 + (align === 'centre' ? Math.max(0, Math.floor((width - used) / 2)) : 0);
    // Consecutive pieces of one run go down as one stretch of text.
    let i = 0;
    while (i < line.length) {
      const run = line[i].run;
      let s = '';
      while (i < line.length && line[i].run === run) s += line[i++].s;
      if (i === line.length) s = s.trimEnd();
      const w = cells(s) * GLYPH_W * k;
      if (s) items.push({ t: 'text', x, y, w, s, colour: run.href ? link : run.colour ?? fg, bold: Boolean(run.bold), href: run.href, external: run.external, size: k });
      x += w;
    }
    y += ROW * k;
    line = []; lineW = 0;
  };
  for (const p of pieces) {
    const w = cells(p.s) * GLYPH_W * k;
    if (lineW + cells(p.s.trimEnd()) * GLYPH_W * k > width && line.length) flush();
    if (!line.length && p.s.trim() === '') continue;
    line.push(p); lineW += w;
  }
  if (line.length) flush();
  return { items, y };
}

const asRuns = (runs: (Text | Run)[]): Run[] => runs.map(r => (typeof r === 'object' && 'text' in r ? r : { text: r }));

function layout(page: Page, blocks: Block[], m: Machine, x0: number, width: number, y: number, fg: number): Laid {
  const items: Item[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case 'h': {
        const size = b.size ?? 1;
        const r = flow([{ text: b.text, bold: true, colour: b.colour }], m, width, x0, y + 4, b.align ?? 'left', fg, page.link, size === 1 ? 2 : 1);
        items.push(...r.items); y = r.y + 6;
        break;
      }
      case 'p': {
        const r = flow(asRuns(b.runs).map(run => ({ ...run, colour: run.colour ?? b.colour })), m, width, x0, y, b.align ?? 'left', fg, page.link, 1);
        items.push(...r.items); y = r.y + 8;
        break;
      }
      case 'hr':
        items.push({ t: 'rect', x: x0, y: y + 4, w: width, h: 1, colour: HW.darkGrey }, { t: 'rect', x: x0, y: y + 5, w: width, h: 1, colour: HW.white });
        y += 14;
        break;
      case 'img': {
        const w = Math.min(width, b.w), x = x0 + (b.align === 'centre' ? Math.floor((width - w) / 2) : 0);
        items.push({ t: 'img', x, y, w, h: b.h, block: b, alt: m.t(b.alt) });
        y += b.h + 8;
        break;
      }
      case 'list':
        for (const it of b.items) {
          items.push({ t: 'rect', x: x0 + 6, y: y + 7, w: 4, h: 4, colour: fg });
          const r = flow(asRuns(it), m, width - 18, x0 + 18, y, 'left', fg, page.link, 1);
          items.push(...r.items); y = r.y + 2;
        }
        y += 6;
        break;
      case 'marquee':
        items.push({ t: 'marquee', x: x0, y, w: width, s: m.t(b.text), colour: b.colour ?? fg, bg: b.bg ?? page.bg });
        y += ROW + 6;
        break;
      case 'box': {
        const inner = layout(page, b.blocks, m, x0 + 8, width - 16, y + 8, b.fg ?? fg);
        items.push({ t: 'rect', x: x0, y, w: width, h: inner.height - y + 2, colour: b.bg });
        if (b.border !== undefined) items.push({ t: 'frame', x: x0, y, w: width, h: inner.height - y + 2, colour: b.border });
        items.push(...inner.items);
        y = inner.height + 10;
        break;
      }
      case 'field': {
        const button = m.t(b.button), bw = cells(button) * GLYPH_W + 20;
        items.push({ t: 'field', x: x0, y, w: Math.min(width - bw - 6, 300), button, placeholder: m.t(b.placeholder), go: b.go });
        y += 30;
        break;
      }
      case 'space':
        y += b.h ?? 12;
        break;
    }
  }
  return { items, height: y };
}

/** Type at twice its size, for the big headings. */
function bigText(g: Gfx, x: number, y: number, s: string, colour: number, bold: boolean): void {
  let cx = x;
  for (const ch of s) {
    const n = charWidth(ch), code = glyphCode(ch);
    for (let c = 0; c < n; c++) {
      const base = (code + c) * GLYPH_H;
      for (let gy = 0; gy < GLYPH_H; gy++) {
        let bits = g.glyphs[base + gy];
        if (bold) bits |= bits >> 1;
        for (let gx = 0; gx < GLYPH_W; gx++) if (bits & (0x80 >> gx)) g.fill({ x: cx + (c * GLYPH_W + gx) * 2, y: y + gy * 2, w: 2, h: 2 }, colour);
      }
    }
    cx += n * GLYPH_W * 2;
  }
}

// ── The view ─────────────────────────────────────────────────────────────────

/** Where a page is shown: scrolled, arriving from the top, its links live. */
export class PageView extends Widget {
  focusable = true;
  page: Page | null = null;
  /** How much of it has come down the line: 0 to 1. */
  arrived = 1;
  scroll = 0;
  /** The link under the pointer, for the status bar. */
  hoverHref: string | null = null;
  query = '';
  private fieldFocused = false;
  private laid: Laid | null = null;
  private laidFor = '';
  private time = 0;
  private readonly bar: ScrollBar;

  constructor(private readonly o: { follow(href: string, external: boolean): void; hover?(href: string | null): void }) {
    super();
    this.bar = this.add(new ScrollBar(v => { this.scroll = v * ROW; this.invalidate(); }));
  }

  show(page: Page): void { this.page = page; this.scroll = 0; this.laid = null; this.query = ''; this.fieldFocused = false; this.invalidate(); }

  private get inner(): Rect { return cutRight(inset(this.r, 2), SCROLL_W)[1]; }

  protected arrange(): void { this.bar.place(cutRight(inset(this.r, 2), SCROLL_W)[0]); }

  private lay(m: Machine): Laid | null {
    const page = this.page;
    if (!page) return null;
    const key = `${page.url}|${m.lang}|${this.inner.w}`;
    if (!this.laid || this.laidFor !== key) {
      this.laid = layout(page, page.blocks, m, 10, this.inner.w - 20, 8, page.fg);
      this.laidFor = key;
    }
    return this.laid;
  }

  private get view(): number { return this.inner.h; }

  protected draw(g: Gfx, s: DrawState): void {
    const r = this.inner, laid = this.lay(s.m), page = this.page;
    g.fill(this.r, 'frame');
    g.fill(r, page ? page.bg : HW.white);
    if (!laid || !page) return;
    const total = laid.height + 8;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, total - this.view)));
    this.bar.set(Math.ceil(total / ROW), Math.floor(this.view / ROW), Math.round(this.scroll / ROW));
    // Only as far down as has arrived.
    const cut = this.arrived >= 1 ? Infinity : laid.height * this.arrived;
    g.save(); g.clip(r); g.translate(r.x, r.y - this.scroll);
    for (const it of laid.items) {
      if (it.y > cut) continue;
      if (it.y - this.scroll > r.h || it.y + 40 - this.scroll < 0) continue;
      switch (it.t) {
        case 'rect': g.fill(it, it.colour); break;
        case 'frame': g.rect(it, it.colour); break;
        case 'text': {
          const hot = it.href !== undefined && it.href === this.hoverHref;
          if (it.size === 2) bigText(g, it.x, it.y, it.s, it.colour, it.bold);
          else g.text(it.x, it.y, it.s, it.colour, { bold: it.bold, underline: it.href !== undefined });
          if (hot) g.hline(it.x, it.y + LINE, it.w, it.colour);
          break;
        }
        case 'img': {
          const b = it.block, box = { x: it.x, y: it.y, w: it.w, h: it.h };
          // A picture comes down a line at a time, like everything else.
          const shown = Math.max(0, Math.min(it.h, cut - it.y));
          if (b.draw) {
            g.save(); g.clip({ ...box, h: shown }); b.draw(g, box, this.time); g.restore();
            if (shown < it.h) g.rect(box, HW.darkGrey);
          } else {
            // It will not come: the broken picture and what it was meant to be.
            g.rect(box, HW.darkGrey);
            g.fill({ x: box.x + 4, y: box.y + 4, w: 12, h: 12 }, HW.grey);
            g.rect({ x: box.x + 4, y: box.y + 4, w: 12, h: 12 }, HW.darkGrey);
            g.fill({ x: box.x + 7, y: box.y + 10, w: 3, h: 3 }, HW.red);
            g.fill({ x: box.x + 11, y: box.y + 7, w: 3, h: 3 }, HW.green);
            g.save(); g.clip(inset(box, 2));
            const words = it.alt.split(/(?<= )|(?=[　-鿿])/), lines: string[] = [];
            let line = '';
            for (const w of words) { if ((cells(line + w) * GLYPH_W) > box.w - 26 && line) { lines.push(line); line = w.trimStart(); } else line += w; }
            if (line) lines.push(line);
            lines.forEach((l, i) => g.text(box.x + 20, box.y + 3 + i * LINE, l, page.fg));
            g.restore();
          }
          if (b.href && shown >= it.h) g.rect(box, page.link);
          break;
        }
        case 'marquee': {
          g.fill({ x: it.x, y: it.y, w: it.w, h: ROW }, it.bg);
          g.save(); g.clip({ x: it.x, y: it.y, w: it.w, h: ROW });
          const sw = cells(it.s) * GLYPH_W, period = sw + it.w;
          g.text(it.x + it.w - ((this.time * 60) % period), it.y + 1, it.s, it.colour);
          g.restore();
          break;
        }
        case 'field': {
          const f = { x: it.x, y: it.y, w: it.w, h: 22 };
          g.fill(f, HW.white); g.rect(f, HW.black);
          g.fill({ x: f.x + 1, y: f.y + 1, w: f.w - 2, h: 1 }, HW.darkGrey);
          const shownText = this.query || (this.fieldFocused ? '' : it.placeholder);
          g.save(); g.clip(inset(f, 2));
          const tw = g.text(f.x + 4, f.y + 3, shownText, this.query ? HW.black : HW.darkGrey);
          if (this.fieldFocused && s.focus === this && Math.floor(this.time * 2) % 2 === 0) g.fill({ x: f.x + 4 + (this.query ? tw : 0), y: f.y + 4, w: 2, h: 14 }, HW.black);
          g.restore();
          const bx = { x: f.x + f.w + 6, y: f.y, w: cells(it.button) * GLYPH_W + 20, h: 22 };
          g.fill(bx, HW.grey); g.rect(bx, HW.black);
          g.hline(bx.x + 1, bx.y + 1, bx.w - 2, HW.white); g.vline(bx.x + 1, bx.y + 1, bx.h - 2, HW.white);
          g.text(bx.x + 10, bx.y + 3, it.button, HW.black);
          break;
        }
      }
    }
    g.restore();
  }

  /** What is at a point of the screen, in the page's own coordinates. */
  private hit(x: number, y: number): Item | null {
    const laid = this.laid, r = this.inner;
    if (!laid) return null;
    const px = x - r.x, py = y - r.y + this.scroll;
    const cut = this.arrived >= 1 ? Infinity : laid.height * this.arrived;
    for (const it of laid.items) {
      if (it.y > cut) continue;
      if (it.t === 'text' && it.href && px >= it.x && px < it.x + it.w && py >= it.y && py < it.y + ROW * it.size) return it;
      if (it.t === 'img' && it.block.href && px >= it.x && px < it.x + it.w && py >= it.y && py < it.y + it.h) return it;
      if (it.t === 'field' && px >= it.x && px < it.x + it.w + cells(it.button) * GLYPH_W + 26 && py >= it.y && py < it.y + 22) return it;
    }
    return null;
  }

  private hrefOf(it: Item | null): string | null {
    if (!it) return null;
    if (it.t === 'text') return it.href ?? null;
    if (it.t === 'img') return it.block.href ?? null;
    return null;
  }

  pointAt(x: number, y: number): CursorShape {
    const it = this.hit(x, y), href = this.hrefOf(it);
    if (href !== this.hoverHref) { this.hoverHref = href; this.o.hover?.(href); this.invalidate(); }
    return href ? 'hand' : it?.t === 'field' ? 'text' : 'arrow';
  }

  event(e: GuiEvent): boolean {
    if (e.type === 'click') {
      const it = this.hit(e.x, e.y);
      if (it?.t === 'field') {
        const r = this.inner, px = e.x - r.x;
        // The button, or the box.
        if (px >= it.x + it.w + 6 && this.query.trim()) this.o.follow(it.go(this.query.trim()), false);
        else { this.fieldFocused = true; this.invalidate(); }
        return true;
      }
      this.fieldFocused = false;
      const href = this.hrefOf(it);
      if (href) this.o.follow(href, it?.t === 'text' ? Boolean(it.external) : false);
      return true;
    }
    return ['down', 'up', 'dblclick', 'dragstart', 'drag', 'dragend'].includes(e.type);
  }

  wheel(lines: number): boolean { this.scroll += lines * ROW * 3; this.invalidate(); return true; }

  key(k: Key): boolean {
    if (this.fieldFocused) {
      const field = this.laid?.items.find((it): it is Extract<Item, { t: 'field' }> => it.t === 'field');
      if (k.key === 'Enter' && field && this.query.trim()) { this.o.follow(field.go(this.query.trim()), false); return true; }
      if (k.key === 'Backspace') { this.query = Array.from(this.query).slice(0, -1).join(''); this.invalidate(); return true; }
      if (k.key === 'Escape') { this.fieldFocused = false; this.invalidate(); return true; }
      if (Array.from(k.key).length === 1 && !k.ctrl && !k.alt) { if (cells(this.query) < 40) this.query += k.key; this.invalidate(); return true; }
    }
    const page = Math.max(ROW, this.view - ROW * 2);
    const to = { ArrowUp: this.scroll - ROW, ArrowDown: this.scroll + ROW, PageUp: this.scroll - page, PageDown: this.scroll + page, Home: 0, End: Infinity, ' ': this.scroll + page }[k.key];
    if (to === undefined) return false;
    this.scroll = to === Infinity ? 1e9 : Math.max(0, to);
    this.invalidate();
    return true;
  }

  line(): string | null { return this.fieldFocused ? this.query : null; }

  tick(dt: number): void {
    super.tick(dt);
    this.time += dt;
    // Marquees and blinking carets move on their own.
    const moving = this.laid?.items.some(it => it.t === 'marquee' || (it.t === 'img' && it.block.draw)) || this.fieldFocused;
    if (moving && Math.floor((this.time - dt) * 20) !== Math.floor(this.time * 20)) this.invalidate();
  }
}
