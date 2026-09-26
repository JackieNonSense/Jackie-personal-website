import type { Icon } from '../system/gui/gfx';

/*
 * The desk's icons, 32 pixels square, drawn by hand: '#' is the line, 'o' the fill,
 * 'a' the tube's accent and 's' its shade. Each tube colours them its own way.
 */
const INK = { '#': 'iconLine', o: 'iconFill', a: 'iconAccent', s: 'iconShade' } as const;

function icon(art: string): Icon {
  const rows = art.split('|').map(r => r.replace(/\./g, ' '));
  // Centred in the 32-pixel square.
  const pad = Math.floor((32 - rows.length) / 2);
  return { w: 32, h: 32, rows: [...Array(pad).fill(''), ...rows], ink: INK };
}

export const DESK_ICONS = {
  messages: icon(
    '................................|' +
    '................................|' +
    '...####################.........|' +
    '..#oooooooooooooooooooo#........|' +
    '.#oooooooooooooooooooooo#.......|' +
    '.#oo#####oooooooooooooooo#......|' +
    '.#ooooooooooooooooooooooo#......|' +
    '.#oo#################oooo#......|' +
    '.#ooooooooooooooooooooooo#......|' +
    '.#oo############ooooooooo#......|' +
    '.#ooooooooooooooooooooooo#......|' +
    '..#ooooooooooooooooooooo#.......|' +
    '...#####ooo#############........|' +
    '.......#oo#.....................|' +
    '......#oo#....###############...|' +
    '.....###.....#aaaaaaaaaaaaaaa#..|' +
    '............#aaaaaaaaaaaaaaaaa#.|' +
    '............#aa###########aaaa#.|' +
    '............#aaaaaaaaaaaaaaaaa#.|' +
    '............#aa#######aaaaaaaa#.|' +
    '............#aaaaaaaaaaaaaaaaa#.|' +
    '.............#aaaaaaaaaaaaaaa#..|' +
    '..............########aaa####...|' +
    '.....................#aa#.......|' +
    '......................#aa#......|' +
    '.......................###......',
  ),
  files: icon(
    '................................|' +
    '................................|' +
    '..#########.....................|' +
    '.#ooooooooo#....................|' +
    '.#oooooooooo###################.|' +
    '.#ooooooooooooooooooooooooooooo#|' +
    '.#oo#########################oo#|' +
    '.#o#sssssssssssssssssssssssss#o#|' +
    '.#o#s#####################sss#o#|' +
    '.#o#sssssssssssssssssssssssss#o#|' +
    '.#o#s###############sssssssss#o#|' +
    '.#o#sssssssssssssssssssssssss#o#|' +
    '.###############################|' +
    '.#aaaaaaaaaaaaaaaaaaaaaaaaaaaaa#|' +
    '.#aaaaaaaaaaaaaaaaaaaaaaaaaaaaa#|' +
    '.#aaaaaaaaaaaaaaaaaaaaaaaaaaaaa#|' +
    '.#aaaaaaaaaaa#######aaaaaaaaaaa#|' +
    '.#aaaaaaaaaaa#ooooo#aaaaaaaaaaa#|' +
    '.#aaaaaaaaaaa#######aaaaaaaaaaa#|' +
    '.#aaaaaaaaaaaaaaaaaaaaaaaaaaaaa#|' +
    '.#aaaaaaaaaaaaaaaaaaaaaaaaaaaaa#|' +
    '.#aaaaaaaaaaaaaaaaaaaaaaaaaaaaa#|' +
    '.###############################',
  ),
  diary: icon(
    '.....#.#.#.#.#.#.#.#............|' +
    '....#################...........|' +
    '...#o#o#o#o#o#o#o#o#s#..........|' +
    '...#ooooooooooooooooo##.........|' +
    '...#ooooooooooooooooo#s#........|' +
    '...#oo#############oo#s#........|' +
    '...#ooooooooooooooooo#s#........|' +
    '...#oo##########ooooo#s#........|' +
    '...#ooooooooooooooooo#s#........|' +
    '...#oo#############oo#s#........|' +
    '...#ooooooooooooooooo#s#........|' +
    '...#oo#######oooooooo#s#........|' +
    '...#ooooooooooooooooo#s#........|' +
    '...#ooooooooooooooooo#s#....##..|' +
    '...#oo###########oooo#s#...#aa#.|' +
    '...#ooooooooooooooooo#s#..#aa#..|' +
    '...#oo##########ooooo#s#.#aa#...|' +
    '...#ooooooooooooooooo#s##aa#....|' +
    '...#ooooooooooooooooo#s#aa#.....|' +
    '...#oo######ooooooooo#s#oo#.....|' +
    '...#ooooooooooooooooo#s##o#.....|' +
    '...#ooooooooooooooooo#s###......|' +
    '...#ooooooooooooooooo#s#........|' +
    '....#################ss#........|' +
    '.....#################s#........|' +
    '......#################.........',
  ),
  photos: icon(
    '................................|' +
    '................................|' +
    '................................|' +
    '..###########################...|' +
    '..#ooooooooooooooooooooooooo#...|' +
    '..#o#######################o#...|' +
    '..#o#sssssssssssssssssssss#o#...|' +
    '..#o#ssssssssssssssssaaass#o#...|' +
    '..#o#sssssssssssssssaaaaas#o#...|' +
    '..#o#sssssssssssssssaaaaas#o#...|' +
    '..#o#ssssssssssssssssaaass#o#...|' +
    '..#o#sssssss#ssssssssssss##o#...|' +
    '..#o#ssssss#o#sssssssssss##o#...|' +
    '..#o#sssss#ooo#ssssss#sss##o#...|' +
    '..#o#ssss#ooooo#ssss#o#ss##o#...|' +
    '..#o#sss#ooooooo#ss#ooo#s##o#...|' +
    '..#o#ss#ooooooooo##ooooo###o#...|' +
    '..#o#s#ooooooooooooooooooo#o#...|' +
    '..#o#######################o#...|' +
    '..#ooooooooooooooooooooooooo#...|' +
    '..#ooooooooooooooooooooooooo#...|' +
    '..#ooooooooooooooooooooooooo#...|' +
    '..###########################...',
  ),
  library: icon(
    '................................|' +
    '................................|' +
    '......................##........|' +
    '.....................#aa#.......|' +
    '..####.####.........#aaa#.......|' +
    '..#oo#.#ss#.#####..#aaa#........|' +
    '..#oo#.#ss#.#aaa#..#aa#.........|' +
    '..#oo#.#ss#.#aaa#.#aaa#.........|' +
    '..#oo#.#ss#.#aaa#.#aa#..........|' +
    '..####.#ss#.#aaa##aaa#..........|' +
    '..#oo#.#ss#.#aaa##aa#...........|' +
    '..#oo#.#ss#.#aaa#aaa#...........|' +
    '..#oo#.####.#aaa#aa#............|' +
    '..#oo#.#ss#.#aaa#aa#............|' +
    '..#oo#.#ss#.#####aa#............|' +
    '..#oo#.#ss#.#aaa#aa#............|' +
    '..#oo#.#ss#.#aaa#aa#............|' +
    '..####.####.#####a##............|' +
    '.############################...|' +
    '.#oooooooooooooooooooooooooo#...|' +
    '.############################...|' +
    '..##......................##....|' +
    '..##......................##....',
  ),
  net: icon(
    '................................|' +
    '...........##########...........|' +
    '.........##aaaa#aaaaa##.........|' +
    '.......##aaaaa#oo#aaaaa##.......|' +
    '......#aaaaaa#oooo#aaaaaa#......|' +
    '.....#aaaaaa#oooooo#aaaaaa#.....|' +
    '....#################aaaaaa#....|' +
    '....#aaaaa#oooooooo#aaaaaaa#....|' +
    '...#aaaaaa#oooooooo#aaaaaaaa#...|' +
    '...#aaaaaa#oooooooo#aaaaaaaa#...|' +
    '...############################.|' +
    '...#aaaaaa#oooooooo#aaaaaaaa#...|' +
    '...#aaaaaa#oooooooo#aaaaaaaa#...|' +
    '....#aaaaa#oooooooo#aaaaaaa#....|' +
    '....#################aaaaaa#....|' +
    '.....#aaaaaa#oooooo#aaaaaa#.....|' +
    '......#aaaaaa#oooo#aaaaaa#......|' +
    '.......##aaaaa#oo#aaaaa##.......|' +
    '.........##aaaa#aaaaa##.........|' +
    '...........##########...........|' +
    '................................|' +
    '.....#####....#...#...######....|' +
    '.....#....#...##..#...#.........|' +
    '.....#####....#.#.#...####......|' +
    '.....#........#..##...#.........|' +
    '.....#........#...#...######....',
  ),
  tv: icon(
    '................................|' +
    '..........#.......#.............|' +
    '...........#.....#..............|' +
    '............#...#...............|' +
    '.............#.#................|' +
    '..............#.................|' +
    '..#########################.....|' +
    '..#ooooooooooooooooooooooo#.....|' +
    '..#o###################ooo#.....|' +
    '..#o#sssssssssssssssss#o#o#.....|' +
    '..#o#sssssssssssssssss#ooo#.....|' +
    '..#o#ssaaaasssssssssss#o#o#.....|' +
    '..#o#ssaaaasssssssssss#ooo#.....|' +
    '..#o#sssssssssssssssss#o#o#.....|' +
    '..#o#sssssssssssssssss#ooo#.....|' +
    '..#o#sssssssssssssssss#ooo#.....|' +
    '..#o###################ooo#.....|' +
    '..#ooooooooooooooooooooooo#.....|' +
    '..#########################.....|' +
    '....##.................##.......|' +
    '....##.................##.......',
  ),
  paint: icon(
    '................................|' +
    '.........................##.....|' +
    '........................#aa#....|' +
    '.......................#aa#.....|' +
    '.........##########...#aa#......|' +
    '.......##oooooooooo##.#aa#......|' +
    '.....##oooooooooooooo#aa#.......|' +
    '....#oooo##ooooooooo#aa#........|' +
    '...#oooo#aa#oooooooo#aa#........|' +
    '...#ooooo##oooooooo#oo#.........|' +
    '..#oooooooooooo##oo#o##.........|' +
    '..#oo##ooooooo#ss#o###o#........|' +
    '..#o#ss#oooooo#ss#ooooo#........|' +
    '..#oo##ooooooooo##ooooo#........|' +
    '..#oooooooo####oooooooo#........|' +
    '...#ooooooo#..#ooooooo#.........|' +
    '...#oooooo#....#oo##oo#.........|' +
    '....#ooooo#....#o#aa#o#.........|' +
    '.....##ooo#....#oo##o#..........|' +
    '.......###oo####ooooo#..........|' +
    '..........##ooooooo##...........|' +
    '............#######.............',
  ),
  games: icon(
    '................................|' +
    '................................|' +
    '..............###...............|' +
    '.............#aaa#..............|' +
    '.............#aaa#..............|' +
    '..............###...............|' +
    '...............#................|' +
    '...............#................|' +
    '...............#................|' +
    '...............#................|' +
    '..........###########...........|' +
    '.........#ooooooooooo#..........|' +
    '.......##ooooooooooooo##........|' +
    '.....##ooooooooooooooooo##......|' +
    '....#oooo###ooooooo#o#oooo#.....|' +
    '...#ooooo#a#oooooo#a#a#ooo#.....|' +
    '...#oooo#####ooooooo#o#oooo#....|' +
    '...#ooooo#a#oooooooooooooooo#...|' +
    '...#oooooo#ooooooooooooooooo#...|' +
    '....#oooooooooooooooooooooo#....|' +
    '.....##oooooooooooooooooo##.....|' +
    '.......##################.......',
  ),
  dos: icon(
    '................................|' +
    '..############################..|' +
    '..#aaaaaaaaaaaaaaaaaaaaaaoooa#..|' +
    '..#aaaaaaaaaaaaaaaaaaaaaaoooa#..|' +
    '..############################..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..#ssooosssosssosssssssssssss#..|' +
    '..#ssosssosossssossssssssssss#..|' +
    '..#ssossssssossssosssssssssss#..|' +
    '..#ssosssosssossossssssssssss#..|' +
    '..#ssooosssssosossssooossssss#..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..#ssaaaaaaaassssaaaassssssss#..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..#ssaaaaasssssssaaaassssssss#..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..#ssaaaaaaaaaassaaaassssssss#..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..#ssssssssssssssssssssssssss#..|' +
    '..############################..|' +
    '................................',
  ),
  system: icon(
    '................................|' +
    '....######################......|' +
    '....#oooooooooooooooooooo#......|' +
    '....#o##################o#......|' +
    '....#o#ssssssssssssssss#o#......|' +
    '....#o#saassssssssssssss#o#.....|' +
    '....#o#ssssssssssssssss#o#......|' +
    '....#o#saaaaassssssssss#o#......|' +
    '....#o#ssssssssssssssss#o#......|' +
    '....#o#ssssssssssssssss#o#......|' +
    '....#o##################o#......|' +
    '....#oooooooooooooooooo#ao#.....|' +
    '....######################......|' +
    '.........#oooooooooo#...........|' +
    '.......##############...........|' +
    '..##########################....|' +
    '..#oooooooooooooooooooooooo#....|' +
    '..#o#o#o#o#o#o#o#o#o#o#o#oo#....|' +
    '..#oo#o#o#o#o#o#o#o#o#o#oo#.....|' +
    '..#oo##################ooo#.....|' +
    '..##########################....',
  ),
} as const;

export type DeskIconName = keyof typeof DESK_ICONS;
