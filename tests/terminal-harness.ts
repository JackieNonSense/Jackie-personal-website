import { readFileSync } from 'node:fs';
import { GLYPH_H, installWideFont } from '../components/terminal/crt/font';
import { TEXT_MODES, createGrid } from '../components/terminal/crt/grid';
import { Machine, type Key, type PointerKind, type PointerPhase, type Speaker } from '../components/terminal/system/machine';
import { FileSystem } from '../components/terminal/system/fs';
import { createStore, type Store } from '../components/terminal/system/storage';
import { disk, restoreDisk } from '../components/terminal/content/disk';
import { boot, resetSession, shell } from '../components/terminal/content/bbs';
import { desktop } from '../components/terminal/content/desktop';
import type { Desktop } from '../components/terminal/system/gui/desktop';
import type { Picture } from '../components/terminal/graphics/bitmap';
import type { Track } from '../components/terminal/audio/types';

/** Synthetic glyphs: every printable glyph is a solid block; space and the opaque blank are empty. */
export function vga(): Uint8Array {
  const bits = new Uint8Array(256 * GLYPH_H).fill(0xff);
  bits.fill(0, 32 * GLYPH_H, 33 * GLYPH_H);
  bits.fill(0, 255 * GLYPH_H, 256 * GLYPH_H);
  bits.fill(0, 0, GLYPH_H);
  return bits;
}

/** The real character ROM, installed as the page installs it before boot. */
const ROM = readFileSync('public/terminal/hzk16.bin');
export const romBuffer = () => ROM.buffer.slice(ROM.byteOffset, ROM.byteOffset + ROM.byteLength);
export const glyphs = () => installWideFont(romBuffer(), vga());

export type Harness = ReturnType<typeof harness>;

/**
 * A machine with a fake speaker and store, driven by keys. `picture` stands in for
 * every image the machine reads.
 */
export function harness(mode: keyof typeof TEXT_MODES = 'wide', store: Store = createStore(null), picture?: Picture) {
  resetSession();
  const { cols, rows } = TEXT_MODES[mode];
  const grid = createGrid(cols, rows);
  const sounds: string[] = [];
  const audio: Speaker & { current: Track | null; enabled: boolean } = {
    enabled: true,
    current: null,
    setEnabled(on) { this.enabled = on; },
    sfx(name) { if (name !== 'key') sounds.push(name); },
    music(track) { this.current = track; sounds.push(`music:${track?.id ?? 'none'}`); },
    hiss(on) { sounds.push(`hiss:${on}`); },
  };
  const said: string[] = [], opened: string[] = [], modes: string[] = [], themes: string[] = [];
  let exited = false;
  const m = new Machine(grid, audio, store, new FileSystem(disk()), {
    announce: line => said.push(line),
    exit: () => { exited = true; },
    openUrl: url => opened.push(url),
    inputMode: mode => modes.push(mode),
    loadPicture: async () => picture ?? { width: 8, height: 8, data: new Uint8Array(64).fill(255) },
    loadWideFont: async base => installWideFont(romBuffer(), base),
    theme: next => themes.push(next.id),
  });
  m.glyphs = glyphs();
  restoreDisk(m);
  const run = (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) m.tick(1 / 60); };
  const chord = (key: string, mods: Partial<Key> = {}) => { m.key({ key, ctrl: false, ...mods }); run(0.05); };
  const press = (key: string) => chord(key);
  const type = (s: string) => { for (const ch of s) m.key({ key: ch, ctrl: false }); press('Enter'); run(0.6); };
  /** Types into whatever has the keys, without ENTER. */
  const keys = (s: string) => { for (const ch of s) m.key({ key: ch, ctrl: false }); run(0.05); };
  // Opaque blanks (CP437 255) read as spaces. The pixel desk adds what it drew.
  const screen = () => m.describe().replace(/\u00a0/g, ' ');
  /** Boot all the way to the desk. */
  const toDesk = () => { m.push(boot()); run(40); };
  /** Straight to the desk, without booting. */
  const onDesk = () => { m.push(desktop()); run(0.05); };
  /** The DOS prompt over the pixel desk. */
  const dos = () => { m.push(desktop()); m.push(shell()); run(1); };
  /** Lets pictures and other promises settle. */
  const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); run(0.05); };

  // ── The pointer, in the desk's logical pixels ──
  const pointer = (phase: PointerPhase, x: number, y: number, o: { kind?: PointerKind; buttons?: number } = {}) => {
    m.pointer({
      phase, x: x * m.scale, y: y * m.scale, inside: true, kind: o.kind ?? 'mouse', id: 1, primary: true,
      button: 0, buttons: o.buttons ?? (phase === 'down' || phase === 'move' ? 1 : 0), shift: false, time: m.clock, pxPerCss: 1,
    });
  };
  const move = (x: number, y: number) => pointer('move', x, y, { buttons: 0 });
  const click = (x: number, y: number, o: { kind?: PointerKind } = {}) => { pointer('down', x, y, o); pointer('up', x, y, o); run(0.05); };
  const dblclick = (x: number, y: number) => { click(x, y); click(x, y); };
  const drag = (from: [number, number], to: [number, number], steps = 6) => {
    pointer('down', from[0], from[1]);
    for (let i = 1; i <= steps; i++) pointer('move', from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
    pointer('up', to[0], to[1]);
    run(0.05);
  };
  const wheel = (x: number, y: number, lines: number) => { m.wheel(lines, { x: x * m.scale, y: y * m.scale }); run(0.05); };
  /** The pixel desk, when it is on top. */
  const gui = () => m.top as Desktop;
  const centreOf = (r: { x: number; y: number; w: number; h: number } | null, what: string): [number, number] => {
    if (!r) throw new Error(`not on the screen: ${what}`);
    return [r.x + r.w / 2, r.y + r.h / 2];
  };
  /** Where a widget or desk icon with this id is. */
  const at = (id: string) => centreOf(gui().locate(id), id);
  /** Clicks on words as they show on the screen, inside the widget with the id `within` if given. */
  const clickText = (text: string, within?: string, o: { kind?: PointerKind } = {}) => click(...centreOf(gui().find(text, within), text), o);
  const dblclickText = (text: string, within?: string) => dblclick(...centreOf(gui().find(text, within), text));
  /** Straight to the pixel desk. */
  const onPixelDesk = () => { m.push(desktop()); run(0.05); };
  return {
    m, audio, sounds, said, opened, modes, themes, run, chord, press, type, keys, screen, toDesk, onDesk, dos, settle, store,
    pointer, move, click, dblclick, drag, wheel, gui, at, clickText, dblclickText, onPixelDesk,
    get exited() { return exited; },
  };
}
