export const CRT_TEXTURE_WIDTH = 1024;
export const CRT_TEXTURE_HEIGHT = 640;
export const JR_ASCII = [
  '   ########  ########  ',
  '         ##  ##     ## ',
  '         ##  ##     ## ',
  '         ##  ########  ',
  ' ##      ##  ##  ##    ',
  ' ##      ##  ##    ##  ',
  '  ########   ##      ##',
] as const;
export const CRT_ENTER_PROMPT = 'ENTER _';

export type CrtSignalState = {
  awake: boolean;
  elapsed: number;
  /** Frozen on hover-out so the phosphor tail preserves the last raster frame. */
  rasterTime: number;
  power: number;
  phase: 'off' | 'igniting' | 'booting' | 'ready' | 'cooling';
  /** Number of rows with at least one visible glyph. */
  lines: number;
  visibleChars: readonly number[];
  cursorVisible: boolean;
};

const displayLines = [...JR_ASCII, CRT_ENTER_PROMPT];
const rowWriteDuration = .14;
const starts = [...JR_ASCII.map((_, index) => .20 + index * .185), 1.85];
const ends = [...JR_ASCII.map((_, index) => starts[index] + rowWriteDuration), 2];
const readyAt = 2;
const epsilon = 1e-8;

export function initialCrtSignal(): CrtSignalState {
  return { awake: false, elapsed: 0, rasterTime: 0, power: 0, phase: 'off', lines: 0, visibleChars: displayLines.map(() => 0), cursorVisible: false };
}

/** Seconds supplied by the renderer; no intervals, DOM work or independent clock. */
export function stepCrtSignal(previous: CrtSignalState, awake: boolean, dt: number, still: boolean): CrtSignalState {
  if (still) return awake
    ? { awake, elapsed: readyAt, rasterTime: readyAt, power: 1, phase: 'ready', lines: displayLines.length, visibleChars: displayLines.map(line => line.length), cursorVisible: true }
    : initialCrtSignal();

  const delta = Number.isFinite(dt) ? Math.max(0, Math.min(.05, dt)) : 0;
  const elapsed = (awake === previous.awake ? previous.elapsed : 0) + delta;
  if (!awake) {
    const power = Math.max(0, previous.power - delta / .35);
    if (power < epsilon) return initialCrtSignal();
    return { ...previous, awake, elapsed, power, phase: 'cooling' };
  }

  const power = Math.min(1, previous.power + delta / .10);
  const visibleChars = displayLines.map((line, index) => {
    if (elapsed + epsilon < starts[index]) return 0;
    if (elapsed + epsilon >= ends[index]) return line.length;
    return Math.max(1, Math.floor((elapsed - starts[index]) / (ends[index] - starts[index]) * line.length));
  });
  const phase = elapsed + epsilon >= readyAt ? 'ready' : elapsed + epsilon >= starts[0] ? 'booting' : 'igniting';
  const cursorVisible = phase === 'ready' && Math.floor(Math.max(0, elapsed - readyAt) / .64) % 2 === 0;
  return { awake, elapsed, rasterTime: elapsed, power, phase, lines: visibleChars.filter(count => count > 0).length, visibleChars, cursorVisible };
}

/** Text alpha only: the curved-screen shader owns phosphor tint, power and bloom. */
export function drawCrtSignal(ctx: CanvasRenderingContext2D, state: CrtSignalState, compact = false): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, CRT_TEXTURE_WIDTH, CRT_TEXTURE_HEIGHT);
  if (state.power > 0) {
    ctx.fillStyle = '#edf9ed';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const x = CRT_TEXTURE_WIDTH / 2;
    const y = compact ? 120 : 130;
    const rowHeight = compact ? 44 : 42;
    for (let index = 0; index < displayLines.length; index++) {
      const count = state.visibleChars[index] ?? 0;
      if (!count) continue;
      const isMark = index < JR_ASCII.length;
      let text = displayLines[index].slice(0, count);
      if (isMark) {
        text = [...text].map((glyph, column) => {
          if (glyph === ' ') return glyph;
          const age = state.rasterTime - starts[index] - column * rowWriteDuration / displayLines[index].length;
          if (age + epsilon >= .10) return glyph;
          return '/|_+'[(index * 5 + column * 3 + Math.floor(Math.max(0, age) / .025)) % 4];
        }).join('');
      } else if (!state.cursorVisible && text.endsWith('_')) text = text.slice(0, -1) + ' ';
      // Retain every cell while writing/blinking so the centered artwork never shifts.
      text = text.padEnd(displayLines[index].length, ' ');
      const size = isMark ? (compact ? 46 : 44) : (compact ? 46 : 38);
      ctx.font = `600 ${size}px "Courier New", monospace`;
      ctx.fillText(text, x, isMark ? y + index * rowHeight : 486);
    }
  }
  ctx.restore();
}
