import type { Block, Img, Run } from '../../system/gui/page';
import type { Face } from '../../graphics/webtype';
import type { Text } from '../../system/i18n';
import type { Machine } from '../../system/machine';

/* What every page of the web is written with. */

export const t = (en: string, zh: string): Text => ({ en, zh });
export const link = (text: Text, href: string, o: Partial<Run> = {}): Run => ({ text, href, ...o });
export const bold = (text: Text, o: Partial<Run> = {}): Run => ({ text, bold: true, ...o });

export function text(runs: Text | Run | (Text | Run)[], o: Partial<Extract<Block, { kind: 'text' }>> = {}): Block {
  return { kind: 'text', runs: Array.isArray(runs) ? runs : [runs], ...o };
}
export const song = (runs: Text | Run | (Text | Run)[], o: Partial<Extract<Block, { kind: 'text' }>> = {}) => text(runs, { face: 'song' as Face, ...o });
export const small = (runs: Text | Run | (Text | Run)[], o: Partial<Extract<Block, { kind: 'text' }>> = {}) => text(runs, { face: 'small' as Face, ...o });
export const serif = (s: string, size: number, o: Partial<Extract<Block, { kind: 'text' }>> = {}) => text(s, { face: 'serif' as Face, size, ...o });
export const space = (h: number): Block => ({ kind: 'space', h });
export const rule = (o: Partial<Extract<Block, { kind: 'rule' }>> = {}): Block => ({ kind: 'rule', ...o });
export const halftone = (url: string, ink: number, paper: number, o: Partial<Extract<Img, { kind: 'halftone' }>> = {}): Img => ({ kind: 'halftone', url, ink, paper, ...o });

/** A page maker: what is at an address, given the machine and the query. */
export type Maker = (m: Machine, params: URLSearchParams) => import('../../system/gui/page').Page;
