/**
 * How a drawing is kept: runs of one colour, sixteen pixels at most to a byte (the
 * count in the high four bits, the colour in the low four), in base 64 behind a
 * name. Small enough for the browser's storage, which holds C:\DRAFTS.
 */
const MAGIC = 'JRPCX1:';

export function encodeDrawing(data: Uint8Array): string {
  const out: number[] = [];
  for (let i = 0; i < data.length;) {
    const c = data[i] & 15;
    let n = 1;
    while (n < 16 && i + n < data.length && (data[i + n] & 15) === c) n++;
    out.push(((n - 1) << 4) | c);
    i += n;
  }
  let s = '';
  for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode(...out.slice(i, i + 0x8000));
  return MAGIC + btoa(s);
}

/** The drawing, or null when the text is not one (or not the size expected). */
export function decodeDrawing(text: string, size: number): Uint8Array | null {
  if (!text.startsWith(MAGIC)) return null;
  let bytes: string;
  try { bytes = atob(text.slice(MAGIC.length)); } catch { return null; }
  const out = new Uint8Array(size);
  let at = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes.charCodeAt(i), n = (b >> 4) + 1;
    if (at + n > size) return null;
    out.fill(b & 15, at, at + n);
    at += n;
  }
  return at === size ? out : null;
}
