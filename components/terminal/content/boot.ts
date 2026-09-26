import { IDENT } from './mark';
import { PHOTOS } from './photos';
import { CITY_PICTURE } from './channels';
import { LIGHTHOUSE } from './lighthouse';
import { lastCall } from './callers';
import { desktop } from './desktop';
import type { BootScript, PreloadItem } from '../system/apps/boot';
import type { FileNode } from '../system/fs';
import type { Machine } from '../system/machine';

/*
 * What the machine says as it starts: N.O.'s BIOS, JR-DOS, then JR-DESK loading
 * what it will show (for real: the pictures are read here, so they open at once
 * later), and the login that types its own password.
 */

const BIOS_WIDE = [
  'JR Modular BIOS v2.6, A Quiet Machine',
  'Copyright (C) 1987-2030, N.O. Electronics',
  '',
  '486DX2 CPU at 66MHz',
];
const BIOS_NARROW = ['JR Modular BIOS v2.6', '(C) 1987-2030 N.O. Electronics', '', '486DX2-66'];

const DRIVES_WIDE = [
  'Detecting HDD Primary Master   ... JR-340M',
  'Detecting HDD Primary Slave    ... None',
  'Detecting HDD Secondary Master ... None',
  'Detecting HDD Secondary Slave  ... None',
];

const CONFIG_WIDE = (display: string) => [
  '╔══════════════════════════════════════════════════════════════════════════╗',
  '║          System Configurations    (C) 1987-2030 N.O. Electronics         ║',
  '╠═════════════════════════════════════╤════════════════════════════════════╣',
  '║ CPU Type       : 486DX2             │ Base Memory       :    640K        ║',
  '║ Co-Processor   : Installed          │ Extended Memory   :   7424K        ║',
  '║ CPU Clock      : 66MHz              │ Cache Memory      :    256K        ║',
  '╟─────────────────────────────────────┼────────────────────────────────────╢',
  `║ Diskette Drive : 1.44M, 3.5 in.     │ Display Type      : ${display.padEnd(15)}║`,
  '║ Hard Disk C:   : JR-340M, 340MB     │ Serial Port(s)    : 3F8 2F8        ║',
  '║ Modem          : 2400, auto-answer  │ Parallel Port(s)  : 378            ║',
  '╚═════════════════════════════════════╧════════════════════════════════════╝',
];
const CONFIG_NARROW = [
  '╔══════════════════════════════════════╗',
  '║ CPU      486DX2-66   Cache   256K    ║',
  '║ Memory   640K + 7424K               ║',
  '║ Disk C:  JR-340M     Display VGA     ║',
  '║ Modem    2400, auto-answer           ║',
  '╚══════════════════════════════════════╝',
];

/** What the disk holds that JR-DESK reads ahead: the pictures, then its own files. */
function preload(m: Machine): PreloadItem[] {
  const photos = m.fs.resolve('/PHOTOS')?.node;
  const visible = photos?.kind === 'dir'
    ? m.fs.list(photos).filter((n): n is FileNode => n.kind === 'file' && Boolean(n.photo))
    : [];
  const shown = new Set(visible.map(n => n.photo));
  const load = (url: string) => () => m.loadPicture(url);
  return [
    { name: 'MSGBASE.DAT', size: 48_210 },
    { name: 'DIARY.IDX', size: 1_536 },
    ...visible.map(n => ({ name: `PHOTOS\\${n.name}`, size: n.size, load: load(PHOTOS[n.photo!].url) })),
    // Pictures the visitor cannot see yet are read too, under a name that gives nothing away.
    ...Object.entries(PHOTOS).filter(([id]) => !shown.has(id)).map(([, p]) => ({ name: 'CACHE.DAT', size: 38_912, load: load(p.url) })),
    ...[...new Set(LIGHTHOUSE.map(p => p.picture).filter(Boolean) as string[])].map((url, i) => ({ name: `LIGHT\\PAGE${String(i + 1).padStart(2, '0')}.PIC`, size: 20_480, load: load(url) })),
    { name: 'TV\\CITY.PIC', size: 25_600, load: load(CITY_PICTURE) },
    { name: 'DESK.CFG', size: 312 },
  ];
}

export const BOOT: BootScript = {
  ident: IDENT,
  product: 'JR-DESK 3.0',
  bios: m => (m.narrow ? BIOS_NARROW : BIOS_WIDE),
  drives: m => (m.narrow ? ['HDD Primary Master ... JR-340M'] : DRIVES_WIDE),
  biosId: '09/12/29-i486-JR-2A4KIC09C-00',
  config: m => (m.narrow ? CONFIG_NARROW : CONFIG_WIDE(m.theme.bios)),
  dos: m => [
    'Starting JR-DOS...',
    '',
    'HIMEM is testing extended memory...done.',
    m.t({ en: 'HZK16   Chinese character ROM resident (GB2312).', zh: 'HZK16   汉字系统已驻留内存（GB2312）。' }),
    'MODEM   2400 baud. Auto-answer on.',
  ],
  preload,
  user: 'JACKIE',
  greeting: 'Welcome back, Jackie.',
  lastCall,
  next: () => desktop(),
};
