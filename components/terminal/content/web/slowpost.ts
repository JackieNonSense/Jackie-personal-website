import { WEB } from '../../crt/palette';
import { STAMP } from './art';
import { halftone, link, rule, serif, small, song, space, t, text, type Maker } from './kit';
import { measure } from '../../graphics/webtype';
import type { Block, Img } from '../../system/gui/page';
import type { Text } from '../../system/i18n';

/*
 * SLOW POST: a weekly letter of things people made by hand, found on what is left of
 * the web and sent out by three people. It is NAVIGATOR's home page. It looks like
 * the zines its editors used to print: cream paper, one ink at a time, a stamp in
 * its name.
 */

export const HOME = 'slowpost.net';
const PICTURES = '/terminal/pictures/', PHOTOS = '/terminal/photos/';

type Story = { id: string; kind: Text; title: Text; date: string; img: Img; body: Block[] };

const blue = (url: string, crop?: readonly [number, number, number, number]) => halftone(url, WEB.riso, WEB.paper, { invert: true, crop });
const red = (url: string, crop?: readonly [number, number, number, number]) => halftone(url, WEB.risoRed, WEB.paper, { invert: true, crop });

const STORIES: Story[] = [
  {
    id: 'weather', kind: t('COVER', '封面故事'), date: '2030-03-14',
    title: t('Three years of weather by hand: every morning at six he goes up on the roof, looks at the sky, and writes it down', '一个人手写了三年的天气网站：每天早上六点，他上楼顶看一眼天，再把它写下来'),
    img: blue(`${PICTURES}city.png`, [0.3, 0, 0.7, 1]),
    body: [
      text(t('Lao Wang is sixty-one and lives on the ninth floor. His weather site has had one page since 2027, and every morning he rewrites it: the sky, the wind, the temperature from the thermometer on his balcony, and one more line about something he saw.',
        '老王六十一岁，住九楼。他的天气网站从 2027 年起就只有一页，每天早上重写一遍：天色，风，阳台上那支温度计的读数，再加一行他看见的事。')),
      text(t('"The forecasts on my phone are always right and never true," he says. "Mine are sometimes wrong. But I was there."', '「手机上的预报每次都准，可从来不是真的。」他说，「我的有时候不准。但那天早上我在场。」')),
      text(t('He has never missed a morning. The one day he was in hospital, his neighbour went up to the roof for him and wrote: "Cloudy. Lao Wang is fine."', '他一个早上都没落下过。住院那天，邻居替他上了楼顶，写了一句：「多云。老王没事。」')),
      text([t('Go and see it: ', '去看看：'), link(t('Lao Wang\'s weather', '老王的天气'), 'weather.laowang.cn')]),
    ],
  },
  {
    id: 'market', kind: t('HANDMADE', '手作'), date: '2030-03-12',
    title: t('The Handmade Market opens: every piece comes with how it was made, and is priced in hours', '人手集市开张：每一件都附着它是怎么做出来的，按人时定价'),
    img: red(`${PICTURES}lh-window.png`, [0.15, 0, 0.7, 1]),
    body: [
      text(t('Nothing on the Handmade Market may be generated. Every drawing is sold with its stroke count and the time it took, every story with its drafts. An hour of a person costs sixty yuan; a drawing of fourteen hours costs what fourteen hours cost.',
        '人手集市上的东西，一件都不许是生成的。每张画都附着笔数和作画时长，每篇小说都附着草稿。一个人的一小时是六十块钱；一张画了十四个小时的画，就卖十四个小时的价钱。')),
      text(t('We bought a sketch of a lighthouse from a stall called JR. It took him six hours. You can see where he gave up on the first sea and drew a second.', '我们从一个叫 JR 的摊位买了一张灯塔的草图，画了六个小时。你能看出他第一片海画坏了，又画了一片。')),
      text([t('Visit: ', '去逛逛：'), link(t('the Handmade Market', '人手集市'), 'handmade.market')]),
    ],
  },
  {
    id: 'moth', kind: t('MISSING', '寻人'), date: '2030-04-03',
    title: t('Has anyone heard from MOTH lately?', '有人最近收到 MOTH 的消息吗？'),
    img: blue(`${PHOTOS}moth.jpg`),
    body: [
      text(t('MOTH made small games with no capital letters in them. His last post in his own voice was in March: going to the rooms for a bit, see you on teh other side.', 'MOTH 做一些很小的游戏，文字里一个大写字母都没有。他最后一次用自己的口气发帖是三月：去房间待一阵，在见。')),
      text(t('His account still posts every day. If you have spoken to him, to him, since then, a thread is open on Night Ferry.', '他的账号现在每天都还在发帖。三月以后，如果你和他本人说过话，夜航船上有一个帖子。')),
      text([link(t('The thread on Night Ferry', '夜航船上的帖子'), 'yehangchuan.bbs.cn/thread-3307')]),
    ],
  },
];

const tabs = (active: string): Block => ({
  kind: 'tabs', on: WEB.ink, onText: WEB.paper, off: WEB.g85, offText: WEB.ink,
  items: [
    { label: t('All', '全部'), href: HOME, on: active === 'all' },
    { label: t('Cover', '封面故事'), href: `${HOME}/weather`, on: active === 'weather' },
    { label: t('Handmade', '手作'), href: `${HOME}/market`, on: active === 'market' },
    { label: t('Missing', '寻人'), href: `${HOME}/moth`, on: active === 'moth' },
    { label: t('Night Ferry', '夜航船'), href: 'yehangchuan.bbs.cn' },
  ],
});

/** SLOW P[stamp]ST, ruled above and below, with its Chinese name to the right. */
const masthead: Block[] = [
  rule({ double: true, colour: WEB.ink }),
  { kind: 'row', gap: 0, cells: [
    { w: measure('serif', 'SLOW P', 50) + 4, blocks: [serif('SLOW P', 50, { colour: WEB.ink })] },
    { w: 52, blocks: [space(10), { kind: 'img', img: STAMP, w: 48, h: 45 }] },
    { w: measure('serif', 'ST', 50) + 4, blocks: [serif('ST', 50, { colour: WEB.ink })] },
    { blocks: [space(14), song(t('SLOW POST', '慢  邮'), { colour: WEB.risoRed, align: 'right' }), small('No. 38', { colour: WEB.ink, align: 'right' })] },
  ] },
  rule({ double: true, colour: WEB.ink }),
];

const footer: Block[] = [
  space(6), rule({ dotted: true, colour: WEB.ink }),
  small(t('SLOW POST · No. 38 · written by three people · replies go to the editors at this address', '慢邮 · 第 38 期 · 本期由三个人手写 · 回信请寄本站'), { colour: WEB.g55 }),
];

export const slowpost: Maker = () => ({
  url: HOME, title: t('SLOW POST · No. 38', '慢邮 SLOW POST · 第 38 期'), bg: WEB.paper, fg: WEB.ink, link: WEB.riso,
  blocks: [
    tabs('all'),
    ...masthead,
    text(t('One letter a week, of things people made. 14 March 2030 · written by three people.', '每周一封，只收人做的东西。2030 年 3 月 14 日 · 本期由三个人手写。')),
    space(8),
    ...STORIES.map((s): Block => ({ kind: 'card', img: s.img, kicker: s.kind, title: s.title, date: s.date, href: `${HOME}/${s.id}`, ink: s.img.kind === 'halftone' ? s.img.ink : WEB.riso })),
    ...footer,
  ],
});

export const stories: Record<string, Maker> = Object.fromEntries(STORIES.map(s => [`${HOME}/${s.id}`, () => ({
  url: `${HOME}/${s.id}`, title: s.title, bg: WEB.paper, fg: WEB.ink, link: WEB.riso,
  blocks: [
    tabs(s.id),
    small(s.kind, { colour: s.img.kind === 'halftone' ? s.img.ink : WEB.riso }),
    song(s.title, { lead: 20 }),
    small(s.date, { colour: WEB.g55 }),
    space(4),
    { kind: 'img', img: s.img, w: 420, h: 150, frame: WEB.ink },
    ...s.body,
    ...footer,
  ],
})]));
