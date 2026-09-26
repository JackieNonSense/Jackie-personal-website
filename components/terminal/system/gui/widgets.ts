import { contains, cutRight, cutTop, inset, type Rect } from './geometry';
import { PATTERNS, type Gfx, type Icon } from './gfx';
import { GLYPH } from './icons';
import { Widget, type DrawState, type GuiEvent, type GuiHost } from './widget';
import { thumbnail, type Picture } from '../../graphics/bitmap';
import { strWidth } from '../../crt/font';
import { clip, wrap } from '../screen';
import type { Ink } from '../../crt/palette';
import type { Text } from '../i18n';
import type { Key, Machine } from '../machine';

/*
 * The widgets of the pixel desk: labels, buttons, scroll bars, text, lists, fields,
 * check boxes, splits, pictures and thumbnails. Sizes are in logical pixels; a line
 * of text is 16 tall, a character 8 wide (16 for Chinese).
 */

export const LINE = 16;
export type Dyn<T> = T | ((m: Machine) => T);
export const get = <T,>(v: Dyn<T>, m: Machine): T => (typeof v === 'function' ? (v as (m: Machine) => T)(m) : v);

/** A text box's edge: sunken into the face it sits on. Returns what is inside it. */
export function well(g: Gfx, r: Rect, fill: Ink): Rect {
  g.fill(r, fill);
  g.bevel(r, 'sunken');
  g.rect(inset(r, 1), 'frame');
  return inset(r, 2);
}

/**
 * A finger dragging a list or a page: it moves with the finger and glides on a
 * little when let go. Positions are in logical pixels; `apply` gets whole rows.
 */
export class Fling {
  private carry = 0;
  private speed = 0;
  private last: { y: number; time: number } | null = null;

  constructor(private readonly rowHeight: number, private readonly apply: (rows: number) => boolean) {}

  drag(e: GuiEvent): void {
    if (e.type === 'dragstart' || !this.last) { this.last = { y: e.y, time: e.time }; this.speed = 0; return; }
    const dy = this.last.y - e.y, dt = Math.max(1 / 240, e.time - this.last.time);
    this.speed = this.speed * 0.4 + (dy / dt) * 0.6;
    this.last = { y: e.y, time: e.time };
    this.move(dy);
  }

  release(): void { this.last = null; if (Math.abs(this.speed) < 40) this.speed = 0; }
  stop(): void { this.speed = 0; this.carry = 0; this.last = null; }
  get moving(): boolean { return this.speed !== 0; }

  tick(dt: number): void {
    if (!this.speed || this.last) return;
    this.move(this.speed * dt);
    this.speed *= Math.exp(-dt * 3.2);
    if (Math.abs(this.speed) < 20) this.speed = 0;
  }

  private move(pixels: number): void {
    this.carry += pixels;
    const rows = Math.trunc(this.carry / this.rowHeight);
    if (!rows) return;
    this.carry -= rows * this.rowHeight;
    // At either end the glide stops.
    if (!this.apply(rows)) { this.speed = 0; this.carry = 0; }
  }
}

/** The dotted ring that marks where the keys go. */
function focusRing(g: Gfx, r: Rect, colour: Ink): void {
  g.pattern({ x: r.x, y: r.y, w: r.w, h: 1 }, PATTERNS.half, colour, null);
  g.pattern({ x: r.x, y: r.y + r.h - 1, w: r.w, h: 1 }, PATTERNS.half, colour, null);
  g.pattern({ x: r.x, y: r.y, w: 1, h: r.h }, PATTERNS.half, colour, null);
  g.pattern({ x: r.x + r.w - 1, y: r.y, w: 1, h: r.h }, PATTERNS.half, colour, null);
}

// ── Label ──────────────────────────────────────────────────────────────────────

export class Label extends Widget {
  constructor(private readonly text: Dyn<Text>, private readonly o: { colour?: Ink; bold?: boolean; align?: 'left' | 'centre' | 'right'; wrap?: boolean } = {}) {
    super();
  }

  width(m: Machine): number { return Math.max(...m.t(get(this.text, m)).split('\n').map(l => strWidth(l) * 8)); }

  lines(m: Machine, width = this.r.w): string[] {
    const t = m.t(get(this.text, m));
    return this.o.wrap === false ? t.split('\n') : wrap(t, Math.max(1, Math.floor(width / 8)));
  }

  protected draw(g: Gfx, s: DrawState): void {
    g.save(); g.clip(this.r);
    this.lines(s.m).forEach((line, i) => {
      const w = g.measure(line);
      const x = this.o.align === 'centre' ? this.r.x + Math.floor((this.r.w - w) / 2) : this.o.align === 'right' ? this.r.x + this.r.w - w : this.r.x;
      g.text(x, this.r.y + i * LINE, line, this.o.colour ?? 'faceText', { bold: this.o.bold });
    });
    g.restore();
  }
}

// ── Button ─────────────────────────────────────────────────────────────────────

export const BUTTON_H = 22;

export class Button extends Widget {
  focusable = true;
  hoverable = true;

  constructor(
    public label: Dyn<Text>,
    public onClick: (host: GuiHost) => void,
    public o: { isDefault?: boolean; icon?: Icon; enabled?: (m: Machine) => boolean; compact?: boolean } = {},
  ) {
    super();
  }

  /** Wide enough for its label; a compact one no wider than that. */
  width(m: Machine): number { return Math.max(this.o.compact ? 0 : 64, strWidth(m.t(get(this.label, m))) * 8 + (this.o.compact ? 14 : 24) + (this.o.icon ? this.o.icon.w + 4 : 0)); }

  private get live(): boolean { return this.enabled && (this.o.enabled?.(this.m) ?? true); }

  protected draw(g: Gfx, s: DrawState): void {
    const down = s.pressed === this && s.hover === this;
    let r = this.r;
    g.fill(r, 'face');
    g.rect(r, 'frame');
    r = inset(r, 1);
    if (this.o.isDefault) { g.rect(r, 'frame'); r = inset(r, 1); }
    g.bevel(r, down ? 'pressed' : 'raised');
    const label = s.m.t(get(this.label, s.m)), live = this.live;
    const iw = this.o.icon ? this.o.icon.w + 4 : 0, w = g.measure(label) + iw;
    const x = r.x + Math.floor((r.w - w) / 2) + (down ? 1 : 0), y = r.y + Math.floor((r.h - LINE) / 2) + (down ? 1 : 0);
    if (this.o.icon) g.icon(this.o.icon, x, y + Math.floor((LINE - this.o.icon.h) / 2), live ? undefined : { '#': 'faceDim' });
    g.text(x + iw, y, label, live ? 'faceText' : 'faceDim');
    if (s.focus === this && label) focusRing(g, { x: x + iw - 2, y: y - 1, w: w - iw + 4, h: LINE + 2 }, 'faceText');
  }

  event(e: GuiEvent): boolean {
    if (e.type === 'click' && this.live) this.onClick(this.host!);
    return ['down', 'up', 'click', 'dblclick'].includes(e.type);
  }

  key(k: Key): boolean {
    if ((k.key === 'Enter' || k.key === ' ') && this.live) { this.onClick(this.host!); return true; }
    return false;
  }
}

/** A row of buttons, right-aligned or left: a dialog's foot, a window's toolbar. */
export class ButtonRow extends Widget {
  constructor(private readonly align: 'left' | 'right' | 'centre' = 'right', private readonly gap = 6) { super(); }

  protected arrange(): void {
    const m = this.m, buttons = this.children.filter(c => c.visible);
    const widths = buttons.map(b => (b instanceof Button ? b.width(m) : b.r.w || 64));
    const total = widths.reduce((a, b) => a + b, 0) + this.gap * Math.max(0, buttons.length - 1);
    let x = this.align === 'left' ? this.r.x : this.align === 'right' ? this.r.x + this.r.w - total : this.r.x + Math.floor((this.r.w - total) / 2);
    buttons.forEach((b, i) => { b.place({ x, y: this.r.y + Math.floor((this.r.h - BUTTON_H) / 2), w: widths[i], h: BUTTON_H }); x += widths[i] + this.gap; });
  }
}

// ── Scroll bar ─────────────────────────────────────────────────────────────────

export const SCROLL_W = 14;

export class ScrollBar extends Widget {
  total = 0;
  view = 0;
  value = 0;
  private held: { part: 'up' | 'down' | 'pageUp' | 'pageDown' | 'thumb'; wait: number; grab: number } | null = null;

  constructor(private readonly onScroll: (value: number) => void) { super(); }

  get max(): number { return Math.max(0, this.total - this.view); }

  set(total: number, view: number, value: number): void { this.total = total; this.view = view; this.value = Math.max(0, Math.min(Math.max(0, total - view), value)); }

  private parts() {
    const r = this.r, a = Math.min(SCROLL_W, Math.floor(r.h / 2));
    const up = { x: r.x, y: r.y, w: r.w, h: a }, down = { x: r.x, y: r.y + r.h - a, w: r.w, h: a };
    const track = { x: r.x, y: r.y + a, w: r.w, h: r.h - 2 * a };
    const size = this.total > this.view ? Math.max(10, Math.floor((track.h * this.view) / this.total)) : track.h;
    const at = this.max ? Math.round(((track.h - size) * this.value) / this.max) : 0;
    return { up, down, track, thumb: { x: r.x, y: track.y + at, w: r.w, h: size } };
  }

  protected draw(g: Gfx, s: DrawState): void {
    const p = this.parts(), live = this.max > 0;
    g.pattern(p.track, PATTERNS.half, 'shadow', 'face');
    g.rect(this.r, 'frame');
    const arrow = (r: Rect, glyph: Icon, down: boolean) => {
      g.fill(r, 'face'); g.rect(r, 'frame');
      g.bevel(inset(r, 1), down ? 'pressed' : 'raised');
      g.icon(glyph, r.x + Math.floor((r.w - glyph.w) / 2) + (down ? 1 : 0), r.y + Math.floor((r.h - glyph.h) / 2) + (down ? 1 : 0), live ? undefined : { '#': 'faceDim' });
    };
    arrow(p.up, GLYPH.up, this.held?.part === 'up' && s.pressed === this);
    arrow(p.down, GLYPH.down, this.held?.part === 'down' && s.pressed === this);
    if (live) {
      g.fill(p.thumb, 'face'); g.rect(p.thumb, 'frame');
      g.bevel(inset(p.thumb, 1), 'raised');
    }
  }

  private step(part: 'up' | 'down' | 'pageUp' | 'pageDown'): void {
    const d = part === 'up' ? -1 : part === 'down' ? 1 : part === 'pageUp' ? -Math.max(1, this.view - 1) : Math.max(1, this.view - 1);
    const next = Math.max(0, Math.min(this.max, this.value + d));
    if (next !== this.value) { this.value = next; this.onScroll(next); }
  }

  event(e: GuiEvent): boolean {
    const p = this.parts();
    if (e.type === 'down') {
      if (!this.max) return true;
      const part = contains(p.up, e.x, e.y) ? 'up' : contains(p.down, e.x, e.y) ? 'down' : contains(p.thumb, e.x, e.y) ? 'thumb' : e.y < p.thumb.y ? 'pageUp' : 'pageDown';
      this.held = { part, wait: 0.35, grab: e.y - p.thumb.y };
      if (part !== 'thumb') this.step(part);
      this.invalidate();
      return true;
    }
    if ((e.type === 'drag' || e.type === 'dragstart') && this.held?.part === 'thumb') {
      const room = p.track.h - p.thumb.h;
      const next = room > 0 ? Math.round(((e.y - this.held.grab - p.track.y) / room) * this.max) : 0;
      const v = Math.max(0, Math.min(this.max, next));
      if (v !== this.value) { this.value = v; this.onScroll(v); }
      return true;
    }
    if (e.type === 'up' || e.type === 'dragend') { this.held = null; this.invalidate(); return true; }
    return e.type === 'click' || e.type === 'dblclick' || e.type === 'drag';
  }

  /** Held on an arrow or the track, it keeps going. */
  tick(dt: number): void {
    const h = this.held;
    if (!h || h.part === 'thumb') return;
    h.wait -= dt;
    if (h.wait <= 0) { h.wait = 0.05; this.step(h.part); }
  }
}

// ── Scrolled text ──────────────────────────────────────────────────────────────

export class TextView extends Widget {
  focusable = true;
  top = 0;
  private lines: string[] = [];
  private readonly bar: ScrollBar;
  private readonly fling = new Fling(LINE, rows => this.scrollTo(this.top + rows));

  constructor(public text: Dyn<Text>, private readonly o: { colour?: Ink; onEnd?: (host: GuiHost) => void; plain?: boolean } = {}) {
    super();
    this.bar = this.add(new ScrollBar(v => { this.top = v; this.invalidate(); this.reachedEnd(); }));
  }

  /** New words: back to the top. */
  set(text: Dyn<Text>): void { this.text = text; this.top = 0; this.invalidate(); }

  private get inner(): Rect { return cutRight(inset(this.r, 2), SCROLL_W)[1]; }
  private get rows(): number { return Math.max(1, Math.floor((this.inner.h - 4) / LINE)); }

  private layoutText(m: Machine): void {
    this.lines = wrap(m.t(get(this.text, m)), Math.max(1, Math.floor((this.inner.w - 8) / 8)));
    this.top = Math.max(0, Math.min(this.top, Math.max(0, this.lines.length - this.rows)));
    this.bar.set(this.lines.length, this.rows, this.top);
  }

  protected arrange(): void {
    const [bar] = cutRight(inset(this.r, 2), SCROLL_W);
    this.bar.place(bar);
  }

  protected draw(g: Gfx, s: DrawState): void {
    this.layoutText(s.m);
    well(g, this.r, 'field');
    const r = this.inner;
    g.save(); g.clip(r);
    for (let i = 0; i < this.rows; i++) {
      const line = this.lines[this.top + i];
      if (line) g.text(r.x + 4, r.y + 2 + i * LINE, line, this.o.colour ?? 'fieldText');
    }
    g.restore();
  }

  private scrollTo(top: number): boolean {
    const next = Math.max(0, Math.min(Math.max(0, this.lines.length - this.rows), top));
    if (next === this.top) return false;
    this.top = next;
    this.invalidate();
    this.reachedEnd();
    return true;
  }

  tick(dt: number): void { super.tick(dt); this.fling.tick(dt); }

  private reachedEnd(): void { if (this.top + this.rows >= this.lines.length) this.o.onEnd?.(this.host!); }

  wheel(lines: number): boolean { this.scrollTo(this.top + lines * 3); return true; }

  key(k: Key): boolean {
    const page = Math.max(1, this.rows - 1);
    const to = { ArrowUp: this.top - 1, ArrowDown: this.top + 1, PageUp: this.top - page, PageDown: this.top + page, Home: 0, End: Infinity, ' ': this.top + page }[k.key];
    if (to === undefined) return false;
    this.scrollTo(to === Infinity ? this.lines.length : to);
    return true;
  }

  event(e: GuiEvent): boolean {
    if (e.kind !== 'mouse' && (e.type === 'dragstart' || e.type === 'drag')) this.fling.drag(e);
    else if (e.type === 'dragend') this.fling.release();
    else if (e.type === 'down') this.fling.stop();
    return true;
  }
}

// ── Lists ──────────────────────────────────────────────────────────────────────

export type Column<T> = { title?: Text; width: number | 'fill'; text(item: T, m: Machine): string; align?: 'left' | 'right' };
export type RowStyle = 'normal' | 'bold' | 'dim' | 'accent';

export class ListView<T> extends Widget {
  focusable = true;
  items: T[] = [];
  selected = -1;
  top = 0;
  private readonly bar: ScrollBar;
  private typed = { text: '', at: 0 };
  private readonly fling = new Fling(LINE, rows => this.scrollBy(rows));

  constructor(readonly o: {
    items: (m: Machine) => T[];
    columns: Column<T>[];
    header?: boolean;
    icon?: (item: T) => Icon | null;
    style?: (item: T, m: Machine) => RowStyle;
    onSelect?: (item: T, index: number, host: GuiHost, tapped: boolean) => void;
    onOpen?: (item: T, index: number, host: GuiHost) => void;
    empty?: Text;
  }) {
    super();
    this.bar = this.add(new ScrollBar(v => { this.top = v; this.invalidate(); }));
  }

  get item(): T | undefined { return this.items[this.selected]; }

  refresh(): void {
    this.items = this.o.items(this.m);
    if (this.selected >= this.items.length) this.selected = this.items.length - 1;
  }

  private get body(): Rect {
    const r = cutRight(inset(this.r, 2), SCROLL_W)[1];
    return this.o.header ? cutTop(r, 18)[1] : r;
  }
  private get rows(): number { return Math.max(1, Math.floor(this.body.h / LINE)); }

  protected arrange(): void { this.bar.place(cutRight(inset(this.r, 2), SCROLL_W)[0]); }

  /** Column edges, left to right, inside `w`. */
  private columns(x: number, w: number): { x: number; w: number }[] {
    const fixed = this.o.columns.reduce((s, c) => s + (typeof c.width === 'number' ? c.width : 0), 0);
    const fills = this.o.columns.filter(c => c.width === 'fill').length;
    let at = x;
    return this.o.columns.map(c => {
      const cw = typeof c.width === 'number' ? c.width : Math.max(8, Math.floor((w - fixed) / Math.max(1, fills)));
      const out = { x: at, w: cw };
      at += cw;
      return out;
    });
  }

  protected draw(g: Gfx, s: DrawState): void {
    this.refresh();
    this.top = Math.max(0, Math.min(this.top, Math.max(0, this.items.length - this.rows)));
    this.bar.set(this.items.length, this.rows, this.top);
    well(g, this.r, 'field');
    const inner = cutRight(inset(this.r, 2), SCROLL_W)[1], m = s.m;
    const iconW = this.o.icon ? 20 : 4;
    const cols = this.columns(inner.x + iconW, inner.w - iconW - 4);
    if (this.o.header) {
      const [head] = cutTop(inner, 18);
      g.fill(head, 'face'); g.bevel(head, 'raised'); g.hline(head.x, head.y + head.h - 1, head.w, 'frame');
      this.o.columns.forEach((c, i) => { if (c.title) g.text(cols[i].x + 2, head.y + 1, clip(m.t(c.title), Math.floor((cols[i].w - 4) / 8)), 'faceText'); });
    }
    const body = this.body;
    g.save(); g.clip(body);
    if (!this.items.length && this.o.empty) g.text(body.x + 8, body.y + 4, m.t(this.o.empty), 'faceDim');
    for (let i = 0; i < this.rows; i++) {
      const index = this.top + i, item = this.items[index];
      if (item === undefined) break;
      const y = body.y + i * LINE, row = { x: body.x, y, w: body.w, h: LINE };
      const chosen = index === this.selected;
      const on = chosen && s.active && s.focus === this;
      if (chosen) g.fill(row, on ? 'select' : 'selectOff');
      const style = this.o.style?.(item, m) ?? 'normal';
      const colour: Ink = chosen ? (on ? 'selectText' : 'selectOffText') : style === 'dim' ? 'faceDim' : style === 'accent' ? 'accent' : 'fieldText';
      const ic = this.o.icon?.(item);
      if (ic) g.icon(ic, body.x + 2, y + Math.floor((LINE - ic.h) / 2), chosen ? { '#': colour, o: on ? 'select' : 'selectOff' } : undefined);
      this.o.columns.forEach((c, k) => {
        const text = clip(c.text(item, m), Math.max(0, Math.floor((cols[k].w - 4) / 8)));
        const w = g.measure(text);
        g.text(c.align === 'right' ? cols[k].x + cols[k].w - w - 6 : cols[k].x + 2, y, text, colour, { bold: style === 'bold' || style === 'accent' });
      });
    }
    g.restore();
  }

  /** `tapped`: chosen by a finger, which on a phone means "show me" (see onSelect). */
  select(index: number, open = false, tapped = false): void {
    if (!this.items.length) return;
    const i = Math.max(0, Math.min(this.items.length - 1, index));
    const changed = i !== this.selected;
    this.selected = i;
    if (i < this.top) this.top = i;
    if (i >= this.top + this.rows) this.top = i - this.rows + 1;
    this.invalidate();
    if (changed || open || tapped) this.o.onSelect?.(this.items[i], i, this.host!, tapped);
    if (open) this.o.onOpen?.(this.items[i], i, this.host!);
  }

  private rowAt(y: number): number {
    const i = Math.floor((y - this.body.y) / LINE);
    return i >= 0 && i < this.rows ? this.top + i : -1;
  }

  event(e: GuiEvent): boolean {
    const i = this.rowAt(e.y), row = i >= 0 && i < this.items.length;
    if (e.type === 'down') {
      this.fling.stop();
      // The mouse chooses as it goes down; a finger may be about to scroll.
      if (e.kind === 'mouse' && row) this.select(i);
    } else if (e.type === 'click' && e.kind !== 'mouse' && row) {
      this.select(i, false, true);
    } else if (e.type === 'dblclick' && row) {
      this.select(i);
      this.o.onOpen?.(this.items[i], i, this.host!);
    } else if (e.kind !== 'mouse' && (e.type === 'dragstart' || e.type === 'drag')) this.fling.drag(e);
    else if (e.type === 'dragend') this.fling.release();
    return true;
  }

  private scrollBy(rows: number): boolean {
    const next = Math.max(0, Math.min(Math.max(0, this.items.length - this.rows), this.top + rows));
    if (next === this.top) return false;
    this.top = next;
    this.invalidate();
    return true;
  }

  tick(dt: number): void { super.tick(dt); this.fling.tick(dt); }

  wheel(lines: number): boolean { this.scrollBy(lines * 3); return true; }

  key(k: Key): boolean {
    // The list may have grown since it was drawn (a reply came in).
    this.refresh();
    const page = Math.max(1, this.rows - 1);
    // ← and → go to the previous and next, as they turn pages elsewhere.
    const moves: Record<string, number> = {
      ArrowUp: this.selected - 1, ArrowDown: this.selected + 1, ArrowLeft: this.selected - 1, ArrowRight: this.selected + 1,
      PageUp: this.selected - page, PageDown: this.selected + page, Home: 0, End: this.items.length - 1,
    };
    if (k.key in moves) { this.select(this.selected < 0 && k.key === 'ArrowDown' ? 0 : moves[k.key]); return true; }
    if (k.key === 'Enter' && this.item !== undefined) { this.o.onOpen?.(this.item, this.selected, this.host!); return true; }
    // Letters jump to the next row that starts with them.
    if (k.key.length === 1 && k.key !== ' ' && !k.ctrl) {
      const now = this.m.clock;
      this.typed = { text: now - this.typed.at < 1 ? this.typed.text + k.key : k.key, at: now };
      const want = this.typed.text.toLowerCase(), n = this.items.length;
      const first = (item: T) => this.o.columns[0].text(item, this.m).trim().toLowerCase();
      for (let d = want.length > 1 ? 0 : 1; d <= n; d++) {
        const i = (Math.max(0, this.selected) + d) % n;
        if (first(this.items[i]).startsWith(want)) { this.select(i); return true; }
      }
      return true;
    }
    return false;
  }
}

// ── A line to type in ──────────────────────────────────────────────────────────

export class InputField extends Widget {
  focusable = true;
  cursor = 'text' as const;
  value = '';
  private blink = 0;
  private on = true;

  constructor(private readonly o: { max?: number; mask?: string; onEnter?: (value: string, host: GuiHost) => void; onChange?: (value: string) => void; upper?: boolean } = {}) {
    super();
  }

  line(): string | null { return this.value; }

  set(value: string): void { this.value = value; this.invalidate(); }

  protected draw(g: Gfx, s: DrawState): void {
    const r = well(g, this.r, 'field');
    const shown = this.o.mask ? this.o.mask.repeat(Array.from(this.value).length) : this.value;
    // Only the end of a long line shows, as in a real field.
    let visible = shown;
    while (g.measure(visible) > r.w - 12 && visible) visible = Array.from(visible).slice(1).join('');
    g.save(); g.clip(r);
    const w = g.text(r.x + 3, r.y + Math.floor((r.h - LINE) / 2), visible, 'fieldText');
    if (s.focus === this && this.on) g.fill({ x: r.x + 3 + w, y: r.y + Math.floor((r.h - LINE) / 2) + 1, w: 2, h: LINE - 2 }, 'fieldText');
    g.restore();
  }

  tick(dt: number): void {
    this.blink += dt;
    if (this.blink >= 0.45) {
      this.blink = 0; this.on = !this.on;
      if (this.host && this.isFocused()) this.invalidate();
    }
  }

  private isFocused(): boolean { return this.host?.focused === this; }

  focusIn(): void { this.on = true; this.blink = 0; }

  key(k: Key): boolean {
    if (k.ctrl || k.alt) return false;
    if (k.key === 'Enter') {
      // Without its own use for ENTER, the field lets the window's default button have it.
      if (!this.o.onEnter) return false;
      this.o.onEnter(this.value, this.host!);
      return true;
    }
    if (k.key === 'Backspace') {
      const chars = Array.from(this.value);
      if (chars.length) { chars.pop(); this.value = chars.join(''); this.o.onChange?.(this.value); this.invalidate(); }
      return true;
    }
    if (Array.from(k.key).length === 1) {
      const ch = this.o.upper ? k.key.toUpperCase() : k.key;
      if (strWidth(this.value + ch) <= (this.o.max ?? 60)) { this.value += ch; this.o.onChange?.(this.value); this.on = true; this.blink = 0; this.invalidate(); }
      return true;
    }
    return false;
  }

  event(e: GuiEvent): boolean { return e.type === 'down' || e.type === 'click' || e.type === 'up'; }
}

// ── Check boxes and radio buttons ──────────────────────────────────────────────

class Choice extends Widget {
  focusable = true;
  hoverable = true;

  width(m: Machine): number { return 22 + strWidth(m.t(get(this.label, m))) * 8; }

  constructor(private readonly label: Dyn<Text>, private readonly isOn: (m: Machine) => boolean, private readonly toggle: (m: Machine, host: GuiHost) => void, private readonly round: boolean) {
    super();
  }

  protected draw(g: Gfx, s: DrawState): void {
    const r = this.r, box = { x: r.x, y: r.y + Math.floor((r.h - 12) / 2), w: 12, h: 12 };
    g.fill(box, 'field'); g.rect(box, 'frame');
    if (this.isOn(s.m)) {
      const glyph = this.round ? GLYPH.dot : GLYPH.check;
      g.icon(glyph, box.x + Math.floor((12 - glyph.w) / 2), box.y + Math.floor((12 - glyph.h) / 2), { '#': 'fieldText' });
    }
    const label = s.m.t(get(this.label, s.m));
    const w = g.text(r.x + 18, r.y + Math.floor((r.h - LINE) / 2), label, 'faceText');
    if (s.focus === this) focusRing(g, { x: r.x + 16, y: r.y + Math.floor((r.h - LINE) / 2) - 1, w: w + 4, h: LINE + 2 }, 'faceText');
  }

  event(e: GuiEvent): boolean {
    if (e.type === 'click') { this.toggle(this.m, this.host!); this.invalidate(); }
    return ['down', 'up', 'click', 'dblclick'].includes(e.type);
  }

  key(k: Key): boolean {
    if (k.key === ' ' || k.key === 'Enter') { this.toggle(this.m, this.host!); this.invalidate(); return true; }
    return false;
  }
}

export class Checkbox extends Choice {
  constructor(label: Dyn<Text>, isOn: (m: Machine) => boolean, set: (m: Machine, on: boolean, host: GuiHost) => void) {
    super(label, isOn, (m, host) => set(m, !isOn(m), host), false);
  }
}

export class Radio extends Choice {
  constructor(label: Dyn<Text>, isOn: (m: Machine) => boolean, choose: (m: Machine, host: GuiHost) => void) {
    super(label, isOn, choose, true);
  }
}

// ── Two panes with a divider ───────────────────────────────────────────────────

export class Split extends Widget {
  private grab: number | null = null;
  /** On a phone there is room for one pane: the second shows over the first, with a way back. */
  private second = false;
  private readonly back: Button;

  constructor(readonly a: Widget, readonly b: Widget, private readonly o: { direction: 'row' | 'column'; first: number; min?: number }) {
    super();
    this.add(a); this.add(b);
    this.back = this.add(new Button({ en: '◄ Back', zh: '◄ 返回' }, () => this.showFirst()));
    this.cursor = 'move';
  }

  /** Stacked, one pane at a time: when the screen is too small for both. */
  get stacked(): boolean { return (this.host?.m.scale ?? 1) === 2; }

  showSecond(): void { if (this.stacked && !this.second) { this.second = true; this.arrange(); this.invalidate(); } }
  showFirst(): void { if (this.second) { this.second = false; this.arrange(); this.invalidate(); } }

  private get divider(): Rect {
    const r = this.r, f = this.firstSize();
    return this.o.direction === 'row' ? { x: r.x + f, y: r.y, w: 5, h: r.h } : { x: r.x, y: r.y + f, w: r.w, h: 5 };
  }

  private firstSize(): number {
    const whole = this.o.direction === 'row' ? this.r.w : this.r.h, min = this.o.min ?? 40;
    return Math.max(min, Math.min(whole - 5 - min, this.o.first));
  }

  protected arrange(): void {
    const r = this.r, f = this.firstSize();
    if (this.stacked) {
      this.a.visible = !this.second; this.b.visible = this.second; this.back.visible = this.second;
      this.a.place(r);
      this.back.place({ x: r.x + 2, y: r.y + 2, w: this.back.width(this.m), h: 20 });
      this.b.place({ x: r.x, y: r.y + 24, w: r.w, h: r.h - 24 });
      return;
    }
    this.a.visible = true; this.b.visible = true; this.back.visible = false;
    if (this.o.direction === 'row') {
      this.a.place({ x: r.x, y: r.y, w: f, h: r.h });
      this.b.place({ x: r.x + f + 5, y: r.y, w: r.w - f - 5, h: r.h });
    } else {
      this.a.place({ x: r.x, y: r.y, w: r.w, h: f });
      this.b.place({ x: r.x, y: r.y + f + 5, w: r.w, h: r.h - f - 5 });
    }
  }

  protected draw(g: Gfx): void {
    if (this.stacked) { if (this.second) g.fill({ ...this.r, h: 24 }, 'face'); return; }
    g.fill(this.divider, 'face');
  }

  at(x: number, y: number): Widget | null {
    if (!this.visible || !contains(this.r, x, y)) return null;
    if (this.stacked) return (this.second ? this.back.at(x, y) ?? this.b.at(x, y) : this.a.at(x, y)) ?? this;
    if (contains(this.divider, x, y)) return this;
    return this.b.at(x, y) ?? this.a.at(x, y) ?? this;
  }

  key(k: Key): boolean {
    // ESC in the second pane of a phone goes back to the first.
    if (this.stacked && this.second && k.key === 'Escape') { this.showFirst(); return true; }
    return false;
  }

  event(e: GuiEvent): boolean {
    if (this.stacked) return false;
    if (e.type === 'down') { this.grab = this.o.first; return true; }
    if ((e.type === 'drag' || e.type === 'dragstart') && this.grab !== null) {
      this.o.first = this.grab + (this.o.direction === 'row' ? e.dx : e.dy);
      this.arrange();
      this.invalidate();
      return true;
    }
    if (e.type === 'up' || e.type === 'dragend') { this.grab = null; return true; }
    return true;
  }
}

// ── Pictures ───────────────────────────────────────────────────────────────────

/** A picture read from the disk, shown whole in its box. */
export class PictureView extends Widget {
  private url: string | null = null;
  private picture: Picture | 'loading' | 'failed' | null = null;

  show(url: string | null): void {
    if (url === this.url) return;
    this.url = url;
    this.picture = url ? 'loading' : null;
    if (!url) { this.invalidate(); return; }
    this.m.loadPicture(url).then(p => { if (this.url === url) { this.picture = p; this.invalidate(); } }, () => { if (this.url === url) { this.picture = 'failed'; this.invalidate(); } });
    this.invalidate();
  }

  protected draw(g: Gfx, s: DrawState): void {
    const r = well(g, this.r, 'tmBg');
    const p = this.picture;
    if (p && typeof p === 'object') g.picture(p, inset(r, 2));
    else if (p) {
      const t = s.m.t(p === 'loading' ? { en: 'reading...', zh: '读取中……' } : { en: 'CRC ERROR', zh: 'CRC 校验错误' });
      g.text(r.x + Math.floor((r.w - g.measure(t)) / 2), r.y + Math.floor((r.h - LINE) / 2), t, 'tmDim');
    }
  }
}

/** Small copies of pictures, cached per size: the desk shows the same few again and again. */
const thumbs = new Map<string, Picture | 'loading'>();

export function thumbOf(m: Machine, url: string, w: number, h: number, ready: () => void): Picture | null {
  const key = `${url}#${w}x${h}`, hit = thumbs.get(key);
  if (hit && hit !== 'loading') return hit;
  if (!hit) {
    thumbs.set(key, 'loading');
    m.loadPicture(url).then(p => { thumbs.set(key, thumbnail(p, w, h)); ready(); }, () => thumbs.delete(key));
  }
  return null;
}

export class ThumbGrid<T> extends Widget {
  focusable = true;
  selected = 0;
  top = 0;
  private readonly bar: ScrollBar;

  constructor(private readonly o: {
    items: (m: Machine) => T[];
    url: (item: T) => string;
    caption: (item: T, m: Machine) => string;
    onSelect?: (item: T, index: number, host: GuiHost) => void;
    onOpen: (item: T, index: number, host: GuiHost) => void;
    cell?: { w: number; h: number };
  }) {
    super();
    this.bar = this.add(new ScrollBar(v => { this.top = v; this.invalidate(); }));
  }

  private readonly fling = new Fling(84, rows => this.scrollRows(rows));

  private scrollRows(rows: number): boolean {
    const total = Math.ceil(this.o.items(this.m).length / this.across);
    const next = Math.max(0, Math.min(Math.max(0, total - this.down), this.top + rows));
    if (next === this.top) return false;
    this.top = next;
    this.invalidate();
    return true;
  }

  tick(dt: number): void { super.tick(dt); this.fling.tick(dt); }

  private get cell() { return this.o.cell ?? (this.m.scale === 2 ? { w: 76, h: 70 } : { w: 96, h: 84 }); }
  private get inner(): Rect { return cutRight(inset(this.r, 2), SCROLL_W)[1]; }
  private get across(): number { return Math.max(1, Math.floor(this.inner.w / this.cell.w)); }
  private get down(): number { return Math.max(1, Math.floor(this.inner.h / this.cell.h)); }

  protected arrange(): void { this.bar.place(cutRight(inset(this.r, 2), SCROLL_W)[0]); }

  protected draw(g: Gfx, s: DrawState): void {
    const items = this.o.items(s.m), m = s.m;
    const rows = Math.ceil(items.length / this.across);
    this.top = Math.max(0, Math.min(this.top, Math.max(0, rows - this.down)));
    this.bar.set(rows, this.down, this.top);
    well(g, this.r, 'field');
    const r = this.inner, { w: cw, h: ch } = this.cell, tw = cw - 16, th = ch - 30;
    g.save(); g.clip(r);
    for (let row = 0; row <= this.down; row++) for (let col = 0; col < this.across; col++) {
      const i = (this.top + row) * this.across + col, item = items[i];
      if (item === undefined) continue;
      const x = r.x + col * cw, y = r.y + row * ch;
      const box = { x: x + 8, y: y + 4, w: tw, h: th };
      g.fill(box, 'tmBg');
      const pic = thumbOf(m, this.o.url(item), tw * g.scale, th * g.scale, () => this.invalidate());
      if (pic) g.picture(pic, box);
      const chosen = i === this.selected;
      g.rect({ x: box.x - 1, y: box.y - 1, w: box.w + 2, h: box.h + 2 }, chosen ? 'select' : 'frame');
      if (chosen) g.rect({ x: box.x - 2, y: box.y - 2, w: box.w + 4, h: box.h + 4 }, 'select');
      const caption = clip(this.o.caption(item, m), Math.floor(cw / 8));
      const w = g.measure(caption), cx = x + Math.floor((cw - w) / 2), cy = y + th + 8;
      const on = chosen && s.active && s.focus === this;
      if (chosen) g.fill({ x: cx - 2, y: cy, w: w + 4, h: LINE }, on ? 'select' : 'selectOff');
      g.text(cx, cy, caption, chosen ? (on ? 'selectText' : 'selectOffText') : 'fieldText');
    }
    g.restore();
  }

  private indexAt(x: number, y: number): number {
    const r = this.inner, col = Math.floor((x - r.x) / this.cell.w), row = Math.floor((y - r.y) / this.cell.h);
    if (col < 0 || col >= this.across || row < 0) return -1;
    return (this.top + row) * this.across + col;
  }

  private choose(i: number, open: boolean): void {
    const items = this.o.items(this.m);
    if (i < 0 || i >= items.length) return;
    this.selected = i;
    const row = Math.floor(i / this.across);
    if (row < this.top) this.top = row;
    if (row >= this.top + this.down) this.top = row - this.down + 1;
    this.invalidate();
    this.o.onSelect?.(items[i], i, this.host!);
    if (open) this.o.onOpen(items[i], i, this.host!);
  }

  event(e: GuiEvent): boolean {
    if (e.type === 'down') { this.fling.stop(); if (e.kind === 'mouse') this.choose(this.indexAt(e.x, e.y), false); }
    // A tap opens: there is no double tap on a phone's desk.
    else if (e.type === 'click' && e.kind !== 'mouse') this.choose(this.indexAt(e.x, e.y), true);
    else if (e.type === 'dblclick') this.choose(this.indexAt(e.x, e.y), true);
    else if (e.kind !== 'mouse' && (e.type === 'dragstart' || e.type === 'drag')) this.fling.drag(e);
    else if (e.type === 'dragend') this.fling.release();
    return true;
  }

  wheel(lines: number): boolean { this.scrollRows(Math.sign(lines)); return true; }

  key(k: Key): boolean {
    const n = this.o.items(this.m).length;
    const to: Record<string, number> = { ArrowLeft: this.selected - 1, ArrowRight: this.selected + 1, ArrowUp: this.selected - this.across, ArrowDown: this.selected + this.across, Home: 0, End: n - 1 };
    if (k.key in to) { this.choose(Math.max(0, Math.min(n - 1, to[k.key])), false); return true; }
    if (k.key === 'Enter') { this.choose(this.selected, true); return true; }
    return false;
  }
}

// ── Rows of controls, and a stack that shows one at a time ─────────────────────

type Sized = Widget & { width?(m: Machine): number };

/** Controls left to right at their own widths; a Spacer takes what is left. */
export class Toolbar extends Widget {
  constructor(private readonly gap = 4, private readonly pad = 3) { super(); }

  protected arrange(): void {
    const m = this.m, kids = this.children.filter(c => c.visible) as Sized[];
    const widths = kids.map(c => (c instanceof Spacer ? 0 : c.width?.(m) ?? 80));
    const spare = Math.max(0, this.r.w - 2 * this.pad - widths.reduce((a, b) => a + b, 0) - this.gap * Math.max(0, kids.length - 1));
    const spacers = kids.filter(c => c instanceof Spacer).length;
    let x = this.r.x + this.pad;
    kids.forEach((c, i) => {
      const w = c instanceof Spacer ? Math.floor(spare / spacers) : widths[i];
      const h = c instanceof Button ? BUTTON_H : LINE + 2;
      c.place({ x, y: this.r.y + Math.floor((this.r.h - h) / 2), w, h });
      x += w + this.gap;
    });
  }

  protected draw(g: Gfx): void {
    // Labels change (a channel's name): lay out afresh before the children draw.
    this.arrange();
    g.fill(this.r, 'face');
    g.hline(this.r.x, this.r.y + this.r.h - 1, this.r.w, 'shadow');
  }
}

export class Spacer extends Widget {}

/** A round knob to turn: drag it round or roll the wheel; it clicks from notch to notch. */
export class Knob extends Widget {
  hoverable = true;
  cursor = 'hand' as const;
  private angle = 0;
  private grab: { angle: number; notches: number } | null = null;

  constructor(private readonly step: (dir: number, host: GuiHost) => void, private readonly notch = Math.PI / 6) { super(); }

  width(): number { return 22; }

  protected draw(g: Gfx, s: DrawState): void {
    const r = Math.floor(Math.min(this.r.w, this.r.h) / 2) - 1;
    const cx = this.r.x + Math.floor(this.r.w / 2), cy = this.r.y + Math.floor(this.r.h / 2);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d <= r - 1) g.pixel(cx + x, cy + y, (x + y) % 5 === 0 && d > r - 3 ? 'shadow' : 'face');
      else if (d <= r + 0.4) g.pixel(cx + x, cy + y, 'frame');
    }
    g.line(cx, cy, cx + Math.sin(this.angle) * (r - 2), cy - Math.cos(this.angle) * (r - 2), s.hover === this ? 'accent' : 'faceText');
  }

  private turn(to: number): void {
    const before = Math.round(this.angle / this.notch), after = Math.round(to / this.notch);
    this.angle = to;
    for (let i = before; i !== after; i += Math.sign(after - before)) this.step(Math.sign(after - before), this.host!);
    this.invalidate();
  }

  event(e: GuiEvent): boolean {
    if (e.type === 'down') this.grab = { angle: this.angle, notches: 0 };
    // Right or up turns it clockwise.
    if ((e.type === 'drag' || e.type === 'dragstart') && this.grab) this.turn(this.grab.angle + (e.dx - e.dy) * 0.05);
    if (e.type === 'up' || e.type === 'dragend') this.grab = null;
    return true;
  }

  wheel(lines: number): boolean { this.turn(this.angle + Math.sign(lines) * this.notch); return true; }
}

/** Shows one of its children, filling the whole of it. */
export class Deck extends Widget {
  private index = 0;

  show(w: Widget): void {
    const i = this.children.indexOf(w);
    if (i < 0 || i === this.index) return;
    this.index = i;
    this.children.forEach((c, k) => { c.visible = k === i; });
    this.invalidate();
  }

  get current(): Widget | undefined { return this.children[this.index]; }

  protected arrange(): void {
    this.children.forEach((c, k) => { c.visible = k === this.index; c.place(this.r); });
  }
}
