import { describe, expect, it } from 'vitest';
import { decideKey, type KeyEventLike } from '../components/terminal/system/keys';
import { boot, lighthouse, pictureViewer } from '../components/terminal/content/bbs';
import { logOff } from '../components/terminal/content/ending';
import { TvApp } from '../components/terminal/system/apps/tv';
import { CHANNELS } from '../components/terminal/content/channels';
import type { App } from '../components/terminal/system/machine';
import { harness } from './terminal-harness';

const key = (key: string, o: Partial<KeyEventLike> = {}): KeyEventLike =>
  ({ key, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, isComposing: false, ...o });
const desk = { ctrlKeys: [], captureKeys: ['Tab'] };
const dos = { ctrlKeys: ['c'], captureKeys: ['Tab'] };

describe('keys the browser keeps', () => {
  it('never takes the function keys, and never CTRL or ALT combinations the program does not use', () => {
    for (const k of ['F1', 'F5', 'F11', 'F12']) expect(decideKey(key(k), desk)).toEqual({ send: null, prevent: false });
    expect(decideKey(key('r', { ctrlKey: true }), desk).send).toBeNull();
    expect(decideKey(key('c', { ctrlKey: true }), desk).send).toBeNull();
    expect(decideKey(key('ArrowLeft', { altKey: true }), desk).send).toBeNull();
    expect(decideKey(key('f', { metaKey: true }), desk).send).toBeNull();
    for (const k of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ContextMenu']) expect(decideKey(key(k), desk).send).toBeNull();
    expect(decideKey(key('a', { isComposing: true }), desk).send).toBeNull();
  });

  it('takes what types, what moves, and CTRL+C in DOS', () => {
    expect(decideKey(key('/'), desk)).toEqual({ send: { key: '/', ctrl: false, shift: false }, prevent: true });
    expect(decideKey(key('Enter'), desk).prevent).toBe(true);
    expect(decideKey(key('Backspace'), desk).prevent).toBe(true);
    expect(decideKey(key('c', { ctrlKey: true }), dos)).toEqual({ send: { key: 'c', ctrl: true }, prevent: true });
    // AltGr types a character.
    expect(decideKey(key('€', { ctrlKey: true, altKey: true }), desk).send).toEqual({ key: '€', ctrl: false });
    // TAB only where the program asked for it.
    expect(decideKey(key('Tab'), desk).send?.key).toBe('Tab');
    expect(decideKey(key('Tab'), { ctrlKeys: [], captureKeys: [] }).send).toBeNull();
  });
});

describe('full-screen programs and the pointer', () => {
  const photo = { width: 640, height: 400, data: new Uint8Array(640 * 400).fill(120) };

  it('turns pictures with a click on either half, and closes with the box', async () => {
    const h = harness('wide', undefined, photo);
    h.onPixelDesk();
    const viewer = pictureViewer(h.m, '/PHOTOS/DESK.PCX') as App;
    h.m.push(viewer);
    await h.settle();
    expect(h.screen()).toContain('DESK.PCX');
    h.click(500, 200);
    expect(h.screen()).toContain('EXPO_01.PCX');
    h.click(100, 200);
    expect(h.screen()).toContain('DESK.PCX');
    h.wheel(300, 200, 1);
    expect(h.screen()).toContain('EXPO_01.PCX');
    h.click(628, 9);
    expect(h.m.top).not.toBe(viewer);
  });

  it('turns the story on with a click, and back with the arrow in the corner', () => {
    const h = harness();
    h.onPixelDesk();
    h.m.push(lighthouse());
    h.run(0.1);
    expect(h.screen()).toContain('1/');
    for (let i = 0; i < 6; i++) h.click(300, 300);
    expect(h.screen()).not.toMatch(/ 1\/\d+ /);
    const page = /(\d+)\/\d+/.exec(h.screen())![1];
    h.click(12, 9);
    expect(/(\d+)\/\d+/.exec(h.screen())![1]).toBe(String(Number(page) - 1));
  });

  it("changes channel with the set's own buttons and switches off with the box", () => {
    const h = harness();
    h.onPixelDesk();
    const tv = new TvApp(CHANNELS);
    h.m.push(tv);
    h.run(1);
    h.move(300, 150);
    h.click(620, 190);
    h.run(1);
    expect(h.screen()).toContain('CH 03');
    h.wheel(300, 150, 1);
    h.run(1);
    expect(h.screen()).toContain('CH 04');
    h.click(628, 9);
    expect(h.m.top).not.toBe(tv);
  });

  it('takes a seed with the SUBMIT button', () => {
    const h = harness();
    h.onPixelDesk();
    h.m.mark('file:SYSTEM/SEED.LOG');
    logOff(h.m);
    h.run(12);
    h.keys('a seed');
    h.click(320, 356);
    h.run(12);
    expect(h.screen()).toMatch(/JR-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/);
    expect(h.m.has('seeded')).toBe(true);
  });

  it('skips the boot a stage at a click', () => {
    const h = harness();
    h.m.push(boot());
    h.run(0.1);
    for (let i = 0; i < 8; i++) h.click(300, 200);
    h.run(0.5);
    expect(h.screen()).toContain('Messages');
  });
});
