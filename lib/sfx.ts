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

// ── continuous scrub bed (radio-static noise, velocity-driven) ──
let scrubNodes: {
  gain: GainNode;
  filter: BiquadFilterNode;
  rumble: OscillatorNode;
  rumbleGain: GainNode;
} | null = null;

function ensureScrubBed() {
  const c = ensureCtx();
  if (!c || !master) return null;
  if (scrubNodes) return scrubNodes;
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c, 2);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.value = 800;
  const gain = c.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(master);
  src.start();
  const rumble = c.createOscillator();
  rumble.type = "sine";
  rumble.frequency.value = 55;
  const rumbleGain = c.createGain();
  rumbleGain.gain.value = 0;
  rumble.connect(rumbleGain).connect(master);
  rumble.start();
  scrubNodes = { gain, filter, rumble, rumbleGain };
  return scrubNodes;
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

  /** velocity-driven radio-static while scrubbing the signal */
  scrubUpdate(vel: number) {
    if (isMuted()) return;
    const nodes = ensureScrubBed();
    const c = ctx;
    if (!nodes || !c) return;
    const v = Math.min(Math.abs(vel), 40) / 40;
    const t = c.currentTime;
    nodes.filter.frequency.setTargetAtTime(300 + v * 2500, t, 0.04);
    nodes.gain.gain.setTargetAtTime(v * 0.22, t, 0.05);
    nodes.rumble.frequency.setTargetAtTime(55 + v * 120, t, 0.05);
    nodes.rumbleGain.gain.setTargetAtTime(v * 0.05, t, 0.05);
  },
  scrubEnd() {
    const c = ctx;
    if (!scrubNodes || !c) return;
    const t = c.currentTime;
    scrubNodes.gain.gain.setTargetAtTime(0, t, 0.12);
    scrubNodes.rumbleGain.gain.setTargetAtTime(0, t, 0.12);
  },
  /** short fiber-crackle burst while tearing; intensity 0..1 */
  tearGrain(i: number) {
    noise(0.08 + Math.random() * 0.06, "bandpass", 2400, 1400, 0.25 + Math.min(i, 1) * 0.45);
  },
  /** the full rip-open whoosh */
  tearOpen() {
    noise(0.5, "lowpass", 2200, 180, 0.5);
    osc("sawtooth", 220, 50, 0.5, 0.35);
  },
  snapClose() {
    noise(0.12, "bandpass", 3000, 2400, 0.5);
    osc("triangle", 700, 400, 0.09, 0.4);
  },
};
