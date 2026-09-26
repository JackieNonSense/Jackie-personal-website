import { contains, type Rect } from './geometry';
import type { Gfx } from './gfx';
import type { CursorShape } from './cursors';
import type { Text } from '../i18n';
import type { App, Key, Machine, PointerKind } from '../machine';

/**
 * The pixel desk's building blocks. Widgets form a tree inside each window; each
 * knows its rectangle on the screen (logical pixels, absolute), draws itself, and
 * answers the pointer and the keys. The desk (desktop.ts) routes input to them.
 */

/** Two clicks this close in time and space are a double click. */
export const CLICK = { double: 0.4, slop: 4 } as const;
/** A press becomes a drag after this many CSS pixels: a mouse is steadier than a finger. */
export const DRAG = { mouse: 3, touch: 10 } as const;

export type GuiEvent = {
  type: 'down' | 'up' | 'click' | 'dblclick' | 'dragstart' | 'drag' | 'dragend' | 'enter' | 'leave' | 'move';
  /** Where, in logical pixels of the screen. */
  x: number;
  y: number;
  /** For drags: how far from where the press began. */
  dx: number;
  dy: number;
  kind: PointerKind;
  time: number;
  shift: boolean;
};

export type DrawState = {
  m: Machine;
  /** The widget's window is the active one. */
  active: boolean;
  focus: Widget | null;
  hover: Widget | null;
  /** Under a press that has not been let go. */
  pressed: Widget | null;
};

export type MenuItem = 'separator' | {
  label: Text;
  run(host: GuiHost): void;
  enabled?(m: Machine): boolean;
  checked?(m: Machine): boolean;
};

/** A window as asked for; the desk makes and keeps it (window.ts). */
export type WindowSpec = {
  id: string;
  title: Text | ((m: Machine) => Text);
  /** Built once: a closed window keeps its state for when it opens again. */
  content(host: GuiHost): Widget;
  size: { w: number; h: number };
  min?: { w: number; h: number };
  place?: 'centre' | 'cascade' | { x: number; y: number };
  resizable?: boolean;
  /** Blocks everything else until it closes. */
  modal?: boolean;
  /** Called on the close box or ESC; returning false keeps it open. */
  onClose?(host: GuiHost): boolean | void;
  /** Called each time it comes up, the first time and after it was closed. */
  onOpen?(host: GuiHost): void;
  /**
   * What the box beside the close box (and a double click on the title) does instead
   * of filling the desk: the television, for one, fills the whole screen.
   */
  onMaximise?(host: GuiHost): void;
};

/** What widgets can ask of the desk they live on. */
export interface GuiHost {
  readonly m: Machine;
  /** Where the keys go. */
  readonly focused: Widget | null;
  invalidate(): void;
  open(spec: WindowSpec): void;
  close(id: string): void;
  isOpen(id: string): boolean;
  /** Starts a full-screen program over the desk. */
  run(app: App): void;
  focus(w: Widget | null): void;
  /** Keeps the pointer's events for this widget until it is let go. */
  capture(w: Widget | null): void;
  beep(): void;
  /** A menu at a point. */
  popup(items: MenuItem[], at: { x: number; y: number }): void;
}

export abstract class Widget {
  r: Rect = { x: 0, y: 0, w: 0, h: 0 };
  parent: Widget | null = null;
  readonly children: Widget[] = [];
  host: GuiHost | null = null;
  visible = true;
  enabled = true;
  focusable = false;
  /** Redrawn when the pointer comes and goes (buttons light up; plain text does not). */
  hoverable = false;
  cursor: CursorShape = 'arrow';
  /** The pointer is over (x, y): the shape it takes there, where that depends on what is under it (a link). */
  pointAt?(x: number, y: number): CursorShape;
  /** Tests and scripts find a widget by this. */
  id?: string;

  add<T extends Widget>(w: T): T {
    w.parent = this;
    this.children.push(w);
    if (this.host) w.attach(this.host);
    return w;
  }

  remove(w: Widget): void {
    const i = this.children.indexOf(w);
    if (i >= 0) { this.children.splice(i, 1); w.parent = null; }
  }

  attach(host: GuiHost): void {
    this.host = host;
    for (const c of this.children) c.attach(host);
  }

  get m(): Machine { return this.host!.m; }

  /** Gives the widget its rectangle; containers lay out their children in `arrange`. */
  place(r: Rect): void { this.r = { ...r }; this.arrange(); }
  protected arrange(): void {}

  paint(g: Gfx, s: DrawState): void {
    this.draw?.(g, s);
    for (const c of this.children) if (c.visible && c.r.w > 0 && c.r.h > 0) c.paint(g, s);
  }
  protected draw?(g: Gfx, s: DrawState): void;

  /** The deepest widget at a point, or null when the point is not on this one. */
  at(x: number, y: number): Widget | null {
    if (!this.visible || !contains(this.r, x, y)) return null;
    for (let i = this.children.length - 1; i >= 0; i--) {
      const hit = this.children[i].at(x, y);
      if (hit) return hit;
    }
    return this;
  }

  /** The pointer. Returns whether it was used; unused events go to the parent. */
  event?(e: GuiEvent): boolean;
  key?(k: Key): boolean;
  wheel?(lines: number): boolean;
  tick(dt: number): void { for (const c of this.children) c.tick(dt); }
  /** A field being typed into: its text, which the phone's keyboard mirrors. */
  line(): string | null { return null; }
  focusIn(): void {}
  focusOut(): void {}
  invalidate(): void { this.host?.invalidate(); }

  /** Every widget below this one, depth first, this one included. */
  *walk(): Generator<Widget> {
    yield this;
    for (const c of this.children) yield* c.walk();
  }
}

/** A plain container: children stacked in a column or a row, with fixed or flexible sizes. */
export class Box extends Widget {
  constructor(private readonly direction: 'column' | 'row', private readonly sizes: (number | 'fill')[] = [], private readonly gap = 0, private readonly pad = 0) {
    super();
  }

  protected arrange(): void {
    const { r, pad, gap } = this;
    const across = this.direction === 'column' ? r.h - 2 * pad : r.w - 2 * pad;
    const kids = this.children.filter(c => c.visible);
    const fixed = kids.reduce((sum, _c, i) => sum + (typeof this.sizes[i] === 'number' ? (this.sizes[i] as number) : 0), 0);
    const flex = kids.filter((_c, i) => typeof this.sizes[i] !== 'number').length;
    const spare = Math.max(0, across - fixed - gap * Math.max(0, kids.length - 1));
    let at = this.direction === 'column' ? r.y + pad : r.x + pad;
    kids.forEach((c, i) => {
      const size = typeof this.sizes[i] === 'number' ? (this.sizes[i] as number) : Math.floor(spare / Math.max(1, flex));
      c.place(this.direction === 'column'
        ? { x: r.x + pad, y: at, w: r.w - 2 * pad, h: size }
        : { x: at, y: r.y + pad, w: size, h: r.h - 2 * pad });
      at += size + gap;
    });
  }
}
