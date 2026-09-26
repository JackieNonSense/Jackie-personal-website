import type { Key } from './machine';

/**
 * Phone keyboards do not send keystrokes: they edit a text field, often a whole word
 * at a time (composition, autocorrect, paste). The field mirrors the command line,
 * and each edit is replayed to the terminal as the backspaces and characters that
 * turn the old text into the new one.
 */
export function diffKeys(before: string, after: string): Key[] {
  const a = Array.from(before), b = Array.from(after);
  let same = 0;
  while (same < a.length && same < b.length && a[same] === b[same]) same++;
  const keys: Key[] = [];
  for (let i = a.length; i > same; i--) keys.push({ key: 'Backspace', ctrl: false });
  for (const ch of b.slice(same)) keys.push({ key: ch === '\n' ? 'Enter' : ch, ctrl: false });
  return keys;
}
