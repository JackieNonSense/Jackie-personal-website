/**
 * The machine's sounds. Most are the hardware itself in a quiet room: the power
 * switch, the tube degaussing, the hard disk and its fan, the keyboard, the
 * television's tuner, the buttons under the screen. Only `beep` and `catch` come
 * out of a speaker.
 *
 *   key      detail: 'space' | 'enter' | anything else for an ordinary key
 *   disk     detail: seconds of head seeking, as a string ('0.4'); 'retry' grinds on one sector
 *   button   one of the push buttons under the screen going down
 *   degauss  the coil, when another tube is selected with the set running
 *   laser, boom, stage   ORBIT's shots, explosions (detail 'hit': the ship's own) and stage jingle, from the speaker
 */
export type Sfx = 'power-on' | 'power-off' | 'beep' | 'key' | 'disk' | 'tune' | 'catch' | 'button' | 'degauss' | 'laser' | 'boom' | 'stage';

export type Voice = 'pad' | 'lead' | 'arp' | 'bass' | 'bell' | 'hat' | 'kick';

/**
 * One line of a track. `pattern` is a row of steps: a note (`A3`), a note held for
 * several steps (`A3~8`), or a rest (`.`). Drums take any note name; only the hit counts.
 * Each part loops on its own, so parts of different lengths drift against each other.
 */
export type Part = { voice: Voice; volume: number; pattern: string };

export type Track = {
  id: string;
  bpm: number;
  /** Steps per beat; 4 makes each step a sixteenth. */
  steps: number;
  parts: Part[];
};
