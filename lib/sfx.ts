"use client";

// WebAudio-synthesized interaction SFX. No audio assets.
// Context is created lazily on first user gesture (autoplay-safe).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lastHover = 0;

const MUTE_KEY = "jr-muted";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    // ignore
  }
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.15;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function env(node: GainNode, t0: number, peak: number, decay: number) {
  node.gain.setValueAtTime(0, t0);
  node.gain.linearRampToValueAtTime(peak, t0 + 0.005);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
}

function osc(
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  peak = 1
) {
  const c = ensureCtx();
  if (!c || !master || isMuted()) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t = c.currentTime;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  env(g, t, peak, dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBuf(c: AudioContext, dur: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(
  dur: number,
  filterType: BiquadFilterType,
  f0: number,
  f1: number,
  peak = 0.8
) {
  const c = ensureCtx();
  if (!c || !master || isMuted()) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c, dur);
  const filt = c.createBiquadFilter();
  filt.type = filterType;
  const t = c.currentTime;
  filt.frequency.setValueAtTime(f0, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  const g = c.createGain();
  env(g, t, peak, dur);
  src.connect(filt).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  click() {
    osc("square", 1800, 1200, 0.04, 0.5);
  },
  hover() {
    const now = performance.now();
    if (now - lastHover < 120) return;
    lastHover = now;
    osc("sine", 2400, 2400, 0.02, 0.12);
  },
  paper() {
    noise(0.12, "bandpass", 3000, 2400, 0.5);
  },
  drawer() {
    noise(0.3, "lowpass", 200, 600, 0.7);
  },
  lampOn() {
    osc("triangle", 900, 900, 0.03, 0.6);
  },
  lampOff() {
    osc("triangle", 500, 500, 0.03, 0.6);
  },
  bootChime() {
    const c = ensureCtx();
    if (!c) return;
    osc("triangle", 523, 523, 0.12, 0.5);
    setTimeout(() => osc("triangle", 784, 784, 0.18, 0.5), 90);
    noise(0.25, "lowpass", 400, 120, 0.25);
  },
  windowOpen() {
    osc("square", 600, 900, 0.08, 0.3);
  },
  windowClose() {
    osc("square", 900, 500, 0.08, 0.3);
  },
};
