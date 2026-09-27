import { WEB } from '../../crt/palette';
import { bold, halftone, link, rule, small, song, space, t, text, type Maker } from './kit';
import { isoDate, machineNow } from '../time';
import type { Block, Img } from '../../system/gui/page';
import type { Text } from '../../system/i18n';

/*
 * The Handmade Market: a place to buy what people made, with the proof that they did.
 * Every piece carries its hours, its strokes, its drafts; an hour of a person is sixty
 * yuan. Buying needs a person too. JR keeps a stall here; it still puts out a new
 * piece every day, each one exactly four hours and a thousand strokes.
 */

export const MARKET = 'handmade.market';
const PICTURES = '/terminal/pictures/';

type Piece = { title: Text; by: Text; hours: string; strokes: Text; price: number; img: Img; href?: string };

const pic = (name: string, crop?: readonly [number, number, number, number]) => halftone(`${PICTURES}${name}.png`, WEB.umber, WEB.cream, { invert: true, crop });

const FEATURED: Piece[] = [
  { title: t('Lighthouse, a sketch', '灯塔，草图'), by: 'JR', hours: '6:12', strokes: '1,904', price: 372, img: pic('lh-one'), href: `${MARKET}/jr` },
  { title: t('Rain on the window', '窗上的雨'), by: t('Old Ticket', '旧船票'), hours: '14:40', strokes: t('watercolour', '水彩'), price: 880, img: pic('lh-window-dark') },
  { title: t('A city, first year', '城市，大一'), by: 'JR', hours: '31:05', strokes: '6,210', price: 1865, img: pic('city'), href: `${MARKET}/jr` },
];

function piece(p: Piece): Block {
  return {
    kind: 'box', bg: WEB.white, border: WEB.umber, pad: 6, blocks: [
      { kind: 'img', img: p.img, w: 160, h: 100, frame: WEB.umber, href: p.href },
      text(bold(p.title)),
      small([t('by ', '作者 '), p.by], { colour: WEB.umber }),
      small([t(`${p.hours} hours · `, `${p.hours} 小时 · `), p.strokes, t(' strokes', ' 笔')], { colour: WEB.g40 }),
      text([bold(`¥ ${p.price}`, { colour: WEB.leaf }), '  ', link(t('buy', '购买'), `${MARKET}/verify`)]),
    ],
  };
}

const header: Block[] = [
  { kind: 'box', bg: WEB.umber, pad: 6, blocks: [
    { kind: 'row', gap: 8, cells: [
      { blocks: [song(t('HANDMADE MARKET', '人 手 集 市'), { colour: WEB.cream }), small(t('only what people made · priced in hours', '只卖人做的东西 · 按人时定价'), { colour: WEB.kraft })] },
      { w: 170, blocks: [space(4), text([link(t('Browse', '逛逛'), MARKET, { colour: WEB.cream }), '  ', link(t('Stalls', '摊位'), `${MARKET}/jr`, { colour: WEB.cream }), '  ', link(t('Rules', '规矩'), `${MARKET}/rules`, { colour: WEB.cream })], { align: 'right' })] },
    ] },
  ] },
];

export const market: Maker = () => ({
  url: MARKET, title: t('Handmade Market', '人手集市'), bg: WEB.cream, fg: WEB.black, link: WEB.leaf,
  blocks: [
    ...header,
    { kind: 'box', bg: WEB.leafPale, border: WEB.leaf, pad: 6, blocks: [
      text(t('Every piece here comes with how it was made: the hours, the strokes, the drafts. One hour of a person is ¥60. Nothing generated, ever; if it can be made in a second, it is not sold here.',
        '这里每一件作品都附着它是怎么做出来的：时长、笔数、草稿。一个人的一小时是 60 块钱。生成的东西，永远不卖；一秒钟就能做出来的，不在这里卖。')),
    ] },
    text(bold(t('This week', '本周'), { colour: WEB.umber })),
    { kind: 'row', gap: 10, cells: FEATURED.map(p => ({ blocks: [piece(p)] })) },
    small(t('The market is kept by eleven people, by hand. Please be patient with the pictures.', '集市由十一个人手工打理。图片加载得慢，请耐心。'), { align: 'centre', colour: WEB.g55 }),
  ],
});

/** JR's stall: what he made, and then what was made every day after he stopped. */
export const stall: Maker = () => {
  const today = machineNow();
  const days = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return isoDate(d); };
  const own: [Text, string, string, string][] = [
    [t('Lighthouse, a sketch', '灯塔，草图'), '2030-01-09', '6:12', '1,904'],
    [t('Lighthouse, chapter 3, pages 1-4', '灯塔 第三章 第 1-4 页'), '2030-02-21', '22:47', '5,833'],
    [t('Rooftop, night (redrawn twice)', '天台，夜（重画了两次）'), '2030-04-30', '17:02', '4,190'],
    [t('Hands, practice', '手，练习'), '2030-06-02', '2:31', '688'],
  ];
  const after = [3, 2, 1, 0].map(n => [t('New today', '今日上新'), days(n), '4:00', '1,000'] as [Text, string, string, string]);
  return {
    url: `${MARKET}/jr`, title: t("JR's stall · Handmade Market", 'JR 的摊位 · 人手集市'), bg: WEB.cream, fg: WEB.black, link: WEB.leaf,
    blocks: [
      ...header,
      text([bold(t("JR's stall", 'JR 的摊位'), { colour: WEB.umber }), '  ', { text: t('drawing and stories · open since 2029', '画和故事 · 2029 年开张'), colour: WEB.g55 }]),
      text(t('"I sell the drafts too. You should see where it went wrong." -- JR', '「草稿我也卖。你应该看看它是在哪里画坏的。」—— JR'), { colour: WEB.g40 }),
      rule({ colour: WEB.kraft }),
      ...[...own, ...after].map(([title, date, hours, strokes], i): Block => ({
        kind: 'row', gap: 8, cells: [
          { w: 86, blocks: [small(date, { colour: i >= own.length ? WEB.stampRed : WEB.umber })] },
          { blocks: [text(title)] },
          { w: 170, blocks: [small(t(`${hours} hours · ${strokes} strokes`, `${hours} 小时 · ${strokes} 笔`), { colour: i >= own.length ? WEB.stampRed : WEB.g40, align: 'right' })] },
        ],
      })),
      rule({ colour: WEB.kraft }),
      small(t('A new piece every day at 03:07. Stall verified: OS-Score 3.2.', '每天 03:07 上新。摊位已认证：OS-Score 3.2。'), { colour: WEB.g55 }),
    ],
  };
};

export const verify: Maker = () => ({
  url: `${MARKET}/verify`, title: t('Handmade Market: are you a person?', '人手集市：你是人吗？'), bg: WEB.cream, fg: WEB.black, link: WEB.leaf,
  blocks: [
    ...header,
    song(t('Only people may buy here.', '这里只卖给人。'), { colour: WEB.umber }),
    text(t('To buy, send us something you made and how you made it. We score it for hesitation: the pauses, the strokes taken back, the sentence started twice. A person hesitates. A machine never has to.',
      '要买东西，请寄给我们一件你做的东西，和你是怎么做的。我们给它的犹豫打分：停顿、撤回的笔画、写了两遍的开头。人会犹豫。机器从来不需要。')),
    text(t('Scoring by OS-Score, written by one of our own.', '评分用的是 OS-Score，由我们中的一个人写成。'), { colour: WEB.g40 }),
    text([link(t('◄ back to the market', '◄ 回到集市'), MARKET)]),
  ],
});

export const rules: Maker = () => ({
  url: `${MARKET}/rules`, title: t('Handmade Market: the rules', '人手集市：规矩'), bg: WEB.cream, fg: WEB.black, link: WEB.leaf,
  blocks: [
    ...header,
    { kind: 'list', bullet: WEB.umber, items: [
      [t('Nothing generated. Not a stroke, not a word.', '不卖生成的东西。一笔都不行，一个字都不行。')],
      [t('Every piece with its process: hours, strokes, drafts.', '每件作品都附过程：时长、笔数、草稿。')],
      [t('Priced in hours. An hour is ¥60, whoever you are.', '按人时定价。不管你是谁，一小时 60 块。')],
      [t('A stall that is too tidy will be looked at.', '太整齐的摊位，会被查。')],
    ] },
    text([link(t('◄ back to the market', '◄ 回到集市'), MARKET)]),
  ],
});
