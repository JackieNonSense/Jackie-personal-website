import type { Part, Track } from './types';

export type Hit = { step: number; midi: number; length: number };
export type Scheduled = { part: number; time: number; midi: number; duration: number };

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiOf(note: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`Bad note ${note}`);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** A part's pattern as note hits on a step grid, and its loop length in steps. */
export function parsePattern(pattern: string): { hits: Hit[]; length: number } {
  const hits: Hit[] = [];
  let step = 0;
  for (const token of pattern.trim().split(/\s+/)) {
    const [note, hold] = token.split('~');
    const length = hold ? Math.max(1, Number(hold)) : 1;
    if (note !== '.') hits.push({ step, midi: midiOf(note), length });
    step += length;
  }
  return { hits, length: Math.max(1, step) };
}

/** Every note that starts in [from, to), in seconds from the start of the track. */
export function eventsBetween(track: Track, parsed: ReturnType<typeof parsePattern>[], from: number, to: number): Scheduled[] {
  const stepTime = 60 / track.bpm / track.steps;
  const out: Scheduled[] = [];
  parsed.forEach(({ hits, length }, part) => {
    const loop = length * stepTime;
    const first = Math.floor(from / loop), last = Math.floor(to / loop);
    for (let n = first; n <= last; n++) for (const hit of hits) {
      const time = n * loop + hit.step * stepTime;
      if (time >= from && time < to) out.push({ part, time, midi: hit.midi, duration: hit.length * stepTime });
    }
  });
  return out.sort((a, b) => a.time - b.time);
}

export function parseTrack(track: Track) {
  return track.parts.map((p: Part) => parsePattern(p.pattern));
}
