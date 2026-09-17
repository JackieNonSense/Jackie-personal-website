import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function display() {
  const path = resolve('components/terminal/echo-display.ts');
  expect(existsSync(path), 'The shared interactive CRT layout exists').toBe(true);
  return import(/* @vite-ignore */ path);
}
describe('ECHO screen layout', () => {
  it('wraps prose without losing words while keeping long identifiers within bounds', async () => {
    const { wrapText } = await display();
    const words = 'The last local record is intact. Follow the signed hardware trace.';
    const lines = wrapText(words, 20);
    expect(lines.every((line: string) => line.length <= 20)).toBe(true);
    expect(lines.join(' ')).toBe(words);
    expect(wrapText('ABCDEFGHIJKLMNOPQRSTUV', 8)).toEqual(['ABCDEFGH', 'IJKLMNOP', 'QRSTUV']);
  });
  it('maps only enabled controls and leaves empty screen space inert', async () => {
    const { hitControl } = await display();
    const controls = [{ id:'a', label:'OPEN', rect:{x:10,y:20,w:100,h:40}, action:{type:'command-focus'} },{id:'b',label:'LOCKED',rect:{x:150,y:20,w:100,h:40},disabled:true,action:{type:'command-focus'}}];
    expect(hitControl(controls, 50, 35)?.id).toBe('a');
    expect(hitControl(controls, 180, 35)).toBeUndefined();
    expect(hitControl(controls, 500, 500)).toBeUndefined();
  });
});
