import { WEB } from '../../crt/palette';
import { FLOPPY, TAPE, TUBE, UNKNOWN } from './art';
import { bold, link, small, song, space, t, text, type Maker } from './kit';
import type { Block, Img } from '../../system/gui/page';
import type { Text } from '../../system/i18n';
import type { Machine } from '../../system/machine';

/*
 * The night market: a stall that buys old things and sells them, open at night, never
 * linked from anywhere (its address is in a classified on Night Ferry). What you buy
 * here arrives on this machine: a tape for the television, a screen saver on a floppy,
 * a new tube. Some things it lists cannot be bought.
 */

export const SHOP = 'yeshi.shop';
/** What the visitor has to spend: JR's savings, in the story's money. */
export const WALLET = 300;

export type Goods = 'tape' | 'stars' | 'p7';
type Item = { id: Goods; name: Text; says: Text; price: number; img: Img; arrives: Text };

export const ITEMS: Item[] = [
  { id: 'tape', name: t('Video tape: "New Year, harbour, 1999"', '录像带：「千禧夜 · 海边 · 1999」'), price: 38, img: TAPE,
    says: t('A home video. Someone labelled it by hand and then sold it.', '一盘家庭录像。标签是有人手写的，后来又卖掉了。'),
    arrives: t('The tape is in the video recorder. Watch it on channel 15.', '录像带已经放进录像机了。在第 15 台看。') },
  { id: 'stars', name: t('Floppy: STARS.SCR, a screen saver', '软盘：STARS.SCR 屏幕保护'), price: 25, img: FLOPPY,
    says: t('Flying through stars, the old way. Written by someone in 1993.', '在星星里飞，老样子。1993 年有人写的。'),
    arrives: t('Installed. Choose it in Settings, under the screen saver.', '已经装好了。在「设置」的屏幕保护里选它。') },
  { id: 'p7', name: t('Tube: P7, radar blue', '显像管：P7 雷达蓝'), price: 180, img: TUBE,
    says: t('Out of an air traffic console. Blue when it is struck, and it glows long after.', '从一台空管雷达上拆下来的。被电子打中时发蓝，余辉很长。'),
    arrives: t('Fitted. Choose it in Settings, under the tube.', '已经装上了。在「设置」的显像管里选它。') },
];

/** Listed, and never for sale. */
const ODD: [Text, Text][] = [
  [t('A Sunday afternoon, 2019', '一个周日下午，2019'), t('out of stock', '缺货')],
  [t('The hand you first drew with', '你第一次画画时的那只手'), t('sold', '已售出')],
  [t('Variant #0005', '变体 #0005'), t('reserved: you', '已预订：你')],
];

export const owns = (m: Machine, id: Goods) => m.has(`bought:${id}`);
const balance = (m: Machine) => m.store.get('wallet', WALLET);

function header(m: Machine): Block {
  return {
    kind: 'box', bg: WEB.nightPanel, border: WEB.neonPink, pad: 8, blocks: [
      { kind: 'row', gap: 8, cells: [
        { blocks: [song(t('NIGHT MARKET', '夜 市'), { colour: WEB.neonPink }), small(t('buys old things · sells them too · open at night', '收旧货 · 也卖 · 只在夜里开'), { colour: WEB.neonCyan })] },
        { w: 170, blocks: [space(4), text(bold(t(`you have ¥ ${balance(m)}`, `你的余额：¥ ${balance(m)}`), { colour: WEB.neonYellow }), { align: 'right' })] },
      ] },
    ],
  };
}

export const shop: Maker = m => ({
  url: SHOP, title: t('Night Market', '夜市'), bg: WEB.night, fg: WEB.white, link: WEB.neonCyan,
  blocks: [
    header(m),
    text(t('No links in, no links out. If you found it, you were meant to.', '没有链接进来，也没有链接出去。你找到了，就是该找到。'), { colour: WEB.dusk }),
    ...ITEMS.map((it): Block => ({
      kind: 'row', gap: 12, cells: [
        { w: 96, blocks: [{ kind: 'img', img: it.img, w: 96, h: 48 }] },
        { blocks: [
          text(bold(it.name, { colour: WEB.neonYellow })),
          text(it.says, { colour: WEB.g85 }),
          text(owns(m, it.id)
            ? [bold(t('yours', '已经是你的了'), { colour: WEB.neonPink })]
            : [bold(`¥ ${it.price}`, { colour: WEB.neonPink }), '    ', link(t('[ buy ]', '[ 买 ]'), `${SHOP}/buy?item=${it.id}`, { bold: true })]),
        ] },
      ],
    })),
    { kind: 'rule', colour: WEB.dusk, dotted: true },
    ...ODD.map(([name, state]): Block => ({
      kind: 'row', gap: 12, cells: [
        { w: 96, blocks: [{ kind: 'img', img: UNKNOWN, w: 78, h: 36 }] },
        { blocks: [text(name, { colour: WEB.dusk }), small(state, { colour: WEB.dusk })] },
      ],
    })),
  ],
});

/** Buying: the money goes, and the thing arrives. */
export const buy: Maker = (m, params) => {
  const it = ITEMS.find(x => x.id === params.get('item'));
  let say: Text, ok = false;
  if (!it) say = t('We never had that.', '我们从来没有这个。');
  else if (owns(m, it.id)) { say = t('You already have it.', '已经是你的了。'); ok = true; }
  else if (balance(m) < it.price) say = t('Not enough money. Come back another night.', '钱不够。改天夜里再来。');
  else {
    m.store.set('wallet', balance(m) - it.price);
    m.mark(`bought:${it.id}`);
    m.audio.sfx('disk', '0.6');
    say = t('Paid.', '付好了。');
    ok = true;
  }
  return {
    url: `${SHOP}/buy?item=${params.get('item') ?? ''}`, title: t('Night Market: bought', '夜市：买好了'), bg: WEB.night, fg: WEB.white, link: WEB.neonCyan,
    blocks: [
      header(m),
      song(say, { colour: ok ? WEB.neonYellow : WEB.neonPink }),
      ...(it && ok ? [{ kind: 'img', img: it.img, w: 96, h: 48 } as Block, text(it.arrives)] : []),
      text([link(t('◄ back to the stall', '◄ 回到摊子'), SHOP)]),
    ],
  };
};
