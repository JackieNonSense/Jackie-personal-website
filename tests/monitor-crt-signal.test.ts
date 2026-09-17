import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const signalPath = '../components/portfolio/monitor-crt-signal';
async function signal() {
  expect(existsSync(resolve('components/portfolio/monitor-crt-signal.ts'))).toBe(true);
  return await import(signalPath) as typeof import('../components/portfolio/monitor-crt-signal');
}

function recorder() {
  const text: { text: string; x: number; y: number; font: string; align: string }[] = [];
  const clears: number[][] = [];
  const context = {
    font: '', fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over',
    textAlign: 'left', textBaseline: 'top',
    save() {}, restore() {}, setTransform() {},
    clearRect(...bounds: number[]) { clears.push(bounds); },
    fillText(value: string, x: number, y: number) { text.push({ text: value, x, y, font: this.font, align: this.textAlign }); },
  };
  return { ctx: context as unknown as CanvasRenderingContext2D, text, clears };
}

describe('CRT phosphor signal', () => {
  it('exports a seven-row actual ASCII JR mark and only the ENTER prompt', async () => {
    const { JR_ASCII, CRT_ENTER_PROMPT } = await signal();
    expect(JR_ASCII).toEqual([
      '   ########  ########  ',
      '         ##  ##     ## ',
      '         ##  ##     ## ',
      '         ##  ########  ',
      ' ##      ##  ##  ##    ',
      ' ##      ##  ##    ##  ',
      '  ########   ##      ##',
    ]);
    expect(new Set(JR_ASCII.map(row => row.length)).size).toBe(1);
    expect(JR_ASCII.every(row => /^[ #]+$/.test(row))).toBe(true);
    expect(CRT_ENTER_PROMPT).toBe('ENTER _');
  });

  it('starts transparent and reaches ignition power before any text appears', async () => {
    const { initialCrtSignal, stepCrtSignal } = await signal();
    const initial = initialCrtSignal();
    expect(initial).toMatchObject({ awake: false, elapsed: 0, power: 0, phase: 'off', lines: 0, cursorVisible: false });
    expect(initial.visibleChars).toEqual(Array(8).fill(0));
    const first = stepCrtSignal(initial, true, .05, false);
    const lit = stepCrtSignal(first, true, .05, false);
    expect(first.power).toBeCloseTo(.5);
    expect(lit.power).toBe(1);
    expect(lit.phase).toBe('igniting');
    expect(lit.lines).toBe(0);
  });

  it('refreshes the mark first and introduces ENTER only after 1.85s, ready at 2s', async () => {
    const { initialCrtSignal, stepCrtSignal, JR_ASCII, CRT_ENTER_PROMPT } = await signal();
    let state = initialCrtSignal();
    for (let frame = 0; frame < 4; frame++) state = stepCrtSignal(state, true, .05, false);
    expect(state.phase).toBe('booting');
    expect(state.visibleChars[0]).toBe(1);
    expect(state.visibleChars.slice(1)).toEqual(Array(7).fill(0));
    for (let frame = 0; frame < 5; frame++) state = stepCrtSignal(state, true, .05, false);
    expect(state.visibleChars[0]).toBe(23);
    expect(state.visibleChars[1]).toBeGreaterThan(0);
    expect(state.visibleChars[1]).toBeLessThan(23);
    const sameInput = stepCrtSignal(state, true, .05, false);
    expect(stepCrtSignal(state, true, .05, false)).toEqual(sameInput);
    for (let frame = 0; frame < 27; frame++) state = stepCrtSignal(state, true, .05, false);
    expect(state.phase).toBe('booting');
    expect(state.visibleChars.at(-1)).toBe(0);
    for (let frame = 0; frame < 2; frame++) state = stepCrtSignal(state, true, .05, false);
    expect(state.visibleChars.at(-1)).toBeGreaterThan(0);
    expect(state.visibleChars.at(-1)).toBeLessThan(7);
    for (let frame = 0; frame < 2; frame++) state = stepCrtSignal(state, true, .05, false);
    expect(state.phase).toBe('ready');
    expect(state.lines).toBe(8);
    expect(state.visibleChars).toEqual([...JR_ASCII, CRT_ENTER_PROMPT].map(line => line.length));
    expect(state.cursorVisible).toBe(true);
  });

  it('limits frame gaps and ignores invalid or negative deltas without mutating previous state', async () => {
    const { initialCrtSignal, stepCrtSignal } = await signal();
    const state = initialCrtSignal();
    Object.freeze(state.visibleChars); Object.freeze(state);
    expect(stepCrtSignal(state, true, 60, false).elapsed).toBe(.05);
    expect(stepCrtSignal(state, true, Infinity, false).elapsed).toBe(0);
    expect(stepCrtSignal(state, true, NaN, false).elapsed).toBe(0);
    expect(stepCrtSignal(state, true, -1, false).power).toBe(0);
    expect(state).toEqual(initialCrtSignal());
  });

  it('preserves the last text during a 0.35s power decay and then goes blank', async () => {
    const { initialCrtSignal, stepCrtSignal } = await signal();
    const ready = stepCrtSignal(initialCrtSignal(), true, 0, true);
    let state = stepCrtSignal(ready, false, .05, false);
    expect(state.phase).toBe('cooling');
    expect(state.power).toBeCloseTo(6 / 7);
    expect(state.visibleChars).toEqual(ready.visibleChars);
    expect(state.rasterTime).toBe(ready.rasterTime);
    expect(state.cursorVisible).toBe(ready.cursorVisible);
    for (let frame = 0; frame < 6; frame++) state = stepCrtSignal(state, false, .05, false);
    expect(state).toEqual(initialCrtSignal());
  });

  it('blinks the ready cursor slowly, freezes it during cooling and remains static in still mode', async () => {
    const { initialCrtSignal, stepCrtSignal } = await signal();
    const ready = stepCrtSignal(initialCrtSignal(), true, 0, true);
    let state = ready;
    for (let frame = 0; frame < 13; frame++) state = stepCrtSignal(state, true, .05, false);
    expect(state.cursorVisible).toBe(false);
    const cooling = stepCrtSignal(state, false, .05, false);
    expect(cooling.cursorVisible).toBe(false);
    expect(stepCrtSignal(state, true, .05, true)).toEqual(ready);
    expect(stepCrtSignal(state, false, .05, true)).toEqual(initialCrtSignal());
    const restarted = stepCrtSignal(cooling, true, .05, false);
    expect(restarted.phase).toBe('igniting');
    expect(restarted.visibleChars).toEqual(Array(8).fill(0));
  });

  it.each([false, true])('draws the centered JR mark and ENTER only on a transparent texture (compact=%s)', async compact => {
    const { CRT_TEXTURE_WIDTH, CRT_TEXTURE_HEIGHT, initialCrtSignal, stepCrtSignal, drawCrtSignal, JR_ASCII, CRT_ENTER_PROMPT } = await signal();
    expect([CRT_TEXTURE_WIDTH, CRT_TEXTURE_HEIGHT]).toEqual([1024, 640]);
    const ready = stepCrtSignal(initialCrtSignal(), true, 0, true);
    const paint = recorder();
    drawCrtSignal(paint.ctx, ready, compact);
    expect(paint.clears).toEqual([[0, 0, 1024, 640]]);
    expect(paint.text.map(line => line.text)).toEqual([...JR_ASCII, CRT_ENTER_PROMPT]);
    expect(paint.text.map(line => line.x)).toEqual(Array(8).fill(512));
    expect(paint.text.every(line => line.align === 'center')).toBe(true);
    expect(paint.text.slice(0, 7).map(line => line.y)).toEqual(Array.from({ length: 7 }, (_, index) => (compact ? 120 : 130) + index * (compact ? 44 : 42)));
    expect(paint.text.at(-1)?.y).toBe(486);
    expect(paint.text.slice(0, 7).every(line => line.font === `600 ${compact ? 46 : 44}px "Courier New", monospace`)).toBe(true);
    const widthFraction = 23 * (compact ? 46 : 44) * .6 / CRT_TEXTURE_WIDTH;
    expect(widthFraction).toBeGreaterThan(.58);
    expect(widthFraction).toBeLessThan(.63);
  });

  it('settles temporary ASCII strokes deterministically and freezes the exact frame during power decay', async () => {
    const { initialCrtSignal, stepCrtSignal, drawCrtSignal, JR_ASCII } = await signal();
    let state = initialCrtSignal();
    for (let frame = 0; frame < 6; frame++) state = stepCrtSignal(state, true, .05, false);
    const partial = recorder(); drawCrtSignal(partial.ctx, state);
    expect(partial.text).toHaveLength(1);
    expect(partial.text[0].text).toMatch(/[/|_+\-]/);
    expect(partial.text[0].text).toHaveLength(23);
    const same = recorder(); drawCrtSignal(same.ctx, state);
    expect(same.text).toEqual(partial.text);
    const cooling = stepCrtSignal(state, false, .05, false);
    const tail = recorder(); drawCrtSignal(tail.ctx, cooling);
    expect(tail.text).toEqual(partial.text);
    for (let frame = 0; frame < 26; frame++) state = stepCrtSignal(state, true, .05, false);
    const settled = recorder(); drawCrtSignal(settled.ctx, state);
    expect(settled.text.map(line => line.text)).toEqual([...JR_ASCII]);
    state = stepCrtSignal(state, true, 0, true);
    const blink = recorder(); drawCrtSignal(blink.ctx, { ...state, cursorVisible: false });
    expect(blink.text.at(-1)?.text).toBe('ENTER  ');
    const off = recorder(); drawCrtSignal(off.ctx, initialCrtSignal());
    expect(off.text).toEqual([]);
    expect(off.clears).toHaveLength(1);
  });
});
