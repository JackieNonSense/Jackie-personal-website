import type { Key } from './machine';

/**
 * Which keys the terminal takes from the browser. The rule is to take as little as
 * possible: the function keys, the Windows and Command keys, ALT combinations and
 * CTRL combinations all stay the browser's (F5 reloads, CTRL+R reloads, ALT+← goes
 * back). The terminal takes what types, the keys that move and answer (ENTER, ESC,
 * the arrows, BACKSPACE, the page keys), TAB where a program asks for it, and the one
 * CTRL combination DOS lives by: CTRL+C.
 */
export type KeyEventLike = {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
};

export type KeyContext = {
  /** CTRL combinations the program on top uses, as lower-case letters. */
  ctrlKeys: readonly string[];
  /** Other keys it takes that the browser would otherwise use (TAB). */
  captureKeys: readonly string[];
};

export type KeyDecision = {
  /** What to hand the machine, if anything. */
  send: Key | null;
  /** Whether the browser must not act on it. */
  prevent: boolean;
};

/** Keys with names that the terminal answers. */
const NAMED = new Set(['Enter', 'Escape', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', 'Delete']);
const PASS: KeyDecision = { send: null, prevent: false };

export function decideKey(e: KeyEventLike, c: KeyContext): KeyDecision {
  // Typing into an input method, the Windows or Command key, and keys the browser cannot name.
  if (e.isComposing || e.metaKey || e.key === 'Process' || e.key === 'Unidentified' || e.key === 'Dead') return PASS;
  const printable = Array.from(e.key).length === 1;
  // CTRL+ALT is AltGr on European keyboards: it types characters.
  if (e.ctrlKey && e.altKey) return printable ? { send: { key: e.key, ctrl: false }, prevent: true } : PASS;
  if (e.altKey) return PASS;
  if (e.ctrlKey) {
    const k = e.key.toLowerCase();
    return printable && c.ctrlKeys.includes(k) ? { send: { key: k, ctrl: true }, prevent: true } : PASS;
  }
  if (printable) return { send: { key: e.key, ctrl: false, shift: e.shiftKey }, prevent: true };
  if (NAMED.has(e.key)) return { send: { key: e.key, ctrl: false, shift: e.shiftKey }, prevent: true };
  if (c.captureKeys.includes(e.key)) return { send: { key: e.key, ctrl: false, shift: e.shiftKey }, prevent: true };
  // F1 to F12, lone modifiers, the menu key, media keys: the browser's.
  return PASS;
}
