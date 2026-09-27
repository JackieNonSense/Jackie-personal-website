import { HW, WEB } from '../../crt/palette';
import type { Img, Tile } from '../../system/gui/page';

/*
 * The little pictures the web's pages are made with, drawn a pixel at a time the way
 * people drew them for their sites: a stamp, a tile of stars, the goods on a stall.
 */

const sprite = (rows: string[], inks: Record<string, number>, scale = 1): Img => ({ kind: 'sprite', rows, inks, scale });

/** SLOW POST's stamp, set into its masthead where the O should be. */
export const STAMP = sprite([
  '..############..',
  '.#............#.',
  '#..##########..#',
  '#.#..........#.#',
  '#.#.########.#.#',
  '#.#.#......#.#.#',
  '#.#.#.####.#.#.#',
  '#.#.#.#..#.#.#.#',
  '#.#.#.####.#.#.#',
  '#.#.#......#.#.#',
  '#.#.########.#.#',
  '#.#..........#.#',
  '#..##########..#',
  '.#............#.',
  '..############..',
], { '#': WEB.risoRed }, 3);

/** The background every fan site had: stars on a pale check. */
export const STARS: Tile = {
  rows: [
    'aoaoaoaSaoaoaoao', 'oaoaoaSSSaoaoaoa', 'aoaSSSSSSSSoaoao', 'oaoaSSSSSSoaoaoa', 'aoaoSSaoSSaoaoao', 'oaoSoaoaoaSoaoao', 'aoaoaoaoaoaoaoao', 'oaoaoaoaoaoaoaoa',
    'aoaoaoaoaoaoaoaP', 'oaoaoaoaoaoaoaPP', 'aoaoaoaoaoaoPPPP', 'oaoaoaoaoaoaoPPP', 'aoaoaoaoaoaoPPao', 'oaoaoaoaoaoPoaoa', 'aoaoaoaoaoaoaoao', 'oaoaoaoaoaoaoaoa',
  ],
  inks: { a: WEB.white, o: WEB.pink, S: HW.lightMagenta, P: WEB.periwinkle },
};

/** A face of eight by eight, for a profile or a post. */
export const faces: Record<string, string[]> = {
  cheng: ['..####..', '.#oooo#.', '#o#oo#o#', '#oooooo#', '#o#oo#o#', '#oo##oo#', '.#oooo#.', '..####..'],
  jr: ['.######.', '#......#', '#.#..#.#', '#......#', '#.####.#', '#......#', '.######.', '........'],
  ticket: ['..####..', '.#....#.', '#.####.#', '#.#..#.#', '#.####.#', '#......#', '.#....#.', '..####..'],
  no: ['########', '#......#', '#.#..#.#', '#......#', '#.####.#', '#......#', '########', '........'],
  moth: ['#......#', '.#.##.#.', '..####..', '.######.', '..####..', '.#.##.#.', '#......#', '........'],
  lamp: ['...##...', '..####..', '.######.', '...##...', '...##...', '...##...', '..####..', '.######.'],
  cat: ['#.....#.', '##...##.', '#######.', '#.#.#.#.', '#######.', '.#####..', '..#.#...', '........'],
};
export const face = (name: string, ink: number, fill?: number): Img => sprite(faces[name], fill === undefined ? { '#': ink } : { '#': ink, o: fill }, 3);

// ── The night market's goods ──────────────────────────────────────────────────

export const TAPE = sprite([
  '................................',
  '..############################..',
  '..#oooooooooooooooooooooooooo#..',
  '..#oPPPPPPPPPPPPPPPPPPPPPPPPo#..',
  '..#oPwwwwwwwwwwwwwwwwwwwwwwPo#..',
  '..#oPwPPPPwwwwwwwwwwwwPPPPwPo#..',
  '..#oPPPPPPPPPPPPPPPPPPPPPPPPo#..',
  '..#oooo######oooo######oooooo#..',
  '..#ooo#......#oo#......#ooooo#..',
  '..#ooo#..##..#oo#..##..#ooooo#..',
  '..#ooo#......#oo#......#ooooo#..',
  '..#oooo######oooo######oooooo#..',
  '..#oooooooooooooooooooooooooo#..',
  '..#ooooo################ooooo#..',
  '..############################..',
  '................................',
], { '#': WEB.black, o: WEB.g40, P: WEB.neonPink, w: WEB.white }, 3);

export const FLOPPY = sprite([
  '..####################....',
  '..#oooo############oo##...',
  '..#oooo#ssssssss#oo#o##...',
  '..#oooo#ssss##ss#oo#oo##..',
  '..#oooo#ssss##ss#oo#ooo#..',
  '..#oooo#ssssssss#oo#ooo#..',
  '..#oooo##########oo#ooo#..',
  '..#oooooooooooooooooooo#..',
  '..#oowwwwwwwwwwwwwwwwoo#..',
  '..#oowCCCCCCCCCCCCCCwoo#..',
  '..#oowwwwwwwwwwwwwwwwoo#..',
  '..#oowCCCCCCCCCwwwwwwoo#..',
  '..#oowwwwwwwwwwwwwwwwoo#..',
  '..#oowwwwwwwwwwwwwwwwoo#..',
  '..######################..',
], { '#': WEB.black, o: WEB.jrCobalt, s: WEB.g85, w: WEB.white, C: WEB.neonCyan }, 3);

export const TUBE = sprite([
  '..........######..........',
  '........##oooooo##........',
  '......##oooooooooo##......',
  '.....#oooGGGGGGGGooo#.....',
  '....#ooGGGGGGGGGGGGoo#....',
  '....#oGGGGGGGGGGGGGGo#....',
  '....#oGGGGGGGGGGGGGGo#....',
  '....#ooGGGGGGGGGGGGoo#....',
  '.....#oooGGGGGGGGooo#.....',
  '......##oooooooooo##......',
  '........##oooooo##........',
  '...........#oo#...........',
  '...........#oo#...........',
  '..........#oooo#..........',
  '..........#o##o#..........',
  '..........######..........',
], { '#': WEB.black, o: WEB.g70, G: WEB.neonCyan }, 3);

/** What the market has no picture of: a box, and a question in it. */
export const UNKNOWN = sprite([
  '..######################..',
  '..#....................#..',
  '..#........####........#..',
  '..#.......#....#.......#..',
  '..#............#.......#..',
  '..#...........#........#..',
  '..#..........#.........#..',
  '..#..........#.........#..',
  '..#....................#..',
  '..#..........#.........#..',
  '..#....................#..',
  '..######################..',
], { '#': WEB.dusk }, 3);
