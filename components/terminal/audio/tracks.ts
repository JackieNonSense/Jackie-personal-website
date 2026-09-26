import type { Track } from './types';

/*
 * PLACEHOLDER MUSIC. Written only to prove the sound system; replace with the real
 * themes. A part is a row of notes: `A3` a note, `A3~8` held 8 steps, `.` a rest.
 */

const bar = (notes: string, steps = 16) => `${notes}~${steps}`;
/** Sixteenth-note arpeggio over a chord, in a fixed up-and-down figure. */
function arpeggio(chord: string[], order = [0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 1, 0, 2]): string {
  return order.map(i => chord[i % chord.length]).join(' ');
}

/** Slow, minor, a room with the lights off. Am, F, C, Em. Not used yet: for a scene that needs it. */
export const THEME: Track = {
  id: 'theme',
  bpm: 68,
  steps: 4,
  parts: [
    { voice: 'bass', volume: 0.22, pattern: ['A1', 'F1', 'C2', 'E1'].map(n => bar(n)).join(' ') },
    { voice: 'pad', volume: 0.05, pattern: ['E3', 'C3', 'E3', 'B2'].map(n => bar(n)).join(' ') },
    { voice: 'pad', volume: 0.05, pattern: ['A3', 'A3', 'G3', 'G3'].map(n => bar(n)).join(' ') },
    { voice: 'pad', volume: 0.04, pattern: ['C4', 'F3', 'C4', 'E3'].map(n => bar(n)).join(' ') },
    { voice: 'arp', volume: 0.028, pattern: [
      arpeggio(['A4', 'C5', 'E5', 'A5']), arpeggio(['F4', 'A4', 'C5', 'F5']),
      arpeggio(['C4', 'E4', 'G4', 'C5']), arpeggio(['E4', 'G4', 'B4', 'E5']),
    ].join(' ') },
    // A bell that repeats every 7 bars against the 4-bar loop, so it rarely lands the same way twice.
    { voice: 'bell', volume: 0.05, pattern: 'E5~24 .~8 C5~16 .~8 B4~24 A4~16 .~16' },
    { voice: 'hat', volume: 0.025, pattern: '.~2 A1 .~5 A1 .~3 A1 .~3' },
  ],
};

/** The example game: faster, the same key, a lead line. */
export const GAME: Track = {
  id: 'game',
  bpm: 128,
  steps: 4,
  parts: [
    { voice: 'kick', volume: 0.5, pattern: 'A1~4 A1~4 A1~4 A1~4' },
    { voice: 'hat', volume: 0.03, pattern: '.~2 A1~2 .~2 A1~2 .~2 A1~2 .~2 A1 A1' },
    { voice: 'bass', volume: 0.2, pattern: 'A1~4 A2~4 A1~4 A2~4 F1~4 F2~4 F1~4 F2~4 C2~4 C3~4 C2~4 C3~4 E1~4 E2~4 E1~4 E2~4' },
    { voice: 'lead', volume: 0.05, pattern: 'E5~2 .~2 C5~2 D5~2 E5~4 A4~4 F5~2 .~2 E5~2 C5~2 A4~8 G4~2 .~2 C5~2 E5~2 G5~4 E5~4 B4~2 .~2 B4~2 C5~2 B4~8' },
    { voice: 'arp', volume: 0.02, pattern: [
      arpeggio(['A4', 'C5', 'E5']), arpeggio(['F4', 'A4', 'C5']), arpeggio(['C5', 'E5', 'G5']), arpeggio(['E4', 'G4', 'B4']),
    ].join(' ') },
  ],
};
