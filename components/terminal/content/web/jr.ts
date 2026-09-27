import { WEB } from '../../crt/palette';
import { WORKS } from '../board';
import { messages, post, readFlag } from '../messages';
import { bold, halftone, link, rule, small, song, space, t, text, type Maker } from './kit';
import type { Block, Img, Page } from '../../system/gui/page';
import type { Text } from '../../system/i18n';
import type { Machine } from '../../system/machine';

/*
 * JR's own page, written by hand and kept on N.O.'s shop server: what he makes, his
 * real work, and his board, where his friends (and then not his friends) wrote to
 * him. The board is the one the desk opens.
 */

export const JR = 'no-electronics.com/~jr';
export const BOARD_URL = `${JR}/board`;

const WORK_PICTURES: Record<string, string> = {
  InkTrace: '/portfolio/inktrace-public-mindmap-v01.png',
  'CD Deck': '/portfolio/y2k-deck/open.webp',
  'This terminal': '/portfolio/monitor-cyan-user-v01.png',
};
const green = (url: string, crop?: readonly [number, number, number, number]): Img => halftone(url, WEB.jrGreen, WEB.jrBlack, { crop, contrast: 1.5 });

function frame(title: Text, blocks: Block[], active: 'home' | 'board'): Page {
  return {
    url: active === 'home' ? JR : BOARD_URL, title, bg: WEB.jrBlack, fg: WEB.jrPaper, link: WEB.jrAmber,
    blocks: [
      { kind: 'row', gap: 8, cells: [
        { blocks: [song(t("~ JR's page ~", '～ JR 的小站 ～'), { colour: WEB.jrGreen })] },
        { w: 220, blocks: [text([
          active === 'home' ? bold(t('home', '首页'), { colour: WEB.jrGreen }) : link(t('home', '首页'), JR), '  ·  ',
          active === 'board' ? bold(t('board', '留言板'), { colour: WEB.jrGreen }) : link(t('board', '留言板'), BOARD_URL), '  ·  ',
          link(t('write', '写留言'), `${BOARD_URL}/new`),
        ], { align: 'right' })] },
      ] },
      rule({ colour: WEB.jrGrey, dotted: true }),
      ...blocks,
      space(6),
      rule({ colour: WEB.jrGrey, dotted: true }),
      small(t('Written in Notepad. Last touched 2029-09-30. If this page changes and I did not change it, it was not me.', '用记事本手写。最后改动 2029-09-30。如果这个页面变了而我没改过它，那不是我。'), { colour: WEB.jrGrey }),
    ],
  };
}

export const home: Maker = m => {
  const visits = String(m.store.get('visits', 1)).padStart(6, '0');
  return frame(t("JR's page", 'JR 的小站'), [
    { kind: 'marquee', text: t('welcome!! no pictures from the cloud, everything drawn here by hand. best viewed on anything.', '欢迎！！这里没有云上的图，都是手画的。用什么看都行。'), colour: WEB.jrAmber, bg: WEB.jrBlack },
    text(t("Hi. I write code and I draw. N.O. lets me keep this page on his shop's server, so be nice to it. I keep a board too; if you have my number you have been there.",
      '你好。我写代码，也画画。N.O. 让我把这个页面放在他店里的服务器上，所以请对它好一点。我还有一个留言板；有我号码的人都去过。')),
    text(bold(t('Things I made', '我做的东西'), { colour: WEB.jrGreen })),
    ...WORKS.map((w): Block => {
      const name = typeof w.title === 'string' ? w.title : w.title.en;
      return {
        kind: 'row', gap: 12, cells: [
          { w: 150, blocks: [{ kind: 'img', img: green(WORK_PICTURES[name] ?? '/portfolio/monitor-standby-v04.png'), w: 150, h: 90, frame: WEB.jrGrey, href: w.url }] },
          { blocks: [
            text(w.url ? [link(w.title, w.url, { external: true, bold: true }), ` ↗  (${w.year})`] : [bold(w.title, { colour: WEB.jrGreen }), `  (${w.year})`]),
            text(w.body),
            ...(w.url ? [] : [small(t('You are using it now.', '你现在就在用它。'), { colour: WEB.jrGrey })]),
          ] },
        ],
      };
    }),
    text(bold(t('Things I am making', '在做的东西'), { colour: WEB.jrGreen })),
    text(t('A story called Lighthouse. A girl draws a lighthouse every night, and every morning there is one more on the shore. Six chapters so far. No ending.', '一个叫《灯塔》的故事。一个女孩每天晚上画一座灯塔，第二天早上，海边就多出一座。写到第六章了。还没有结局。')),
    { kind: 'buttons', items: [
      { top: 'SLOW POST', bottom: t('SLOW POST', '慢邮'), a: WEB.paper, b: WEB.risoRed, ink: WEB.riso, href: 'slowpost.net' },
      { top: "CHENG'S SKY", bottom: t('sky', '澄空'), a: WEB.pink, b: WEB.orchid, href: 'sky.homepage.cn/~cheng' },
      { top: 'NIGHT FERRY', bottom: t('forum', '夜航船'), a: WEB.forumPale, b: WEB.forum, href: 'yehangchuan.bbs.cn' },
      { top: 'HANDMADE', bottom: 'market', a: WEB.cream, b: WEB.umber, href: 'handmade.market' },
    ] },
    small(t(`visitor number ${visits}`, `你是第 ${visits} 位访客`), { colour: WEB.jrAmber }),
  ], 'home');
};

type Numbered = ReturnType<typeof messages>[number] & { n: number };
const numbered = (m: Machine): Numbered[] => messages(m).map((msg, i) => ({ ...msg, n: i + 1 }));

function letter(m: Machine, msg: Numbered): Block {
  return {
    kind: 'box', bg: WEB.nightPanel, border: WEB.jrGrey, pad: 8, blocks: [
      small(t(`#${msg.n} · ${msg.date} ${msg.time}`, `#${msg.n} · ${msg.date} ${msg.time}`), { colour: WEB.jrGrey }),
      text([bold(msg.from, { colour: WEB.jrGreen }), '  ', bold(m.t(msg.subject))]),
      rule({ colour: WEB.jrGrey, dotted: true }),
      text(msg.body),
    ],
  };
}

/** The board: the newest letter at the top, and every one of them below. */
export const board: Maker = m => {
  const all = numbered(m), newest = all[all.length - 1];
  if (newest) m.mark(readFlag(newest));
  return frame(t("JR's board", 'JR 的留言板'), [
    text([t('My little board. No internet, just one phone line. ', '我的小留言板。没有互联网，只有一根电话线。'), link(t('Write something', '写点什么'), `${BOARD_URL}/new`)]),
    ...(newest ? [small(t('newest', '最新一条'), { colour: WEB.jrAmber }), letter(m, newest)] : []),
    text(bold(t('Everything on the board', '所有留言'), { colour: WEB.jrGreen })),
    ...[...all].reverse().map((msg): Block => ({
      kind: 'row', gap: 8, cells: [
        { w: 28, blocks: [small(String(msg.n), { colour: WEB.jrGrey, align: 'right' })] },
        { w: 84, blocks: [small(msg.date, { colour: WEB.jrGrey })] },
        { w: 90, blocks: [text(msg.from, { colour: WEB.jrGreen })] },
        { blocks: [text(link(msg.subject, `${BOARD_URL}?n=${msg.n}`, { bold: !m.has(readFlag(msg)) }))] },
      ],
    })),
  ], 'board');
};

export const letterPage: Maker = (m, params) => {
  const all = numbered(m), n = Number(params.get('n')), msg = all.find(x => x.n === n);
  if (!msg) return board(m, params);
  m.mark(readFlag(msg));
  return frame(msg.subject, [
    text([
      ...(n > 1 ? [link(t('◄ older', '◄ 上一条'), `${BOARD_URL}?n=${n - 1}`), '    '] : []),
      link(t('all letters', '所有留言'), BOARD_URL),
      ...(n < all.length ? ['    ', link(t('newer ►', '下一条 ►'), `${BOARD_URL}?n=${n + 1}`)] : []),
    ]),
    letter(m, msg),
  ], 'board');
};

export const compose: Maker = () => frame(t("JR's board: write", 'JR 的留言板：写留言'), [
  text(t('You are writing as JACKIE. Everyone on the board will read it.', '你以 JACKIE 的身份写。留言板上的每个人都会看到。')),
  { kind: 'form', fields: [
    { name: 'subject', placeholder: t('subject', '标题'), w: 360, max: 40 },
    { name: 'body', placeholder: t('what you want to say', '想说的话'), w: 520, max: 400 },
  ], submit: t('Send', '发送'), bg: WEB.jrGrey,
  go: (v, m) => { post(m, v.subject, v.body); m.audio.sfx('disk', '0.4'); return BOARD_URL; } },
  small(t('Cheng usually answers in the evening.', '阿澄一般晚上回。'), { colour: WEB.jrGrey }),
], 'board');
