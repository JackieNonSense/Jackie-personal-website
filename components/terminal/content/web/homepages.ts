import { HW, WEB } from '../../crt/palette';
import { STARS, face } from './art';
import { bold, halftone, link, rule, small, song, space, t, text, type Maker } from './kit';
import type { Block } from '../../system/gui/page';

/*
 * Homepages: sites one person made and keeps. Lao Wang's weather, rewritten by hand
 * every morning; Cheng's fan site, which she stopped writing in July 2029 and which
 * has written itself every evening at nine since.
 */

export const weather: Maker = () => ({
  url: 'weather.laowang.cn', title: t("Lao Wang's weather", '老王的天气'), bg: WEB.white, fg: WEB.black, link: WEB.linkBlue,
  blocks: [
    song(t("LAO WANG'S WEATHER", '老 王 的 天 气'), { align: 'centre', colour: WEB.seekBlue }),
    small(t('9th floor · looked at by hand every morning since 2027', '九楼 · 2027 年起每天早上亲眼看一次'), { align: 'centre', colour: WEB.g55 }),
    rule({ colour: WEB.g70 }),
    { kind: 'box', w: 360, align: 'centre', bg: WEB.seekSky, border: WEB.seekBlue, pad: 10, blocks: [
      text(bold(t('14 March 2030, 6:00 in the morning', '2030 年 3 月 14 日 早上 6:00'), { colour: WEB.seekBlue })),
      text(t('Cloudy. 12°C on the balcony. East wind, a little.', '多云。阳台上 12 度。东风，一点点。')),
      text(t('One branch of the cherry downstairs came out overnight.', '楼下那棵樱花，夜里开了一枝。')),
    ] },
    small(t('Yesterday: clear, 14°C. The pigeons were back.', '昨天：晴，14 度。鸽子回来了。'), { align: 'centre', colour: WEB.g40 }),
    small(t('Before that: rain all day. I stayed in.', '前天：下了一天雨。我没出门。'), { align: 'centre', colour: WEB.g40 }),
    space(8),
    small(t('This page is not a forecast. It is what the sky was.', '本页不是预报。是那天早上的天。'), { align: 'centre', colour: WEB.g55 }),
  ],
});

/** Cheng's log: her own words, then the same words every evening at nine. */
const LOG: { date: string; text: [string, string] }[] = [
  { date: '2029.05.20', text: ['Gallery: the Lighthouse girl, designed with JR ~Cheng~', '画廊更新：和 JR 一起画的《灯塔》女主角设定～ ~澄~'] },
  { date: '2029.06.03', text: ['Starting at a company called Studio next month... nervous. Wish me luck ~Cheng~', '下个月要去一家叫 Studio 的公司上班了……有点紧张。祝我好运 ~澄~'] },
  { date: '2029.06.30', text: ['Last day of drawing at home. I will miss the rain on the window ~Cheng~', '在家画画的最后一天。会想念窗户上的雨声的 ~澄~'] },
  { date: '2029.07.01 21:00', text: ['Drawing hard at Studio today too! Good night everyone (^_^)', '今天也在 Studio 努力画画！大家晚安 (^_^)'] },
  { date: '2029.07.02 21:00', text: ['Drawing hard at Studio today too! Good night everyone (^_^)', '今天也在 Studio 努力画画！大家晚安 (^_^)'] },
  { date: '2029.07.03 21:00', text: ['Drawing hard at Studio today too! Good night everyone (^_^)', '今天也在 Studio 努力画画！大家晚安 (^_^)'] },
  { date: '2029.07.04 21:00', text: ['Drawing hard at Studio today too! Good night everyone (^_^)', '今天也在 Studio 努力画画！大家晚安 (^_^)'] },
];

const lilacBox = (title: [string, string], blocks: Block[]): Block => ({
  kind: 'box', bg: WEB.white, border: WEB.lilacDeep, pad: 6, head: { text: t(...title), bg: WEB.lilac, fg: WEB.purple }, blocks,
});

export const cheng: Maker = () => ({
  url: 'sky.homepage.cn/~cheng', title: t("Cheng's Sky", '澄空 ~ 阿澄的小站'), bg: WEB.white, fg: WEB.black, link: WEB.purple, tile: STARS,
  blocks: [
    { kind: 'box', w: 470, align: 'centre', bg: WEB.white, border: WEB.lilacDeep, pad: 4, blocks: [
      { kind: 'img', img: halftone('/terminal/pictures/lh-window.png', WEB.orchid, WEB.pinkPale, { invert: true, crop: [0.05, 0.08, 0.9, 0.7] }), w: 460, h: 70 },
      song(t("CHENG'S SKY", '澄  空'), { colour: WEB.violet }),
      small(t('fan art and doodles · since 2027.4.1', '同人与涂鸦 · 本站开放于 2027.4.1'), { colour: WEB.violet }),
      { kind: 'box', bg: WEB.lilac, pad: 3, blocks: [text([
        '[ ', link(t('Home', '首页'), 'sky.homepage.cn/~cheng'), ' | ', link(t('Gallery', '画廊'), 'sky.homepage.cn/~cheng/gallery'), ' | ',
        link(t('Diary', '日记'), 'sky.homepage.cn/~cheng'), ' | ', link(t('Guestbook', '留言本'), 'sky.homepage.cn/~cheng/guestbook'), ' | ', link(t('Links', '友链'), 'no-electronics.com/~jr'), ' ]',
      ], { align: 'centre' })] },
      { kind: 'marquee', text: t('~ welcome to my sky ~ every picture here I drew one stroke at a time ~', '～欢迎来到澄空～这里所有的图都是我一笔一笔画的～'), colour: HW.lightMagenta, bg: WEB.white },
      { kind: 'row', gap: 8, cells: [
        { w: 132, blocks: [lilacBox(['Webmaster', '站长'], [
          { kind: 'row', gap: 6, cells: [{ w: 26, blocks: [{ kind: 'img', img: face('cheng', WEB.purple, WEB.pinkPale), w: 24, h: 24 }] }, { blocks: [text('阿澄 ~澄~'), small(t('draws', '画画的'), { colour: WEB.g55 })] }] },
          text(t('Likes: lighthouses, rainy days', '喜欢：灯塔、下雨天')),
          text(t('Dislikes: the feed', '讨厌：推荐流')),
          small(t('Online for 1,062 days', '本站已运行 1,062 天'), { colour: WEB.orchid }),
          small(t('You are visitor 004,211', '你是第 004,211 位访客'), { colour: WEB.orchid }),
        ])] },
        { blocks: [lilacBox(['Updates', '更新日志'], LOG.flatMap(e => [small(e.date, { colour: WEB.orchid }), text(t(...e.text))]))] },
      ] },
      text([link(t('◄ previous', '◄ 上一站'), 'weather.laowang.cn'), '  |  ', bold(t('HAND RING · site 212', '手环 · 第 212 站'), { colour: WEB.violet }), '  |  ', link(t('next ►', '下一站 ►'), 'no-electronics.com/~jr')], { align: 'centre' }),
      { kind: 'buttons', align: 'centre', items: [
        { top: "JR'S PAGE", bottom: 'no-electronics', a: WEB.jrBlack, b: WEB.jrCobalt, ink: WEB.jrGreen, href: 'no-electronics.com/~jr' },
        { top: '}o{ moth', bottom: 'games', a: WEB.jrGreen, b: WEB.black, href: 'yehangchuan.bbs.cn/thread-3307' },
        { top: 'SLOW POST', bottom: t('SLOW POST', '慢邮'), a: WEB.paper, b: WEB.risoRed, ink: WEB.riso, href: 'slowpost.net' },
        { top: 'NOTEPAD', bottom: 'MADE', a: WEB.white, b: WEB.g40 },
      ] },
      small(t('Made in Notepad · best at 800 x 600', '本站用记事本手写 · 800×600 最佳'), { align: 'centre', colour: WEB.g55 }),
    ] },
  ],
});

export const chengGuestbook: Maker = () => ({
  url: 'sky.homepage.cn/~cheng/guestbook', title: t("Cheng's Sky: guestbook", '澄空 ~ 留言本'), bg: WEB.white, fg: WEB.black, link: WEB.purple, tile: STARS,
  blocks: [
    { kind: 'box', w: 470, align: 'centre', bg: WEB.white, border: WEB.lilacDeep, pad: 8, blocks: [
      song(t('GUESTBOOK', '留 言 本'), { colour: WEB.violet, align: 'centre' }),
      text([link(t('◄ back to the sky', '◄ 回到澄空'), 'sky.homepage.cn/~cheng')], { align: 'centre' }),
      rule({ dotted: true, colour: WEB.lilacDeep }),
      ...[
        ['JR', '2029.05.21 01:14', ['the girl has your hands. she holds the pen the way you do.', '女主角的手是你的手。她握笔的样子和你一样。']],
        ['阿澄', '2029.05.21 09:40', ['you noticed!! ~Cheng~', '被你发现了！！~澄~']],
        ['moth', '2029.06.04 02:02', ['studio huh. dont let them make you tidy }o{', 'studio 啊。别让他们把你弄得太整齐 }o{'],],
        ['JR', '2029.08.11 23:59', ['are you there? the real you? write anything. spell something wrong.', '你还在吗？真的你？随便写点什么。写错一个字也行。']],
        ['阿澄', '2029.08.12 21:00', ['Thank you for visiting! Drawing hard at Studio today too! (^_^)', '谢谢你的来访！今天也在 Studio 努力画画！(^_^)']],
      ].flatMap(([who, when, words]) => [
        text([bold(who as string, { colour: WEB.purple }), '  ', { text: when as string, colour: WEB.g55 }]),
        text(t(...(words as [string, string]))),
        rule({ dotted: true, colour: WEB.lilac }),
      ]),
    ] },
  ],
});

export const chengGallery: Maker = () => ({
  url: 'sky.homepage.cn/~cheng/gallery', title: t("Cheng's Sky: gallery", '澄空 ~ 画廊'), bg: WEB.white, fg: WEB.black, link: WEB.purple, tile: STARS,
  blocks: [
    { kind: 'box', w: 470, align: 'centre', bg: WEB.white, border: WEB.lilacDeep, pad: 8, blocks: [
      song(t('GALLERY', '画  廊'), { colour: WEB.violet, align: 'centre' }),
      text([link(t('◄ back to the sky', '◄ 回到澄空'), 'sky.homepage.cn/~cheng')], { align: 'centre' }),
      { kind: 'row', gap: 8, cells: ['lh-one', 'lh-two', 'lh-coast'].map(n => ({ blocks: [{ kind: 'img', img: halftone(`/terminal/pictures/${n}.png`, WEB.orchid, WEB.pinkPale, { invert: true }), w: 140, h: 90, frame: WEB.lilacDeep }] })) },
      small(t('Lighthouse, with JR. 2029. Drawn by hand, both of us.', '《灯塔》，和 JR 一起。2029 年。两个人都是手画的。'), { align: 'centre', colour: WEB.g55 }),
      small(t('Newer pictures: at Studio (^_^)', '更新的画：在 Studio (^_^)'), { align: 'centre', colour: WEB.orchid }),
    ] },
  ],
});
