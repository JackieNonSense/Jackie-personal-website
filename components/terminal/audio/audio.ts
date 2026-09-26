import { eventsBetween, frequency, parseTrack } from './sequencer';
import type { Sfx, Track, Voice } from './types';
import type { Speaker } from '../system/machine';

/**
 * The machine's sound, all synthesised here; nothing is loaded.
 *
 * Two paths. What comes out of a speaker (the POST beep, the games' music, the
 * television) goes through a chain that stands in for a small cheap cone: no deep
 * bass, no air, a little grit. What the hardware does by itself (the switch, the
 * degaussing coil, the disk, the fan, the keys) is heard directly, in a small dark
 * room: a short, dull reverberation and nothing else.
 *
 * Browsers only allow audio after a gesture, so the context is created in unlock(),
 * which the page calls from its first key press or tap.
 */
const LOOKAHEAD = 0.2;
/** The disk motor's running speed, as the pitch of its whine. */
const SPINDLE = 90;

export class AudioSystem implements Speaker {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  /** The room: hardware sounds, heard directly with a little reverberation. */
  private room: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
  private hissNode: { nodes: AudioScheduledSourceNode[]; gain: GainNode } | null = null;
  /** The disk motor and the fan, running while the machine is on. */
  private motor: { osc: OscillatorNode; shape: BiquadFilterNode; gain: GainNode; fan: AudioBufferSourceNode; fanGain: GainNode } | null = null;
  /** Until when the disk heads are already busy, so overlapping reads queue up. */
  private seekingUntil = 0;
  private song: { track: Track; parsed: ReturnType<typeof parseTrack>; start: number; scheduled: number; gain: GainNode } | null = null;
  private timer = 0;
  private wanted: Track | null = null;

  constructor(public enabled = true) {}

  get current(): Track | null { return this.wanted; }

  unlock(): void {
    if (!this.ctx) {
      try { this.build(new AudioContext()); } catch { return; }
      if (this.wanted) this.music(this.wanted);
    }
    void this.ctx?.resume();
  }

  private build(ctx: AudioContext): void {
    this.ctx = ctx;
    const out = ctx.createGain();
    out.gain.value = this.enabled ? 0.55 : 0;
    // The speaker: a small cone in a plastic cabinet.
    const low = ctx.createBiquadFilter(); low.type = 'highpass'; low.frequency.value = 150;
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 1800; body.gain.value = 3; body.Q.value = 0.8;
    const high = ctx.createBiquadFilter(); high.type = 'lowpass'; high.frequency.value = 5200;
    const grit = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    grit.curve = curve;
    const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -14; limit.ratio.value = 4;
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.7;
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9;
    this.musicBus.connect(low); this.sfxBus.connect(low);
    low.connect(body).connect(high).connect(grit).connect(limit);
    // The room: dry, plus a short dull tail from walls close by.
    this.room = ctx.createGain();
    const soften = ctx.createBiquadFilter(); soften.type = 'lowpass'; soften.frequency.value = 9000;
    const verb = ctx.createConvolver(); verb.buffer = roomResponse(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    this.room.connect(soften);
    soften.connect(limit);
    soften.connect(verb).connect(wet).connect(limit);
    limit.connect(out).connect(ctx.destination);
    this.out = out;
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = noise;
    // Brown noise, for moving air: the fan.
    const brown = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const bd = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
    this.brown = brown;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.ctx && this.out) this.out.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }

  // ── Music ────────────────────────────────────────────────────────────────────

  music(track: Track | null): void {
    this.wanted = track;
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    if (this.song && track && this.song.track.id === track.id) return;
    if (this.song) {
      const old = this.song.gain;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      setTimeout(() => old.disconnect(), 2500);
      this.song = null;
    }
    window.clearInterval(this.timer);
    if (!track) return;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
    gain.connect(this.musicBus);
    this.song = { track, parsed: parseTrack(track), start: ctx.currentTime + 0.1, scheduled: 0, gain };
    const pump = () => {
      const song = this.song;
      if (!song || !this.ctx) return;
      const until = this.ctx.currentTime - song.start + LOOKAHEAD;
      for (const e of eventsBetween(song.track, song.parsed, song.scheduled, until)) {
        const part = song.track.parts[e.part];
        this.voice(part.voice, song.start + e.time, e.duration, e.midi, part.volume, song.gain);
      }
      song.scheduled = until;
    };
    pump();
    this.timer = window.setInterval(pump, 50);
  }

  private voice(voice: Voice, at: number, duration: number, midi: number, volume: number, dest: AudioNode): void {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.connect(dest);
    const f = frequency(midi);
    const osc = (type: OscillatorType, freq: number, detune = 0) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune; return o;
    };
    const shape = (attack: number, hold: number, release: number, peak = volume) => {
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(peak, at + attack);
      env.gain.setTargetAtTime(0, at + Math.max(attack, hold), release / 3);
      return at + Math.max(attack, hold) + release;
    };
    const play = (sources: AudioScheduledSourceNode[], end: number, into: AudioNode = env) => {
      for (const s of sources) { s.connect(into); s.start(at); s.stop(end); }
    };
    switch (voice) {
      case 'pad': {
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900; filter.connect(env);
        const end = shape(Math.min(0.8, duration * 0.4), duration, 1.2);
        play([osc('sawtooth', f, -7), osc('sawtooth', f, 7)], end, filter);
        break;
      }
      case 'lead': {
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2600; filter.connect(env);
        play([osc('square', f)], shape(0.01, duration * 0.8, 0.12), filter);
        break;
      }
      case 'arp': play([osc('square', f)], shape(0.004, 0.03, 0.09)); break;
      case 'bass': play([osc('triangle', f)], shape(0.01, duration * 0.9, 0.1)); break;
      case 'bell': {
        const end = shape(0.004, 0.02, 2.4);
        const partial = ctx.createGain(); partial.gain.value = 0.35; partial.connect(env);
        play([osc('sine', f)], end); play([osc('sine', f * 2.76)], end, partial);
        break;
      }
      case 'hat': {
        const src = ctx.createBufferSource(); src.buffer = this.noise;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500; hp.connect(env);
        play([src], shape(0.002, 0.01, 0.05), hp);
        break;
      }
      case 'kick': {
        const o = osc('sine', 110);
        o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(45, at + 0.14);
        play([o], shape(0.003, 0.02, 0.22));
        break;
      }
    }
  }

  // ── Effects ──────────────────────────────────────────────────────────────────

  sfx(name: Sfx, detail = ''): void {
    const ctx = this.ctx;
    if (!ctx || !this.room || !this.sfxBus) return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'power-on': this.powerOn(t); break;
      case 'power-off': this.powerOff(t); break;
      case 'beep': this.beep(t); break;
      case 'key': this.key(t, detail); break;
      case 'disk':
        if (detail === 'retry') this.retry(t);
        else this.seek(t, Math.max(0.05, Number(detail) || 0.25));
        break;
      case 'tune': this.tune(t); break;
      case 'catch': this.blip(t); break;
      case 'button': this.push(t); break;
      case 'laser': this.laser(t); break;
      case 'boom': this.boom(t, detail === 'hit'); break;
      case 'stage': this.jingle(t); break;
      case 'degauss': this.degauss(t + 0.06, 0.8); break;
    }
  }

  /** A burst of filtered noise with a fast attack and an exponential fall. */
  private tick(at: number, dest: AudioNode, level: number, decay: number, filter: BiquadFilterType, freq: number, q = 1): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise;
    f.type = filter; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(level, at + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay * 5);
    src.connect(f).connect(g).connect(dest);
    src.start(at, Math.random() * 1.5); src.stop(at + decay * 5 + 0.02);
  }

  /** A pitched body: a sine that drops in pitch as it dies, the thump in a click. */
  private thump(at: number, dest: AudioNode, level: number, from: number, to: number, decay: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + decay * 2);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(level, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay * 5);
    o.connect(g).connect(dest); o.start(at); o.stop(at + decay * 5 + 0.02);
  }

  /** The rocker switch on the front: a hard plastic clack and its bounce, no boom under it. */
  private clack(at: number, level: number): void {
    const room = this.room!;
    this.tick(at, room, level, 0.005, 'bandpass', 2900, 1.3);
    this.thump(at, room, level * 0.35, 420, 260, 0.012);
    this.tick(at + 0.026, room, level * 0.3, 0.003, 'bandpass', 3600, 1.8);
  }

  private powerOn(t: number): void {
    this.clack(t, 0.4);
    this.degauss(t + 0.1, 1);
    this.spinUp(t + 0.3);
    // The BIOS reads the disk once it is up to speed.
    this.seek(t + 2.4, 0.5);
  }

  /**
   * The degaussing coil, as heard from a chair away: the relay clunks, the cabinet
   * hums for a moment, not a boom, just the mask buzzing in the mid range, and the
   * glass crackles as it takes its charge.
   */
  private degauss(at: number, level: number): void {
    const ctx = this.ctx!, room = this.room!;
    // The relay.
    this.tick(at, room, 0.07 * level, 0.003, 'bandpass', 1900, 1.5);
    this.thump(at, room, 0.03 * level, 320, 200, 0.01);
    // The hum: mains harmonics only, the fundamental left out, and quick to go.
    const hum = ctx.createGain(), hp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 170; hp.Q.value = 0.7;
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(600, at + 0.02); bp.frequency.exponentialRampToValueAtTime(260, at + 0.7);
    hum.gain.setValueAtTime(0.0001, at + 0.02);
    hum.gain.exponentialRampToValueAtTime(0.075 * level, at + 0.06);
    hum.gain.exponentialRampToValueAtTime(0.0001, at + 0.75);
    hp.connect(bp).connect(hum).connect(room);
    for (const [type, freq, gain] of [['sawtooth', 100, 0.5], ['triangle', 200, 0.6], ['sine', 300, 0.25]] as const) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = gain;
      o.connect(g).connect(hp); o.start(at + 0.02); o.stop(at + 0.8);
    }
    // The shadow mask ringing, faintly, as the field lets go.
    this.tick(at + 0.05, room, 0.02 * level, 0.12, 'bandpass', 900, 10);
    // The glass taking its charge: a soft fizz, and a few dry crackles in it.
    const fizz = ctx.createBufferSource(), fhp = ctx.createBiquadFilter(), fg = ctx.createGain();
    fizz.buffer = this.noise;
    fhp.type = 'highpass'; fhp.frequency.value = 4500;
    fg.gain.setValueAtTime(0.0001, at + 0.05);
    fg.gain.exponentialRampToValueAtTime(0.012 * level, at + 0.25);
    fg.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
    fizz.connect(fhp).connect(fg).connect(room); fizz.start(at + 0.05, Math.random()); fizz.stop(at + 0.95);
    for (let i = 0; i < 6; i++) this.tick(at + 0.15 + Math.random() * 0.8, room, (0.025 + Math.random() * 0.03) * level, 0.0015, 'highpass', 5000);
  }

  /** A push button under the screen: a plastic click, the spring, and the latch. */
  private push(t: number): void {
    const room = this.room!;
    this.tick(t, room, 0.2, 0.004, 'bandpass', 2500, 1.4);
    this.thump(t, room, 0.11, 240, 130, 0.016);
    this.tick(t + 0.042, room, 0.1, 0.003, 'bandpass', 3300, 1.8);
  }

  /** The hard disk spinning up and the fan starting, then running quietly until switched off. */
  private spinUp(at: number): void {
    const ctx = this.ctx!, room = this.room!;
    this.stopMotor(at, 0.01);
    const osc = ctx.createOscillator(), shape = ctx.createBiquadFilter(), gain = ctx.createGain();
    // The motor's whine: its harmonics, rising with it, heard through the case.
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(12, at); osc.frequency.exponentialRampToValueAtTime(SPINDLE, at + 3.2);
    shape.type = 'bandpass'; shape.Q.value = 3;
    shape.frequency.setValueAtTime(12 * 6, at); shape.frequency.exponentialRampToValueAtTime(SPINDLE * 6, at + 3.2);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.02, at + 2.4);
    // Then it settles to what you only hear when the room is quiet.
    gain.gain.exponentialRampToValueAtTime(0.004, at + 5);
    osc.connect(shape).connect(gain).connect(room); osc.start(at);
    const fan = ctx.createBufferSource(), fanFilter = ctx.createBiquadFilter(), fanGain = ctx.createGain();
    fan.buffer = this.brown; fan.loop = true;
    fanFilter.type = 'lowpass'; fanFilter.frequency.value = 700;
    // No rumble below it: small speakers only turn that into a boom.
    const fanFloor = ctx.createBiquadFilter(); fanFloor.type = 'highpass'; fanFloor.frequency.value = 140;
    fanGain.gain.setValueAtTime(0.0001, at);
    fanGain.gain.exponentialRampToValueAtTime(0.03, at + 1.2);
    fanGain.gain.exponentialRampToValueAtTime(0.012, at + 4);
    fan.connect(fanFloor).connect(fanFilter).connect(fanGain).connect(room); fan.start(at);
    this.motor = { osc, shape, gain, fan, fanGain };
  }

  private stopMotor(at: number, over: number): void {
    const m = this.motor;
    if (!m) return;
    m.osc.frequency.cancelScheduledValues(at);
    m.osc.frequency.setValueAtTime(SPINDLE, at);
    m.osc.frequency.exponentialRampToValueAtTime(8, at + over);
    m.shape.frequency.cancelScheduledValues(at);
    m.shape.frequency.setValueAtTime(SPINDLE * 6, at);
    m.shape.frequency.exponentialRampToValueAtTime(48, at + over);
    m.gain.gain.cancelScheduledValues(at);
    m.gain.gain.setTargetAtTime(0.0001, at, over / 3);
    m.fanGain.gain.cancelScheduledValues(at);
    m.fanGain.gain.setTargetAtTime(0.0001, at, over / 4);
    m.osc.stop(at + over + 0.1); m.fan.stop(at + over + 0.1);
    this.motor = null;
  }

  private powerOff(t: number): void {
    const room = this.room!;
    this.clack(t, 0.4);
    // The picture collapsing: a thin falling whistle and a snap of static off the glass.
    this.thump(t + 0.02, room, 0.035, 2200, 180, 0.12);
    for (let i = 0; i < 5; i++) this.tick(t + 0.05 + Math.random() * 0.4, room, 0.04, 0.002, 'highpass', 5500);
    this.stopMotor(t + 0.1, 2.6);
  }

  /** The POST beep: the PC speaker, a square wave through a tiny paper cone. */
  private beep(t: number): void {
    const ctx = this.ctx!, bus = this.sfxBus!;
    const o = ctx.createOscillator(), g = ctx.createGain(), cone = ctx.createBiquadFilter();
    o.type = 'square'; o.frequency.value = 896;
    cone.type = 'bandpass'; cone.frequency.value = 1800; cone.Q.value = 0.9;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.055, t + 0.002);
    g.gain.setValueAtTime(0.055, t + 0.11); g.gain.linearRampToValueAtTime(0, t + 0.115);
    o.connect(cone).connect(g).connect(bus); o.start(t); o.stop(t + 0.13);
  }

  /** A key going down and bottoming out. No two sound quite the same. */
  private key(t: number, kind: string): void {
    const room = this.room!, r = Math.random();
    if (kind === 'space' || kind === 'enter') {
      // The long keys: a deeper thock, and the stabiliser wire rattling behind it.
      this.tick(t, room, 0.08, 0.004, 'bandpass', 1500 + r * 300, 1.2);
      this.thump(t, room, 0.1, 120 + r * 20, 80, 0.03);
      this.tick(t + 0.009, room, 0.035, 0.003, 'bandpass', 2600, 2);
      this.tick(t + 0.018, room, 0.02, 0.003, 'bandpass', 3100, 2);
      return;
    }
    this.tick(t, room, 0.06 + r * 0.025, 0.003, 'bandpass', 2300 + r * 1400, 1.8);
    this.thump(t, room, 0.05, 190 + r * 50, 130, 0.018);
    this.tick(t + 0.012 + r * 0.008, room, 0.025, 0.002, 'bandpass', 3800, 2);
  }

  /** The disk heads moving: quick dry ticks with a small knock of the arm behind each. */
  private seek(t: number, seconds: number): void {
    const room = this.room!;
    let at = Math.max(t, this.seekingUntil);
    const end = at + seconds;
    while (at < end) {
      const r = Math.random();
      this.tick(at, room, 0.07 + r * 0.05, 0.0018, 'bandpass', 3000 + r * 1800, 2.5);
      this.thump(at, room, 0.03 + r * 0.02, 420 + r * 200, 260, 0.006);
      at += 0.018 + Math.random() * (Math.random() < 0.25 ? 0.12 : 0.045);
    }
    this.seekingUntil = end;
  }

  /** A bad sector: the heads going back to the same place, over and over. */
  private retry(t: number): void {
    const room = this.room!;
    let at = Math.max(t, this.seekingUntil);
    for (let i = 0; i < 9; i++) {
      this.tick(at, room, 0.11, 0.002, 'bandpass', 2600, 2);
      this.thump(at, room, 0.06, 300, 200, 0.012);
      this.tick(at + 0.07, room, 0.08, 0.002, 'bandpass', 3400, 2);
      at += 0.17;
    }
    this.seekingUntil = at;
  }

  /** The television's channel knob: a detent clunk, then the set's speaker crackles. */
  private tune(t: number): void {
    const room = this.room!;
    this.tick(t, room, 0.12, 0.004, 'bandpass', 1400, 1.4);
    this.thump(t, room, 0.08, 200, 110, 0.02);
    this.tick(t + 0.03, this.sfxBus!, 0.12, 0.03, 'bandpass', 2600, 0.6);
  }

  /** Something caught, in a game: a short rising blip from the speaker. */
  private blip(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(990, t + 0.03);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(this.sfxBus!); o.start(t); o.stop(t + 0.1);
  }

  /** A shot, in a game: a square wave falling fast. */
  private laser(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.09);
    g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(this.sfxBus!); o.start(t); o.stop(t + 0.11);
  }

  /** Something blown apart: a burst of low noise; the ship's own is longer and louder. */
  private boom(t: number, big: boolean): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise;
    f.type = 'lowpass'; f.frequency.setValueAtTime(big ? 1400 : 900, t); f.frequency.exponentialRampToValueAtTime(90, t + (big ? 0.7 : 0.35));
    g.gain.setValueAtTime(big ? 0.22 : 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.8 : 0.4));
    src.connect(f).connect(g).connect(this.sfxBus!); src.start(t, Math.random()); src.stop(t + 0.85);
  }

  /** A stage cleared: three notes up. */
  private jingle(t: number): void {
    const ctx = this.ctx!;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), at = t + i * 0.09;
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.04, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      o.connect(g).connect(this.sfxBus!); o.start(at); o.stop(at + 0.18);
    });
  }

  /** Off-air noise for the television: hiss, and the mains buzz of the set under it. */
  hiss(on: boolean): void {
    const ctx = this.ctx, bus = this.sfxBus;
    if (!ctx || !bus) return;
    if (on && !this.hissNode) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.setTargetAtTime(0.13, ctx.currentTime, 0.03);
      gain.connect(bus);
      const source = ctx.createBufferSource(), band = ctx.createBiquadFilter();
      source.buffer = this.noise; source.loop = true;
      band.type = 'bandpass'; band.frequency.value = 2800; band.Q.value = 0.45;
      source.connect(band).connect(gain); source.start();
      const hum = ctx.createOscillator(), humFilter = ctx.createBiquadFilter(), humGain = ctx.createGain();
      hum.type = 'sawtooth'; hum.frequency.value = 60;
      humFilter.type = 'lowpass'; humFilter.frequency.value = 500; humGain.gain.value = 0.25;
      hum.connect(humFilter).connect(humGain).connect(gain); hum.start();
      this.hissNode = { nodes: [source, hum], gain };
    } else if (!on && this.hissNode) {
      const { nodes, gain } = this.hissNode;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      for (const n of nodes) n.stop(ctx.currentTime + 0.3);
      this.hissNode = null;
    }
  }

  dispose(): void {
    window.clearInterval(this.timer);
    void this.ctx?.close();
    this.ctx = null;
  }
}

/** A small dark room: a quick dull tail, gone in about half a second. */
function roomResponse(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    let low = 0;
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      // Duller as it goes: each reflection loses its highs to the walls.
      low += (Math.random() * 2 - 1 - low) * (0.5 * Math.exp(-t * 8) + 0.05);
      d[i] = i < ctx.sampleRate * 0.004 ? 0 : low * Math.exp(-t / 0.09);
    }
  }
  return buffer;
}
