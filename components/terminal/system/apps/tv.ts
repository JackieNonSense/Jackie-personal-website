import { ATTR, clearGrid } from '../../crt/grid';
import { statusBar, strWidth, text } from '../screen';
import { ButtonTracker, closeBox, drawButtons, type OverlayButton } from '../gui/overlay';
import { GLYPH } from '../gui/icons';
import type { Display } from '../display';
import type { Gfx } from '../gui/gfx';
import type { Text } from '../i18n';
import type { Track } from '../../audio/types';
import type { App, Key, Machine, Pointer, Speaker } from '../machine';

/**
 * A channel draws a frame, into the text page or the graphics page. A number with
 * no channel is empty air: static and hiss.
 */
export type Channel = {
  number: number;
  name: Text;
  /** Called every frame while tuned in; `time` counts from when the channel came up. */
  draw(d: Display, time: number): void;
  /** Called once when tuned in, before the first draw. */
  enter?(d: Display): void;
  /** Whether the set hisses at `time` into the channel, as over empty air (default: never). */
  hiss?(time: number): boolean;
};

const FIRST = 2, LAST = 13;
/** Static shown between channels, as the tuner hunts. */
const TUNING = 0.35;
export const OSD_TIME = 2.2;

/**
 * The set itself: which channel, how long it has been on, and the static while it
 * hunts. The same set shows in a window on the desk and fills the screen.
 */
export class Tuner {
  number: number;
  time = 0;
  tuning = 0;
  /** Seconds the set's own display stays up. */
  osd = 0;
  digits = '';
  private digitTimer = 0;
  /** Whether the hiss is on, as the speaker last heard. */
  hissing = false;

  constructor(readonly channels: Channel[], start = FIRST) { this.number = start; }

  get channel(): Channel | undefined { return this.channels.find(c => c.number === this.number); }

  /** "CH 04", or the digits being keyed in. */
  get label(): string { return this.digits ? `CH ${this.digits.padEnd(2, '-')}` : `CH ${String(this.number).padStart(2, '0')}`; }

  tune(d: Display, speaker: Speaker, n: number, say?: (line: string) => void): void {
    this.number = ((n - FIRST + (LAST - FIRST + 1)) % (LAST - FIRST + 1)) + FIRST;
    this.time = 0;
    this.tuning = TUNING;
    this.osd = OSD_TIME;
    d.setMode('static');
    speaker.sfx('tune');
    this.sound(speaker, true);
    const c = this.channel;
    say?.(d.t({ en: `Channel ${this.number}`, zh: `${this.number} 频道` }) + (c ? `, ${d.t(c.name)}` : d.t({ en: ', no signal', zh: '，无信号' })));
  }

  /** A digit keyed in: two make a channel, or one on its own after a moment. */
  digit(d: Display, speaker: Speaker, key: string, say?: (line: string) => void): void {
    this.digits += key;
    this.digitTimer = 1.1;
    if (this.digits.length === 2) this.commit(d, speaker, say);
  }

  private commit(d: Display, speaker: Speaker, say?: (line: string) => void): void {
    const n = Number(this.digits);
    this.digits = '';
    if (n >= FIRST && n <= LAST) this.tune(d, speaker, n, say);
    else this.osd = OSD_TIME;
  }

  sound(speaker: Speaker, on: boolean): void {
    if (on === this.hissing) return;
    this.hissing = on;
    speaker.hiss(on);
  }

  tick(d: Display, speaker: Speaker, dt: number, say?: (line: string) => void): void {
    if (this.digits) { this.digitTimer -= dt; if (this.digitTimer <= 0) this.commit(d, speaker, say); }
    const c = this.channel;
    if (this.tuning > 0) {
      this.tuning -= dt;
      if (this.tuning <= 0 && c) { d.setMode('text'); clearGrid(d.grid); c.enter?.(d); }
    }
    // Empty air hisses; a channel is quiet, unless it is mostly snow itself.
    this.sound(speaker, this.tuning > 0 || !c || Boolean(c.hiss?.(this.time)));
    // The text page is redrawn from scratch each frame, so the set's display leaves no trace.
    clearGrid(d.grid);
    if (this.tuning <= 0 && c) { this.time += dt; c.draw(d, this.time); }
    this.osd = Math.max(0, this.osd - dt);
  }
}

/** The television, filling the screen. */
export class TvApp implements App {
  readonly tuner: Tuner;
  private previousMusic: Track | null = null;
  private readonly buttons = new ButtonTracker();

  constructor(channels: Channel[] | Tuner, start = FIRST) {
    this.tuner = Array.isArray(channels) ? new Tuner(channels, start) : channels;
  }

  /** The set's buttons come up with its display: channel down, channel up, and off. */
  private controls(m: Machine): OverlayButton[] {
    if (this.tuner.osd <= 0) return [];
    const width = 640 / m.scale, y = 200 / m.scale - 10;
    return [
      closeBox(width),
      { id: 'down', rect: { x: 4, y, w: 26, h: 20 }, glyph: GLYPH.left },
      { id: 'up', rect: { x: width - 30, y, w: 26, h: 20 }, glyph: GLYPH.right },
    ];
  }

  overlay(m: Machine, g: Gfx): void { drawButtons(g, m, this.controls(m), this.buttons.hover, this.buttons.down); }

  pointer(m: Machine, p: Pointer): void {
    // Moving over the set wakes its display, and its buttons with it.
    if (this.tuner.osd <= 0) m.redraw();
    this.tuner.osd = OSD_TIME;
    this.buttons.pointer(m, p, this.controls(m), id => {
      if (id === 'close') m.pop();
      else this.tune(m, this.tuner.number + (id === 'up' ? 1 : -1));
    });
  }

  wheel(m: Machine, lines: number): void { this.tune(m, this.tuner.number + Math.sign(lines)); }

  show(m: Machine): void {
    // The set's own sound replaces the room's music while it is on.
    this.previousMusic = m.audio.current;
    m.audio.music(null);
    this.tune(m, this.tuner.number);
  }

  hide(m: Machine): void { this.tuner.sound(m.audio, false); m.audio.music(this.previousMusic); }

  private tune(m: Machine, n: number): void { this.tuner.tune(m, m.audio, n, line => m.announce(line)); }

  tick(m: Machine, dt: number): void {
    const had = this.tuner.osd > 0;
    this.tuner.tick(m, m.audio, dt, line => m.announce(line));
    if (had && this.tuner.osd <= 0) m.redraw();
    this.status(m);
  }

  /** The set's own on-screen display, over whatever the channel shows. */
  private status(m: Machine): void {
    const g = m.grid, t = this.tuner;
    if (t.osd > 0 || t.digits) {
      text(g, g.cols - t.label.length - 2, 1, t.label, ATTR.bright);
      if (t.osd > 0 && !t.digits) {
        const name = m.t(t.channel?.name ?? '');
        if (name) text(g, g.cols - strWidth(name) - 2, 2, name, ATTR.dim);
      }
    }
    if (t.osd > 0) statusBar(g, m.t(m.narrow ? { en: 'The arrows change channel', zh: '点箭头换台' } : { en: 'The arrows (or ←→) change channel  ·  0-9 tune directly', zh: '点箭头（或 ←→）换台  ·  0-9 直接选台' }));
  }

  key(m: Machine, { key, ctrl }: Key): void {
    if (ctrl) return;
    if (key === 'Escape' || key === 'Backspace' || key === 'q' || key === 'Q') { m.pop(); return; }
    if (['ArrowRight', 'ArrowUp', '.', '>', '+', '=', 'd', 'D'].includes(key)) { this.tune(m, this.tuner.number + 1); return; }
    if (['ArrowLeft', 'ArrowDown', ',', '<', '-', 'a', 'A'].includes(key)) { this.tune(m, this.tuner.number - 1); return; }
    if (/^\d$/.test(key)) { this.tuner.digit(m, m.audio, key, line => m.announce(line)); return; }
    this.tuner.osd = OSD_TIME;
  }
}
