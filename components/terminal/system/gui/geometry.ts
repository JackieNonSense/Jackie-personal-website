/** A rectangle, in logical pixels of the desk (or text cells, for the old desk). */
export type Rect = { x: number; y: number; w: number; h: number };

export const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export function inset(r: Rect, d = 1, dy = d): Rect {
  return { x: r.x + d, y: r.y + dy, w: Math.max(0, r.w - 2 * d), h: Math.max(0, r.h - 2 * dy) };
}

export function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null;
}

export function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

/** Cuts `h` off the top of a rectangle: returns the strip and what is left. */
export function cutTop(r: Rect, h: number): [Rect, Rect] {
  const k = Math.min(h, r.h);
  return [{ x: r.x, y: r.y, w: r.w, h: k }, { x: r.x, y: r.y + k, w: r.w, h: r.h - k }];
}

export function cutBottom(r: Rect, h: number): [Rect, Rect] {
  const k = Math.min(h, r.h);
  return [{ x: r.x, y: r.y + r.h - k, w: r.w, h: k }, { x: r.x, y: r.y, w: r.w, h: r.h - k }];
}

export function cutLeft(r: Rect, w: number): [Rect, Rect] {
  const k = Math.min(w, r.w);
  return [{ x: r.x, y: r.y, w: k, h: r.h }, { x: r.x + k, y: r.y, w: r.w - k, h: r.h }];
}

export function cutRight(r: Rect, w: number): [Rect, Rect] {
  const k = Math.min(w, r.w);
  return [{ x: r.x + r.w - k, y: r.y, w: k, h: r.h }, { x: r.x, y: r.y, w: r.w - k, h: r.h }];
}

export const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
