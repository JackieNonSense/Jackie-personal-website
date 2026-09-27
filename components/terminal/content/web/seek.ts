import { WEB } from '../../crt/palette';
import { bold, link, rule, serif, small, space, t, text, type Maker } from './kit';
import type { Block } from '../../system/gui/page';
import type { Text } from '../../system/i18n';

/*
 * SEEK, a search engine that still has a page an old browser can read. It finds the
 * few pages people wrote, and hides the forty-one billion others; the two big sites
 * it can reach send NAVIGATOR only a shell and the words they leave for old machines.
 */

export const SEEK = 'seek.com';

/** What SEEK knows of the people's web: an address, what it is, the words that find it. */
const INDEX: { url: string; title: Text; says: Text; words: string[] }[] = [
  { url: 'slowpost.net', title: t('SLOW POST, a weekly letter', '慢邮 SLOW POST · 每周一封'), says: t('Things people made by hand, sent out by three people.', '人手做的东西，由三个人寄出。'), words: ['slow', 'post', 'zine', 'weekly', '慢邮', '周刊'] },
  { url: 'weather.laowang.cn', title: t("Lao Wang's weather", '老王的天气'), says: t('The sky as it was this morning, looked at by hand.', '今天早上的天，亲眼看的。'), words: ['weather', 'wang', 'sky', '天气', '老王'] },
  { url: 'sky.homepage.cn/~cheng', title: t("Cheng's Sky", '澄空 ~ 阿澄的小站'), says: t('Fan art and doodles. Updated every evening at nine.', '同人与涂鸦。每天晚上九点更新。'), words: ['cheng', 'sky', 'fan', 'art', 'lighthouse', '澄', '阿澄', '同人', '灯塔'] },
  { url: 'yehangchuan.bbs.cn', title: t('Night Ferry, a forum for slow lines', '夜航船 · 慢线路讨论区'), says: t('Missing, the feed, classifieds.', '寻人启事、推荐流、分类信息。'), words: ['forum', 'ferry', 'bbs', 'moth', 'rooms', 'missing', '论坛', '夜航船', '寻人', '房间'] },
  { url: 'handmade.market', title: t('Handmade Market', '人手集市'), says: t('Only what people made, priced in hours.', '只卖人做的东西，按人时定价。'), words: ['market', 'handmade', 'buy', 'art', 'jr', '集市', '买', '人手'] },
  { url: 'no-electronics.com/~jr', title: t("JR's page", 'JR 的小站'), says: t('Written by hand in Notepad. A board, and things he made.', '用记事本手写。一个留言板，和他做的东西。'), words: ['jr', 'jackie', 'random', 'inktrace', 'deck', 'terminal', 'board', 'n.o.', '小站', '留言板'] },
];
const GENERATED: { url: string; title: Text; words: string[] }[] = [
  { url: 'studio.ai', title: t('Studio: more like an artist than the artist', 'Studio：比画师更像画师'), words: ['studio', 'ai', 'style', 'model', 'cheng', '画风', '模型', '生成'] },
  { url: 'foryou.feed', title: t('For you', '为你推荐'), words: ['feed', 'for you', 'jr', 'art', '推荐', '风格'] },
];

const form: Block = { kind: 'form', fields: [{ name: 'q', placeholder: t('what are you looking for?', '你在找什么？'), w: 300, max: 40 }], submit: t('Seek', '搜索'), go: v => `${SEEK}/?q=${encodeURIComponent(v.q)}` };

export const seek: Maker = () => ({
  url: SEEK, title: 'SEEK', bg: WEB.white, fg: WEB.black, link: WEB.linkBlue,
  blocks: [
    space(18),
    serif('SEEK', 44, { colour: WEB.seekBlue, align: 'centre' }),
    small(t('41,208,113,556 pages · the ones people wrote, first', '41,208,113,556 个网页 · 人写的排在前面'), { align: 'centre', colour: WEB.g55 }),
    space(6),
    { kind: 'box', w: 420, align: 'centre', blocks: [form] },
    text([link(t('SLOW POST', '慢邮'), 'slowpost.net'), '   ', link(t('Night Ferry', '夜航船'), 'yehangchuan.bbs.cn'), '   ', link(t('Handmade Market', '人手集市'), 'handmade.market')], { align: 'centre' }),
    rule({ colour: WEB.g85 }),
    small(t('Today: 4.1 billion new pages. Written by people: 0.003%.', '今天：新增 41 亿个网页。人写的：0.003%。'), { align: 'centre', colour: WEB.g55 }),
  ],
});

export const results: Maker = (m, params) => {
  const q = (params.get('q') ?? '').trim(), words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = <T extends { words: string[] }>(list: T[]) => list.filter(e => words.some(w => e.words.some(k => k.includes(w) || w.includes(k))));
  const people = hits(INDEX), made = hits(GENERATED);
  return {
    url: `${SEEK}/?q=${encodeURIComponent(q)}`, title: t(`SEEK: ${q}`, `SEEK：${q}`), bg: WEB.white, fg: WEB.black, link: WEB.linkBlue,
    blocks: [
      { kind: 'row', gap: 12, cells: [{ w: 100, blocks: [serif('SEEK', 26, { colour: WEB.seekBlue })] }, { blocks: [space(2), form] }] },
      rule({ colour: WEB.g85 }),
      small(t(`"${q}": written by people, ${people.length}. Generated, about 41,208,113 (hidden).`, `「${q}」：人写的 ${people.length} 条。生成的约 41,208,113 条（已隐藏）。`), { colour: WEB.g40 }),
      ...people.flatMap(e => [text(link(e.title, e.url, { bold: true })), text(e.says), small(e.url, { colour: WEB.leaf })]),
      ...(people.length ? [] : [text(t('Nobody has written this. Would you like one made for you?', '没有人写过这个。要不要为你生成一个？')), text(link(t('Make it', '生成'), 'foryou.feed'))]),
      ...(made.length ? [rule({ dotted: true, colour: WEB.g70 }), small(t('Generated, shown because you asked for them by name:', '生成的，因为你点了名才显示：'), { colour: WEB.g55 }), ...made.map(e => text(link(e.title, e.url)))] : []),
    ],
  };
};

/** The shell a generated site sends an old browser. */
const tooOld: Block = {
  kind: 'box', bg: WEB.g85, border: WEB.g40, pad: 8, blocks: [
    text(bold(t('Your browser is out of date.', '您的浏览器版本过旧。'))),
    text(t('This site needs Chrome 140 or later, WebGPU and an account. What we could send you is below.', '本站需要 Chrome 140 或更高版本、WebGPU 和一个账号。能发给您的部分在下面。')),
  ],
};
const alt = (words: Text): Block => ({ kind: 'box', border: WEB.g70, pad: 6, blocks: [small(t('[image]', '[图片]'), { colour: WEB.g55 }), text(words)] });

export const studio: Maker = () => ({
  url: 'studio.ai', title: 'Studio', bg: WEB.white, fg: WEB.black, link: WEB.linkBlue,
  done: t('Document: Done (214 script errors)', '文档：完成（脚本错误 214 个）'),
  blocks: [
    serif('STUDIO', 34),
    tooOld,
    alt(t('hero.webp: a girl on a water tower at night, the city lit below. Style source: donor 0003.', 'hero.webp：夜里，一个女孩坐在水塔上，下面是城市的灯。风格来源：供体 0003。')),
    alt(t('Our new style model, JR-7: more like an artist than the artist.', '新一代画风模型「JR-7」：比画师更像画师。')),
    alt(t("Team: our new style director CHENG ~Cheng~ can't wait to work with you! (^_^)", '团队：新任风格总监 CHENG ~澄~ 期待与你合作！(^_^)')),
    small(t('© 2030 Studio. This page was generated. People involved: 0.', '© 2030 Studio。本页由模型生成。参与人数：0。'), { colour: WEB.g55 }),
  ],
});

export const feed: Maker = () => ({
  url: 'foryou.feed', title: t('For you', '为你推荐'), bg: WEB.black, fg: WEB.white, link: WEB.neonCyan,
  done: t('Document: Done (scrolling needs JavaScript)', '文档：完成（继续滚动需要 JavaScript）'),
  blocks: [
    serif('for you', 30, { colour: WEB.neonPink }),
    { kind: 'box', bg: WEB.g25, pad: 6, blocks: [text(t('Turn on JavaScript to keep scrolling.', '请打开 JavaScript 以继续滚动。'))] },
    ...[
      t('#40211 Girl on a water tower, in the style of JR (generated) ♥ 38.2K', '#40211《水塔上的女孩》JR 风格（生成）♥ 38.2K'),
      t('#40212 Rooftop, night, in the style of JR (generated) ♥ 12.9K', '#40212《天台，夜》JR 风格（生成）♥ 12.9K'),
      t('#40213 Lighthouse, chapter 7, in the style of JR (generated) ♥ 91.0K', '#40213《灯塔》第七章，JR 风格（生成）♥ 91.0K'),
    ].map(w => ({ kind: 'box', border: WEB.g40, pad: 6, blocks: [small(t('[image]', '[图片]'), { colour: WEB.g55 }), text(w)] } as Block)),
    small(t('Creator: JR (verified donor). New works in this style: 41,208 a second.', '作者：JR（已认证供体）。这个风格的新作品：每秒 41,208 件。'), { colour: WEB.g70 }),
  ],
});
