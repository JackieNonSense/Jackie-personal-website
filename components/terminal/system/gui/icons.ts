import type { Icon } from './gfx';
import type { Ink } from '../../crt/palette';

/*
 * The desk's small pictures, drawn by hand in characters. Each character is a
 * colour from the icon's table; a space (or anything not in it) is transparent.
 * The colours are roles, so every tube draws them in its own way.
 */
const icon = (rows: string[], ink: Record<string, Ink>): Icon => ({ w: Math.max(...rows.map(r => r.length)), h: rows.length, rows, ink });
const MARK = { '#': 'faceText' } as const;

// ── Glyphs for the window furniture (drawn in the colour of their button's text) ──

export const GLYPH = {
  close: icon(['#     #', ' #   # ', '  # #  ', '   #   ', '  # #  ', ' #   # ', '#     #'], MARK),
  maximise: icon(['#########', '#########', '#       #', '#       #', '#       #', '#       #', '#########'], MARK),
  restore: icon(['  #######', '  #######', '  #     #', '#######  #', '#######  #', '#     ####', '#     #', '#######'], MARK),
  up: icon(['   #   ', '  ###  ', ' ##### ', '#######'], MARK),
  down: icon(['#######', ' ##### ', '  ###  ', '   #   '], MARK),
  left: icon(['   #', '  ##', ' ###', '####', ' ###', '  ##', '   #'], MARK),
  right: icon(['#   ', '##  ', '### ', '####', '### ', '##  ', '#   '], MARK),
  check: icon(['      #', '     ##', '#   ## ', '## ##  ', ' ###   ', '  #    '], MARK),
  dot: icon([' ## ', '####', '####', ' ## '], MARK),
  grip: icon(['         #', '        ##', '       # #', '      #  #', '     #  ##', '    #  # #', '   #  #  #', '  #  #  ##', ' #  #  # #', '##########'], MARK),
  back: icon(['   #    ', '  ##    ', ' #######', '########', ' #######', '  ##    ', '   #    '], MARK),
} as const;

// ── 16 x 16: rows of a list ─────────────────────────────────────────────────────

const SMALL = { '#': 'iconLine', o: 'iconFill', a: 'iconAccent', s: 'iconShade' } as const;

export const SMALL_ICONS = {
  folder: icon([
    '',
    '',
    ' #####',
    '#ooooo#',
    '#ooooo########',
    '#oooooooooooo#',
    '#aaaaaaaaaaaa#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '##############',
  ], SMALL),
  text: icon([
    ' ########',
    ' #oooooo##',
    ' #oooooo#o#',
    ' #oooooo####',
    ' #o#####oo#',
    ' #oooooooo#',
    ' #o######o#',
    ' #oooooooo#',
    ' #o######o#',
    ' #oooooooo#',
    ' #o####ooo#',
    ' #oooooooo#',
    ' #oooooooo#',
    ' ##########',
  ], SMALL),
  picture: icon([
    '',
    '##############',
    '#oooooooooooo#',
    '#oooooooooaao#',
    '#oooooooooaao#',
    '#ooosoooooooo#',
    '#oosssoooooo#o',
    '#osssssoosoo#',
    '#sssssssssss#',
    '#ssssssssssss#',
    '#oooooooooooo#',
    '##############',
  ], SMALL),
  program: icon([
    '',
    '##############',
    '#aaaaaaaaaaaa#',
    '##############',
    '#oooooooooooo#',
    '#o##ooooooooo#',
    '#oo##oooooooo#',
    '#o##ooooooooo#',
    '#oooo####oooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '##############',
  ], SMALL),
  drawing: icon([
    '',
    '          ##',
    '         #aa#',
    '        #aa#',
    '       #aa#',
    '      #aa#',
    '     #aa#',
    '    #oo#',
    '   #oo#',
    '  ####',
    ' ##',
    ' #',
  ], SMALL),
  gone: icon([
    '',
    '',
    ' #  #  #  #  #',
    '',
    ' #          #',
    '',
    ' #    ??    #',
    '',
    ' #          #',
    '',
    ' #  #  #  #  #',
  ], { '#': 'iconShade', '?': 'iconShade' }),
} as const;

export type SmallIcon = keyof typeof SMALL_ICONS;
