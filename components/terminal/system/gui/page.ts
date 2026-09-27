import { HW, WEB } from '../../crt/palette';
import { Gfx, PATTERNS } from './gfx';
import { cutRight, inset, type Rect } from './geometry';
import { SCROLL_W, ScrollBar } from './widgets';
import { Widget, type DrawState, type GuiEvent } from './widget';
import { LEAD, drawText, lineHeight, measure, type Face } from '../../graphics/webtype';
import { picture } from '../../graphics/motion';
import type { Picture } from '../../graphics/bitmap';
import type { CursorShape } from './cursors';
import type { Text } from '../i18n';
import type { Key, Machine } from '../machine';

/*
 * A web page as a browser of 1998 shows one. A page is blocks (text in four faces,
 * rules, pictures, tables of cells, boxes, tabs, cards, lists, marquees, the 88 x 31
 * buttons everyone swapped, forms), laid out for the width it is given and drawn
 * once, off the screen, onto a page of its own; the view shows that page scrolled,
 * as far down as it has come down the line. What moves (a marquee, a field being
 * typed in, a live picture) is drawn over it each frame.
 */

export type Align = 'left' | 'centre' | 'right';
/** A stretch of words: a link when it has `href`; an outside link opens a real page. */
export type Run = { text: Text; href?: string; bold?: boolean; colour?: number; external?: boolean; underline?: boolean };
/** A tile repeated under a page: rows of characters, each a palette index from `inks`. */
export type Tile = { rows: readonly string[]; inks: Readonly<Record<string, number>> };
export type Img =
  /** A photograph printed in one ink on the page's paper (dark prints as ink unless `invert`). */
  | { kind: 'halftone'; url: string; ink: number; paper: number; invert?: boolean; crop?: readonly [number, number, number, number]; contrast?: number }
  /** A picture already in the 16 colours: stored grey, each colour's index times 17. */
  | { kind: 'indexed'; url: string; crop?: readonly [number, number, number, number] }
  | { kind: 'sprite'; rows: readonly string[]; inks: Readonly<Record<string, number>>; scale?: number }
  | { kind: 'draw'; draw(g: Gfx, r: Rect, time: number): void; live?: boolean };
export type Button88 = { top: Text; bottom?: Text; a: number; b?: number; ink?: number; inkB?: number; href?: string; external?: boolean };
export type Field = { name: string; placeholder?: Text; w?: number; max?: number };
export type Cell = { w?: number | 'fill'; blocks: Block[]; bg?: number; border?: number; pad?: number };
export type Block =
  | { kind: 'text'; runs: (Text | Run)[]; face?: Face; size?: number; colour?: number; align?: Align; lead?: number; bold?: boolean }
  | { kind: 'rule'; colour?: number; double?: boolean; dotted?: boolean }
  | { kind: 'space'; h: number }
  | { kind: 'img'; img: Img; w: number; h: number; align?: Align; href?: string; frame?: number; alt?: Text }
  | { kind: 'row'; cells: Cell[]; gap?: number }
  | { kind: 'box'; blocks: Block[]; bg?: number; border?: number; pad?: number; w?: number; align?: Align; head?: { text: Text; bg: number; fg: number } }
  | { kind: 'tabs'; items: { label: Text; href?: string; on?: boolean }[]; on: number; onText: number; off: number; offText: number }
  | { kind: 'card'; img: Img; kicker: Text; title: Text; date: string; href: string; ink: number }
  | { kind: 'list'; items: (Text | Run)[][]; bullet?: number; face?: Face; colour?: number }
  | { kind: 'marquee'; text: Text; colour: number; bg: number }
  | { kind: 'buttons'; items: Button88[]; align?: Align }
  | { kind: 'form'; fields: Field[]; submit: Text; go(values: Record<string, string>, m: Machine): string; colour?: number; bg?: number };

export type Page = {
  url: string;
  title: Text;
  bg: number;
  fg: number;
  link: number;
  tile?: Tile;
  blocks: Block[];
  /** What the status line says once it has all come: "Document: Done" unless it says otherwise. */
  done?: Text;
};

// ── Laying out ───────────────────────────────────────────────────────────────

type Op =
  | { t: 'fill'; r: Rect; c: number }
  | { t: 'frame'; r: Rect; c: number; w?: number }
  | { t: 'half'; r: Rect; a: number; b: number }
  | { t: 'text'; face: Face; x: number; y: number; s: string; c: number; bold?: boolean; size?: number; underline?: boolean; w: number }
  | { t: 'img'; r: Rect; img: Img };
type Hit = { r: Rect; href: string; external?: boolean };
type FieldBox = { r: Rect; field: Field; form: Extract<Block, { kind: 'form' }> };
type Live = { t: 'marquee'; r: Rect; s: string; c: number; bg: number } | { t: 'draw'; r: Rect; img: Extract<Img, { kind: 'draw' }> };
type Laid = { ops: Op[]; hits: Hit[]; fields: FieldBox[]; submits: { r: Rect; form: Extract<Block, { kind: 'form' }> }[]; live: Live[]; height: number };

const lineOf = (face: Face, size = 0) => (face === 'serif' ? Math.round(size * 1.18) : LEAD[face]);
const isWide = (ch: string) => ch.charCodeAt(0) > 0x2e80;
const asRuns = (runs: (Text | Run)[]): Run[] => runs.map(r => (typeof r === 'object' && 'text' in r ? r : { text: r }));

class Layout {
  readonly out: Laid = { ops: [], hits: [], fields: [], submits: [], live: [], height: 0 };
  constructor(readonly m: Machine, readonly page: Page) {}

  /** Words (or Chinese characters, one at a time) into lines no wider than `w`. */
  text(b: Extract<Block, { kind: 'text' }>, x: number, y: number, w: number, fg: number): number {
    const m = this.m, size = b.size ?? 0;
    // Small print in Chinese is too small to read: it is set in the body face instead.
    const face = b.face === 'small' && asRuns(b.runs).some(r => Array.from(m.t(r.text)).some(isWide)) ? 'body' : b.face ?? 'body';
    const lead = b.lead ?? lineOf(face, size);
    type Piece = { s: string; run: Run };
    const pieces: Piece[] = [];
    for (const run of asRuns(b.runs)) {
      const s = m.t(run.text);
      let word = '';
      for (const ch of s) {
        if (ch === '\n') { if (word) pieces.push({ s: word, run }); word = ''; pieces.push({ s: '\n', run }); continue; }
        if (isWide(ch)) { if (word) pieces.push({ s: word, run }); word = ''; pieces.push({ s: ch, run }); continue; }
        word += ch;
        if (ch === ' ') { pieces.push({ s: word, run }); word = ''; }
      }
      if (word) pieces.push({ s: word, run });
    }
    const bold = (run: Run) => Boolean(run.bold ?? b.bold);
    const width = (p: Piece) => measure(face, p.s, size);
    let line: Piece[] = [], lw = 0;
    const flush = () => {
      const trimmedW = line.reduce((a, p, i) => a + (i === line.length - 1 ? measure(face, p.s.trimEnd(), size) : width(p)), 0);
      let px = x + (b.align === 'centre' ? Math.floor((w - trimmedW) / 2) : b.align === 'right' ? w - trimmedW : 0);
      let i = 0;
      while (i < line.length) {
        const run = line[i].run;
        let s = '';
        while (i < line.length && line[i].run === run) s += line[i++].s;
        if (i === line.length) s = s.trimEnd();
        const sw = measure(face, s, size);
        if (s) {
          const colour = run.colour ?? (run.href ? this.page.link : b.colour ?? fg);
          this.out.ops.push({ t: 'text', face, x: px, y, s, c: colour, bold: bold(run), size, underline: Boolean(run.href || run.underline), w: sw });
          if (run.href) this.out.hits.push({ r: { x: px, y: y - 1, w: sw, h: lead }, href: run.href, external: run.external });
        }
        px += sw;
      }
      y += lead;
      line = []; lw = 0;
    };
    for (const p of pieces) {
      if (p.s === '\n') { if (line.length) flush(); else y += lead; continue; }
      const pw = width(p);
      if (lw + measure(face, p.s.trimEnd(), size) > w && line.length) flush();
      if (!line.length && p.s.trim() === '') continue;
      line.push(p); lw += pw;
    }
    if (line.length) flush();
    return y;
  }

  blocks(blocks: Block[], x: number, y: number, w: number, fg: number): number {
    for (const b of blocks) y = this.block(b, x, y, w, fg);
    return y;
  }

  private block(b: Block, x: number, y: number, w: number, fg: number): number {
    const ops = this.out.ops;
    switch (b.kind) {
      case 'text': return this.text(b, x, y, w, fg) + 4;
      case 'space': return y + b.h;
      case 'rule': {
        const c = b.colour ?? fg;
        if (b.dotted) ops.push({ t: 'half', r: { x, y: y + 3, w, h: 1 }, a: c, b: this.page.bg });
        else ops.push({ t: 'fill', r: { x, y: y + 3, w, h: 1 }, c });
        if (b.double) ops.push({ t: 'fill', r: { x, y: y + 5, w, h: 1 }, c });
        return y + (b.double ? 10 : 8);
      }
      case 'img': {
        const iw = Math.min(w, b.w), ih = Math.round((b.h * iw) / b.w);
        const ix = x + (b.align === 'centre' ? Math.floor((w - iw) / 2) : b.align === 'right' ? w - iw : 0);
        const r = { x: ix, y, w: iw, h: ih };
        if (b.frame !== undefined) {
          ops.push({ t: 'fill', r, c: b.frame });
          this.image(b.img, { x: ix + 2, y: y + 2, w: iw - 4, h: ih - 4 });
        } else this.image(b.img, r);
        if (b.href) this.out.hits.push({ r, href: b.href });
        return y + ih + 6;
      }
      case 'row': {
        const gap = b.gap ?? 8, fixed = b.cells.reduce((a, c) => a + (typeof c.w === 'number' ? c.w : 0), 0);
        const fills = b.cells.filter(c => c.w === undefined || c.w === 'fill').length;
        const room = w - gap * (b.cells.length - 1);
        // Too narrow for the table (a phone): the cells go one under another.
        if (fixed + fills * 80 > room) {
          for (const c of b.cells) y = this.cell(c, x, y, w, fg).bottom + gap;
          return y;
        }
        const spare = Math.max(0, room - fixed), start = ops.length;
        let cx = x, bottom = y;
        const placed: { c: Cell; x: number; w: number; bg: number }[] = [];
        for (const c of b.cells) {
          const cw = typeof c.w === 'number' ? c.w : Math.floor(spare / Math.max(1, fills));
          const at = ops.length;
          const r = this.cell(c, cx, y, cw, fg);
          placed.push({ c, x: cx, w: cw, bg: at });
          bottom = Math.max(bottom, r.bottom);
          cx += cw + gap;
        }
        // Every cell of a row is as tall as the tallest.
        for (const p of placed) {
          const bgOp = ops[p.bg];
          if (bgOp && bgOp.t === 'fill' && p.c.bg !== undefined) bgOp.r.h = bottom - y;
          const frame = ops.find((o, i) => i > p.bg && o.t === 'frame' && o.r.x === p.x && o.r.y === y);
          if (frame && frame.t === 'frame') frame.r.h = bottom - y;
        }
        void start;
        return bottom + 6;
      }
      case 'box': {
        const bw = Math.min(w, b.w ?? w), bx = x + (b.align === 'centre' ? Math.floor((w - bw) / 2) : b.align === 'right' ? w - bw : 0);
        const pad = b.pad ?? 8, at = ops.length;
        if (b.bg !== undefined) ops.push({ t: 'fill', r: { x: bx, y, w: bw, h: 0 }, c: b.bg });
        let yy = y;
        if (b.head) {
          ops.push({ t: 'fill', r: { x: bx, y, w: bw, h: 18 }, c: b.head.bg });
          this.text({ kind: 'text', runs: [{ text: b.head.text, bold: true }], colour: b.head.fg }, bx + 6, y + 1, bw - 12, b.head.fg);
          yy += 18;
        }
        yy = this.blocks(b.blocks, bx + pad, yy + pad, bw - 2 * pad, fg) + pad - 4;
        const bg = ops[at];
        if (b.bg !== undefined && bg.t === 'fill') bg.r.h = yy - y;
        if (b.border !== undefined) ops.push({ t: 'frame', r: { x: bx, y, w: bw, h: yy - y }, c: b.border });
        return yy + 8;
      }
      case 'tabs': {
        let px = x;
        for (const it of b.items) {
          const label = this.m.t(it.label), pw = measure('body', label, 0, true) + 14, r = { x: px, y, w: pw, h: 18 };
          if (it.on) ops.push({ t: 'fill', r, c: b.on });
          else ops.push({ t: 'half', r, a: b.off, b: this.page.bg });
          ops.push({ t: 'text', face: 'body', x: px + 7, y: y + 2, s: label, c: it.on ? b.onText : b.offText, bold: true, w: pw - 14 });
          if (it.href) this.out.hits.push({ r, href: it.href });
          px += pw + 6;
          if (px > x + w - 40) { px = x; y += 22; }
        }
        return y + 28;
      }
      case 'card': {
        const narrow = w < 360, fw = narrow ? w : 132, fh = narrow ? Math.round(w * 0.6) : 82;
        ops.push({ t: 'fill', r: { x, y, w: fw, h: fh }, c: WEB.ink });
        this.image(b.img, { x: x + 3, y: y + 3, w: fw - 6, h: fh - 6 });
        for (const [cx, cy] of [[x, y], [x + fw - 1, y], [x, y + fh - 1], [x + fw - 1, y + fh - 1]]) ops.push({ t: 'fill', r: { x: cx, y: cy, w: 1, h: 1 }, c: this.page.bg });
        const tx = narrow ? x : x + fw + 16, tw = narrow ? w : w - fw - 16;
        let ty = narrow ? y + fh + 8 : y + 6;
        ty = this.text({ kind: 'text', runs: [b.kicker], face: 'small' }, tx, ty, tw, b.ink) + 4;
        const titleTop = ty;
        ty = this.text({ kind: 'text', runs: [b.title], face: 'song', lead: 20 }, tx, ty, tw, fg) + 4;
        ty = this.text({ kind: 'text', runs: [b.date], face: 'small' }, tx, ty, tw, WEB.g55);
        const bottom = Math.max(ty, narrow ? ty : y + fh);
        this.out.hits.push({ r: { x, y, w: fw, h: fh }, href: b.href }, { r: { x: tx, y: titleTop, w: tw, h: ty - titleTop }, href: b.href });
        return bottom + 14;
      }
      case 'list': {
        const face = b.face ?? 'body';
        for (const it of b.items) {
          ops.push({ t: 'fill', r: { x: x + 4, y: y + 6, w: 3, h: 3 }, c: b.bullet ?? fg });
          y = this.text({ kind: 'text', runs: it, face, colour: b.colour }, x + 14, y, w - 14, fg) + 2;
        }
        return y + 4;
      }
      case 'marquee': {
        const r = { x, y, w, h: 16 };
        ops.push({ t: 'fill', r, c: b.bg });
        this.out.live.push({ t: 'marquee', r, s: this.m.t(b.text), c: b.colour, bg: b.bg });
        return y + 20;
      }
      case 'buttons': {
        const n = b.items.length, total = n * 88 + (n - 1) * 6;
        let bx = x + (b.align === 'centre' ? Math.max(0, Math.floor((w - total) / 2)) : 0);
        for (const it of b.items) {
          if (bx + 88 > x + w) { bx = x; y += 37; }
          const r = { x: bx, y, w: 88, h: 31 };
          ops.push({ t: 'fill', r, c: WEB.black }, { t: 'fill', r: { x: bx + 1, y: y + 1, w: 86, h: 29 }, c: it.a });
          if (it.b !== undefined) ops.push({ t: 'fill', r: { x: bx + 1, y: y + 16, w: 86, h: 14 }, c: it.b });
          const top = this.m.t(it.top), bottom = it.bottom ? this.m.t(it.bottom) : '';
          ops.push({ t: 'text', face: 'small', x: bx + 44 - Math.floor(measure('small', top) / 2), y: y + (bottom ? 4 : 11), s: top, c: it.ink ?? WEB.black, w: measure('small', top) });
          if (bottom) ops.push({ t: 'text', face: 'small', x: bx + 44 - Math.floor(measure('small', bottom) / 2), y: y + 19, s: bottom, c: it.inkB ?? WEB.white, w: measure('small', bottom) });
          if (it.href) this.out.hits.push({ r, href: it.href, external: it.external });
          bx += 94;
        }
        return y + 38;
      }
      case 'form': {
        let fx = x;
        for (const f of b.fields) {
          const fw = Math.min(f.w ?? w, w - (fx - x));
          if (fx + fw > x + w) { fx = x; y += 28; }
          const r = { x: fx, y, w: fw, h: 22 };
          this.out.fields.push({ r, field: f, form: b });
          fx += fw + 6;
        }
        const label = this.m.t(b.submit), bw = measure('body', label, 0, true) + 22;
        if (fx + bw > x + w) { fx = x; y += 28; }
        const r = { x: fx, y, w: bw, h: 22 };
        ops.push({ t: 'fill', r, c: b.bg ?? WEB.g85 }, { t: 'frame', r, c: WEB.black });
        ops.push({ t: 'fill', r: { x: fx + 1, y: y + 1, w: bw - 2, h: 1 }, c: WEB.white }, { t: 'fill', r: { x: fx + 1, y: y + 1, w: 1, h: 20 }, c: WEB.white });
        ops.push({ t: 'text', face: 'body', x: fx + 11, y: y + 3, s: label, c: b.colour ?? WEB.black, bold: true, w: bw - 22 });
        this.out.submits.push({ r, form: b });
        return y + 30;
      }
    }
  }

  private cell(c: Cell, x: number, y: number, w: number, fg: number): { bottom: number } {
    const ops = this.out.ops, pad = c.pad ?? 0;
    if (c.bg !== undefined) ops.push({ t: 'fill', r: { x, y, w, h: 0 }, c: c.bg });
    const at = ops.length - 1;
    const bottom = this.blocks(c.blocks, x + pad, y + pad, w - 2 * pad, fg) + pad - 4;
    const bg = ops[at];
    if (c.bg !== undefined && bg && bg.t === 'fill') bg.r.h = bottom - y;
    if (c.border !== undefined) ops.push({ t: 'frame', r: { x, y, w, h: bottom - y }, c: c.border });
    return { bottom };
  }

  private image(img: Img, r: Rect): void {
    this.out.ops.push({ t: 'img', r, img });
    if (img.kind === 'draw' && img.live) this.out.live.push({ t: 'draw', r, img });
  }
}

// ── Pictures ─────────────────────────────────────────────────────────────────

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

/** A photograph in one ink: stretched to its full range first, then screened. */
function halftone(g: Gfx, p: Picture, r: Rect, img: Extract<Img, { kind: 'halftone' }>): void {
  const [cx, cy, cw, ch] = img.crop ?? [0, 0, 1, 1];
  // Cover the box: the crop's shorter way fills it.
  const sw = cw * p.width, sh = ch * p.height, k = Math.max(r.w / sw, r.h / sh);
  const ox = cx * p.width + (sw - r.w / k) / 2, oy = cy * p.height + (sh - r.h / k) / 2;
  const sample = (x: number, y: number) => p.data[Math.min(p.height - 1, Math.max(0, Math.floor(oy + y / k))) * p.width + Math.min(p.width - 1, Math.max(0, Math.floor(ox + x / k)))];
  const hist = new Uint32Array(256);
  for (let y = 0; y < r.h; y += 2) for (let x = 0; x < r.w; x += 2) hist[sample(x, y)]++;
  const total = hist.reduce((a, b) => a + b, 0);
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > total * 0.03) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > total * 0.03) { hi = v; break; } }
  const contrast = img.contrast ?? 1.3;
  const mask = new Uint8Array(r.w * r.h);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    let a = Math.max(0, Math.min(1, (sample(x, y) - lo) / Math.max(1, hi - lo)));
    a = Math.max(0, Math.min(1, (a - 0.5) * contrast + 0.5));
    if (img.invert) a = 1 - a;
    if (a < BAYER[(y & 3) * 4 + (x & 3)]) mask[y * r.w + x] = 1;
  }
  g.fill(r, img.paper);
  g.mask(mask, r.w, r.h, r.x, r.y, img.ink);
}

function indexed(g: Gfx, p: Picture, r: Rect, crop?: readonly [number, number, number, number]): void {
  const [cx, cy, cw, ch] = crop ?? [0, 0, 1, 1];
  const sw = cw * p.width, sh = ch * p.height, k = Math.max(r.w / sw, r.h / sh);
  const ox = cx * p.width + (sw - r.w / k) / 2, oy = cy * p.height + (sh - r.h / k) / 2;
  for (let c = 0; c < 16; c++) {
    const mask = new Uint8Array(r.w * r.h);
    let any = false;
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const v = p.data[Math.min(p.height - 1, Math.floor(oy + y / k)) * p.width + Math.min(p.width - 1, Math.floor(ox + x / k))];
      if (Math.min(15, Math.round(v / 17)) === c) { mask[y * r.w + x] = 1; any = true; }
    }
    if (any) g.mask(mask, r.w, r.h, r.x, r.y, c);
  }
}

// ── The view ─────────────────────────────────────────────────────────────────

const ROW = 16;

/** Where a page is shown: drawn once off the screen, scrolled, arriving from the top, its links live. */
export class PageView extends Widget {
  focusable = true;
  page: Page | null = null;
  /** How much of it has come down the line: 0 to 1. */
  arrived = 1;
  scroll = 0;
  /** The link under the pointer, for the status line. */
  hoverHref: string | null = null;
  private values = new Map<string, string>();
  private focusField: string | null = null;
  private laid: Laid | null = null;
  private buffer: Uint8Array | null = null;
  private laidFor = '';
  private pending = false;
  private time = 0;
  private wait = 0;
  private readonly bar: ScrollBar;

  constructor(private readonly o: { follow(href: string, external: boolean): void; hover?(href: string | null): void }) {
    super();
    this.bar = this.add(new ScrollBar(v => { this.scroll = v * ROW; this.invalidate(); }));
  }

  show(page: Page): void {
    this.page = page; this.scroll = 0; this.laid = null; this.buffer = null; this.values.clear(); this.focusField = null;
    this.invalidate();
  }

  /** What has been typed into a page's field (for tests and forms). */
  value(name: string): string { return this.values.get(name) ?? ''; }

  private get inner(): Rect { return cutRight(inset(this.r, 1), SCROLL_W)[1]; }
  protected arrange(): void { this.bar.place(cutRight(inset(this.r, 1), SCROLL_W)[0]); }

  private lay(m: Machine): void {
    const page = this.page, w = this.inner.w;
    if (!page || w <= 0) return;
    const key = `${page.url}|${m.lang}|${w}`;
    if (this.laid && this.laidFor === key && !this.pending) return;
    const layout = new Layout(m, page);
    const height = Math.max(this.inner.h, layout.blocks(page.blocks, 12, 10, w - 24, page.fg) + 16);
    layout.out.height = height;
    this.laid = layout.out;
    this.laidFor = key;
    this.render(m, w, height);
  }

  /** The page, drawn once onto a page of its own. */
  private render(m: Machine, w: number, h: number): void {
    const laid = this.laid!, page = this.page!;
    const buf = new Uint8Array(w * h), g = new Gfx(buf, m.glyphs!, 1, w, h);
    g.fill({ x: 0, y: 0, w, h }, page.bg);
    if (page.tile) {
      const t = page.tile, th = t.rows.length, tw = t.rows[0].length;
      for (let y = 0; y < h; y++) {
        const row = t.rows[y % th];
        for (let x = 0; x < w; x++) { const v = t.inks[row[x % tw]]; if (v !== undefined) buf[y * w + x] = v; }
      }
    }
    this.pending = false;
    for (const op of laid.ops) {
      switch (op.t) {
        case 'fill': g.fill(op.r, op.c); break;
        case 'frame': g.rect(op.r, op.c); break;
        case 'half': g.pattern(op.r, PATTERNS.half, op.a, op.b); break;
        case 'text':
          drawText(g, op.face, op.x, op.y, op.s, op.c, { bold: op.bold, size: op.size });
          if (op.underline) g.hline(op.x, op.y + (op.face === 'song' ? 15 : op.face === 'small' ? 9 : 13), op.w, op.c);
          break;
        case 'img': this.picture(g, m, op.r, op.img); break;
      }
    }
    this.buffer = buf;
  }

  private picture(g: Gfx, m: Machine, r: Rect, img: Img): void {
    if (img.kind === 'sprite') {
      const k = img.scale ?? 1;
      img.rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const v = img.inks[row[x]]; if (v !== undefined) g.fill({ x: r.x + x * k, y: r.y + y * k, w: k, h: k }, v); } });
      return;
    }
    if (img.kind === 'draw') { g.save(); g.clip(r); img.draw(g, r, 0); g.restore(); return; }
    const p = picture(u => m.loadPicture(u), img.url);
    if (!p) {
      // Still coming: the box it will fill, grey.
      g.pattern(r, PATTERNS.half, WEB.g70, WEB.g85);
      this.pending = true;
      return;
    }
    g.save(); g.clip(r);
    if (img.kind === 'halftone') halftone(g, p, r, img); else indexed(g, p, r, img.crop);
    g.restore();
  }

  protected draw(g: Gfx, s: DrawState): void {
    const r = this.inner, page = this.page;
    g.fill(this.r, 'frame');
    g.fill(r, page ? page.bg : HW.white);
    if (!page || !s.m.glyphs) return;
    this.lay(s.m);
    const laid = this.laid, buf = this.buffer;
    if (!laid || !buf) return;
    const total = laid.height;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, total - r.h)));
    this.bar.set(Math.ceil(total / ROW), Math.floor(r.h / ROW), Math.round(this.scroll / ROW));
    // Only as far down as has arrived.
    const cut = this.arrived >= 1 ? total : Math.floor(total * this.arrived);
    const shown = Math.max(0, Math.min(r.h, cut - this.scroll));
    if (shown > 0) g.blit(buf, r.w, total, 0, this.scroll, { x: r.x, y: r.y, w: r.w, h: shown });
    g.save(); g.clip({ x: r.x, y: r.y, w: r.w, h: shown }); g.translate(r.x, r.y - this.scroll);
    // The words on the page, noted where they are for anyone asking what is on the screen.
    for (const op of laid.ops) {
      if (op.t === 'text' && op.y + 20 > this.scroll && op.y < this.scroll + shown) g.note(op.x, op.y, measure(op.face, op.s, op.size), lineHeight(op.face, op.size), op.s);
    }
    for (const lv of laid.live) {
      if (lv.t === 'marquee') {
        g.save(); g.clip(lv.r);
        g.fill(lv.r, lv.bg);
        const sw = measure('body', lv.s), period = sw + lv.r.w;
        drawText(g, 'body', lv.r.x + lv.r.w - ((this.time * 50) % period), lv.r.y + 1, lv.s, lv.c);
        g.restore();
      } else { g.save(); g.clip(lv.r); lv.img.draw(g, lv.r, this.time); g.restore(); }
    }
    for (const f of laid.fields) {
      g.fill(f.r, WEB.white); g.rect(f.r, WEB.black);
      g.hline(f.r.x + 1, f.r.y + 1, f.r.w - 2, WEB.g55);
      const v = this.values.get(f.field.name) ?? '', focused = this.focusField === f.field.name && s.focus === this;
      g.save(); g.clip(inset(f.r, 2));
      if (v || focused) {
        // Only the end of a long line shows, as in a real field.
        let shownText = v;
        while (shownText && measure('body', shownText) > f.r.w - 12) shownText = Array.from(shownText).slice(1).join('');
        const tw = drawText(g, 'body', f.r.x + 4, f.r.y + 4, shownText, WEB.black);
        if (focused && Math.floor(this.time * 2) % 2 === 0) g.fill({ x: f.r.x + 5 + tw, y: f.r.y + 4, w: 1, h: 13 }, WEB.black);
      } else if (f.field.placeholder) drawText(g, 'body', f.r.x + 4, f.r.y + 4, s.m.t(f.field.placeholder), WEB.g55);
      g.restore();
    }
    // The link under the pointer, underlined twice.
    if (this.hoverHref) for (const h of laid.hits) if (h.href === this.hoverHref) g.hline(h.r.x, h.r.y + h.r.h - 1, h.r.w, page.link);
    g.restore();
  }

  /** What is at a point of the screen, in the page's own coordinates. */
  private under(x: number, y: number): { hit?: Hit; field?: FieldBox; submit?: Laid['submits'][number] } {
    const laid = this.laid, r = this.inner;
    if (!laid) return {};
    const px = x - r.x, py = y - r.y + this.scroll;
    const inside = (b: Rect) => px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h;
    const cut = this.arrived >= 1 ? Infinity : laid.height * this.arrived;
    if (py > cut) return {};
    const field = laid.fields.find(f => inside(f.r));
    if (field) return { field };
    const submit = laid.submits.find(s => inside(s.r));
    if (submit) return { submit };
    const hit = [...laid.hits].reverse().find(h => inside(h.r));
    return hit ? { hit } : {};
  }

  pointAt(x: number, y: number): CursorShape {
    const it = this.under(x, y), href = it.hit?.href ?? null;
    if (href !== this.hoverHref) { this.hoverHref = href; this.o.hover?.(href); this.invalidate(); }
    return href || it.submit ? 'hand' : it.field ? 'text' : 'arrow';
  }

  private submit(form: Extract<Block, { kind: 'form' }>): void {
    const values: Record<string, string> = {};
    for (const f of form.fields) values[f.name] = (this.values.get(f.name) ?? '').trim();
    if (form.fields.some(f => !values[f.name])) { this.host?.beep(); return; }
    this.o.follow(form.go(values, this.m), false);
  }

  event(e: GuiEvent): boolean {
    if (e.type === 'click') {
      const it = this.under(e.x, e.y);
      if (it.field) { this.focusField = it.field.field.name; this.invalidate(); this.m.refreshInput(); return true; }
      this.focusField = null;
      if (it.submit) { this.submit(it.submit.form); return true; }
      if (it.hit) this.o.follow(it.hit.href, Boolean(it.hit.external));
      return true;
    }
    return ['down', 'up', 'dblclick', 'dragstart', 'drag', 'dragend'].includes(e.type);
  }

  wheel(lines: number): boolean { this.scroll += lines * ROW * 3; this.invalidate(); return true; }

  key(k: Key): boolean {
    const name = this.focusField;
    if (name && this.laid) {
      const fields = this.laid.fields, f = fields.find(x => x.field.name === name)!;
      const v = this.values.get(name) ?? '';
      if (k.key === 'Enter') { this.submit(f.form); return true; }
      if (k.key === 'Tab') {
        const i = fields.indexOf(f);
        this.focusField = fields[(i + (k.shift ? -1 : 1) + fields.length) % fields.length].field.name;
        this.invalidate(); return true;
      }
      if (k.key === 'Backspace') { this.values.set(name, Array.from(v).slice(0, -1).join('')); this.invalidate(); return true; }
      if (k.key === 'Escape') { this.focusField = null; this.invalidate(); return true; }
      if (Array.from(k.key).length === 1 && !k.ctrl && !k.alt) {
        if (Array.from(v).length < (f.field.max ?? 60)) this.values.set(name, v + k.key);
        this.invalidate(); return true;
      }
    }
    const page = Math.max(ROW, this.inner.h - ROW * 2);
    const to = { ArrowUp: this.scroll - ROW, ArrowDown: this.scroll + ROW, PageUp: this.scroll - page, PageDown: this.scroll + page, Home: 0, End: 1e9, ' ': this.scroll + page }[k.key];
    if (to === undefined) return false;
    this.scroll = Math.max(0, to);
    this.invalidate();
    return true;
  }

  line(): string | null { return this.focusField ? this.values.get(this.focusField) ?? '' : null; }

  tick(dt: number): void {
    super.tick(dt);
    this.time += dt;
    this.wait -= dt;
    // A picture that was still coming: look again now and then, and draw the page afresh when it has.
    if (this.pending && this.wait <= 0) { this.wait = 0.25; this.invalidate(); }
    const moving = this.laid?.live.length || this.focusField;
    if (moving && Math.floor((this.time - dt) * 20) !== Math.floor(this.time * 20)) this.invalidate();
  }
}
