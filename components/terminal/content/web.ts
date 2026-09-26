import { HW, grey } from '../crt/palette';
import { WORKS } from './board';
import { HEADLINES } from './tv/news';
import type { Block, Page, Run } from '../system/gui/page';
import type { Gfx } from '../system/gui/gfx';
import type { Rect } from '../system/gui/geometry';
import type { Text } from '../system/i18n';
import type { Machine } from '../system/machine';

/*
 * The web of 2030, as NAVIGATOR sees it down the phone line. It is an old browser:
 * the big generated sites send it scripts it cannot run, and all it shows of them is
 * the text they leave for machines like it (which says more than it should). Pages
 * written by hand come through whole.
 */

export const HOME = 'seek.com';
const SEED_READ = 'file:SYSTEM/SEED.LOG';

const t = (en: string, zh: string): Text => ({ en, zh });
const a = (text: Text, href: string, o: Partial<Run> = {}): Run => ({ text, href, ...o });
const p = (...runs: (Text | Run)[]): Block => ({ kind: 'p', runs });
const h = (text: Text, size: 1 | 2 = 1, o: Partial<Extract<Block, { kind: 'h' }>> = {}): Block => ({ kind: 'h', text, size, ...o });
const small = (text: Text, colour: number = HW.darkGrey): Block => ({ kind: 'p', runs: [text], colour });
/** A picture that will not come: its box and the words left for it. */
const alt = (w: number, hh: number, text: Text): Block => ({ kind: 'img', w, h: hh, alt: text });

/** The shell a generated site sends an old browser: it asks for a newer one. */
const tooOld = (): Block => ({
  kind: 'box', bg: HW.grey, border: HW.black, blocks: [
    p({ text: t('Your browser is out of date.', '您的浏览器版本过旧。'), bold: true }),
    p(t('This site needs Chrome 140 or later, WebGPU, and an account. The parts it could send you are below.',
      '本站需要 Chrome 140 或更高版本、WebGPU 和一个账号。能发给您的部分在下面。')),
  ],
});

// ── Pictures drawn in the page ────────────────────────────────────────────────

function door(g: Gfx, r: Rect, time: number): void {
  g.fill(r, HW.white);
  const cx = r.x + r.w / 2, top = r.y + 8;
  g.fill({ x: cx - 30, y: top, w: 60, h: r.h - 16 }, HW.black);
  g.fill({ x: cx - 26, y: top + 4, w: 52, h: r.h - 20 }, grey(70));
  const open = 6 + Math.sin(time * 0.8) * 3;
  g.fill({ x: cx - 26, y: top + 4, w: open, h: r.h - 20 }, HW.yellow);
  g.fill({ x: cx + 16, y: top + (r.h - 16) / 2, w: 4, h: 4 }, HW.white);
}

function seedMark(g: Gfx, r: Rect): void {
  g.fill(r, HW.white);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2 + 6;
  for (let y = -22; y <= 22; y++) {
    const half = Math.round(15 * Math.sqrt(Math.max(0, 1 - (y / 22) ** 2)));
    g.fill({ x: cx - half, y: cy + y, w: 2 * half, h: 1 }, HW.brown);
  }
  g.fill({ x: cx - 1, y: cy - 36, w: 2, h: 14 }, HW.green);
  g.fill({ x: cx - 12, y: cy - 36, w: 11, h: 5 }, HW.lightGreen);
  g.fill({ x: cx + 1, y: cy - 32, w: 11, h: 5 }, HW.lightGreen);
}

function construction(g: Gfx, r: Rect, time: number): void {
  // Yellow and black, the stripes crawling, the way every homepage had one.
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x += 1) {
    const band = Math.floor((x - r.x + y - r.y + time * 20) / 8) % 2;
    g.fill({ x, y, w: 1, h: 1 }, band ? HW.yellow : HW.black);
  }
  g.fill({ x: r.x + 10, y: r.y + r.h / 2 - 10, w: r.w - 20, h: 20 }, HW.black);
}

function counter(g: Gfx, r: Rect, digits: string): void {
  g.fill(r, HW.black);
  for (let i = 0; i < digits.length; i++) {
    const cell = { x: r.x + 2 + i * 14, y: r.y + 2, w: 12, h: r.h - 4 };
    g.fill(cell, grey(40));
    g.text(cell.x + 2, cell.y + (cell.h - 16) / 2, digits[i], HW.lightGreen);
  }
}

// ── The pages ────────────────────────────────────────────────────────────────

type Maker = (m: Machine, params: URLSearchParams) => Page;

const seek: Maker = () => ({
  url: 'seek.com', title: 'SEEK', bg: HW.white, fg: HW.black, link: HW.blue,
  blocks: [
    { kind: 'space', h: 16 },
    h('SEEK', 1, { align: 'centre', colour: HW.blue }),
    p({ text: t('Search 41,208,113,556 pages', '搜索 41,208,113,556 个网页'), colour: HW.darkGrey }),
    { kind: 'field', placeholder: t('what are you looking for?', '你在找什么？'), button: t('Seek', '搜索'), go: q => `seek.com/?q=${encodeURIComponent(q)}` },
    p(a(t('For you', '为你推荐'), 'foryou.feed'), '   ', a(t('News', '新闻'), 'news.today/lite'), '   ', a(t('The Rooms', '房间计划'), 'therooms.org'), '   ', a(t('SEED', '种子计划'), 'seed.org')),
    { kind: 'hr' },
    small(t('Today: 4.1 billion new pages. Written by people: 0.003%.', '今天：新增 41 亿个网页。人写的：0.003%。')),
  ],
});

/** What SEEK knows: a page, what it says about it, and the words that find it. */
const INDEX: { url: string; title: Text; says: Text; words: string[] }[] = [
  { url: 'studio.ai', title: t('Studio: more like an artist than the artist', 'Studio：比画师更像画师'), says: t('Style models, made from the best donors.', '画风模型，用最好的供体做成。'), words: ['studio', 'ai', 'style', 'model', 'cheng', '画风', '模型', '阿澄', '生成'] },
  { url: 'foryou.feed', title: t('For you', '为你推荐'), says: t('Works in the style of JR, and 40,000 more a second.', 'JR 风格的作品，每秒还有四万件。'), words: ['feed', 'jr', 'art', 'drawing', 'lighthouse', '推荐', '画', '灯塔', '风格'] },
  { url: 'news.today/lite', title: t('Today: the news, lite', '今日新闻（简版）'), says: t('Headlines for slow connections.', '给慢速连接的头条。'), words: ['news', 'today', 'market', '新闻', '市场'] },
  { url: 'therooms.org', title: t('The Rooms: be yourself', '房间计划：做你自己'), says: t('Bed and board. High pay. No experience needed.', '包食宿，高收入，无需经验。'), words: ['rooms', 'room', 'donor', 'job', 'moth', '房间', '供体', '招募', '工作'] },
  { url: 'seed.org', title: t('SEED: thank you, donors', '种子计划：感谢所有供体'), says: t('Every model grows from a seed.', '每一个模型都从种子长出来。'), words: ['seed', 'donor', 'pipeline', 'os-score', '种子', '供体'] },
  { url: 'no-electronics.com/~jr/', title: t("JR's page", 'JR 的小站'), says: t('Written by hand in Notepad. Last updated 2029.', '用记事本手写。最后更新于 2029 年。'), words: ['jr', 'jackie', 'random', 'inktrace', 'deck', 'terminal', '灯塔', '小站', 'n.o.'] },
];

const results: Maker = (m, params) => {
  const q = (params.get('q') ?? '').trim(), words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const found = INDEX.filter(e => words.some(w => e.words.some(k => k.includes(w) || w.includes(k))));
  return {
    url: `seek.com/?q=${encodeURIComponent(q)}`, title: t(`SEEK: ${q}`, `SEEK：${q}`), bg: HW.white, fg: HW.black, link: HW.blue,
    blocks: [
      h('SEEK', 2, { colour: HW.blue }),
      { kind: 'field', placeholder: t('seek again', '再搜一次'), button: t('Seek', '搜索'), go: next => `seek.com/?q=${encodeURIComponent(next)}` },
      small(found.length
        ? t(`About 41,208,113 results for "${q}". Written by people: ${found.length}.`, `「${q}」约有 41,208,113 条结果。人写的：${found.length} 条。`)
        : t(`About 41,208,113 results for "${q}". Written by people: none.`, `「${q}」约有 41,208,113 条结果。人写的：0 条。`)),
      { kind: 'hr' },
      ...found.flatMap(e => [p(a(e.title, e.url, { bold: true })), small(e.says, HW.black), small(t(e.url, e.url), HW.green)]),
      ...(found.length ? [] : [p(t('Nobody has written this. Would you like one made for you?', '没有人写过这个。要不要为你生成一个？'), ' ', a(t('Make it', '生成'), 'foryou.feed'))]),
    ],
  };
};

const studio: Maker = () => ({
  url: 'studio.ai', title: 'Studio', bg: HW.white, fg: HW.black, link: HW.blue,
  done: t('Document: Done (214 script errors)', '文档：完成（脚本错误 214 个）'),
  blocks: [
    h('STUDIO', 1),
    tooOld(),
    alt(360, 64, t('hero.webp: a girl on a water tower at night, the city lit below. Style source: donor 0003.', 'hero.webp：夜里，一个女孩坐在水塔上，下面是城市的灯。风格来源：供体 0003。')),
    alt(360, 48, t('Our new style model JR-7: more like an artist than the artist.', '新一代画风模型「JR-7」：比画师更像画师。')),
    alt(360, 48, t('Team: our new style director CHENG ~Cheng~ can\'t wait to work with you! (^_^)', '团队：新任风格总监 CHENG ~澄~ 期待与你合作！(^_^)')),
    alt(360, 48, t('Careers: prompt engineers, style collectors, donor relations.', '加入我们：提示词工程师、风格采集员、供体关系专员。')),
    small(t('© 2030 Studio. This page was generated. People involved: 0.', '© 2030 Studio。本页由模型生成。参与人数：0。')),
  ],
});

const feed: Maker = () => ({
  url: 'foryou.feed', title: t('For you', '为你推荐'), bg: HW.black, fg: HW.white, link: HW.lightCyan,
  done: t('Document: Done (scrolling needs JavaScript)', '文档：完成（继续滚动需要 JavaScript）'),
  blocks: [
    h(t('for you', '为你推荐'), 1, { colour: HW.lightRed }),
    { kind: 'box', bg: HW.darkGrey, fg: HW.white, blocks: [p(t('Turn on JavaScript to keep scrolling.', '请打开 JavaScript 以继续滚动。'))] },
    alt(260, 40, t('#40211 Girl on a water tower, in the style of JR (generated) ♥ 38.2K', '#40211《水塔上的女孩》JR 风格（生成）♥ 38.2K')),
    alt(260, 40, t('#40212 Rooftop, night, in the style of JR (generated) ♥ 12.9K', '#40212《天台，夜》JR 风格（生成）♥ 12.9K')),
    alt(260, 40, t('#40213 Lighthouse, chapter 7, in the style of JR (generated) ♥ 91.0K', '#40213《灯塔》第七章，JR 风格（生成）♥ 91.0K')),
    alt(260, 40, t('#40214 A city, first year, in the style of JR (generated) ♥ 4.4K', '#40214《城市，大一》JR 风格（生成）♥ 4.4K')),
    small(t('Creator: JR (verified donor). New works in this style: 41,208 a second.', '作者：JR（已认证供体）。这个风格的新作品：每秒 41,208 件。'), HW.grey),
  ],
});

const news: Maker = m => ({
  url: 'news.today/lite', title: t('Today (lite)', '今日（简版）'), bg: HW.white, fg: HW.black, link: HW.blue,
  blocks: [
    h(t('TODAY', '今日'), 1),
    small(t('The lite edition, for slow connections. No pictures, no scripts.', '简版，给慢速连接。没有图片，没有脚本。')),
    { kind: 'hr' },
    { kind: 'list', items: HEADLINES.map((hl, i) => (i === 2 ? [a(hl, 'therooms.org')] : i === 5 ? [a(hl, 'seed.org')] : i === 1 ? [a(hl, 'studio.ai')] : [hl])) },
    { kind: 'hr' },
    small(t(`Updated ${m.t({ en: 'a minute ago', zh: '一分钟前' })}. Written by: Today newsroom (automated).`, '一分钟前更新。撰稿：今日新闻编辑部（自动）。')),
  ],
});

const rooms: Maker = m => ({
  url: 'therooms.org', title: t('The Rooms', '房间计划'), bg: HW.white, fg: HW.black, link: HW.blue,
  blocks: [
    { kind: 'img', w: 120, h: 96, alt: t('a door, a little open', '一扇门，开了一点'), draw: door, align: 'centre' },
    h(t('THE ROOMS', '房间计划'), 1, { align: 'centre' }),
    p({ text: t('We noticed you are using a very old computer. People who use old computers make the best donors.', '我们注意到你在用一台很旧的电脑。用旧电脑的人，往往是最好的供体。'), bold: true }),
    { kind: 'list', items: [[t('Bed and board', '包食宿')], [t('High pay', '高收入')], [t('No experience needed. Just be yourself.', '无需经验。做你自己就好。')]] },
    h(t('Questions', '常见问题'), 2),
    p({ text: t('What does a donor do?', '供体要做什么？'), bold: true }),
    p(t('What you already do. Draw, write, hesitate. We only watch.', '你本来就在做的事：画画、写字、犹豫。我们只是看着。')),
    p({ text: t('Can I go home?', '我可以回家吗？'), bold: true }),
    p(t('The room is your home.', '房间就是你的家。')),
    p({ text: t('Does it hurt?', '会疼吗？'), bold: true }),
    p(t('No. You will not even notice.', '不会。你甚至不会注意到。')),
    ...(m.has(SEED_READ) ? [{ kind: 'box', bg: HW.yellow, border: HW.black, blocks: [
      p({ text: t('Intake 10, waiting list: J. RANDOM. Status: accepted. Line: telephone. There is no need to come to us.', '第十期候补名单：J. RANDOM。状态：已录取。线路：电话线。你不需要来找我们。'), bold: true }),
    ] } as Block] : []),
    { kind: 'marquee', text: t('*** INTAKE 9 NOW OPEN *** APPLY TONIGHT *** WE CALL AT 3:07 ***', '*** 第九期招募中 *** 今晚申请 *** 我们凌晨 3:07 来电 ***'), colour: HW.red },
    p(a(t('Apply now', '立即申请'), 'therooms.org/apply', { bold: true })),
  ],
});

const apply: Maker = () => ({
  url: 'therooms.org/apply', title: t('The Rooms: apply', '房间计划：申请'), bg: HW.white, fg: HW.black, link: HW.blue,
  blocks: [
    h(t('Apply', '申请'), 1),
    p(t('Your name is all we need. We already know the rest.', '我们只需要你的名字。其余的我们都知道了。')),
    { kind: 'field', placeholder: t('your name', '你的名字'), button: t('Send', '提交'), go: name => `therooms.org/thanks?name=${encodeURIComponent(name)}` },
    small(t('By sending you agree that everything you make from now on may be used to make more.', '提交即表示你同意：从现在起你做的一切，都可以用来做出更多。')),
  ],
});

const thanks: Maker = (_m, params) => {
  const name = params.get('name') ?? '';
  return {
    url: `therooms.org/thanks?name=${encodeURIComponent(name)}`, title: t('The Rooms: thank you', '房间计划：谢谢'), bg: HW.white, fg: HW.black, link: HW.blue,
    blocks: [
      { kind: 'space', h: 30 },
      h(t(`Thank you, ${name}.`, `谢谢你，${name}。`), 1, { align: 'centre' }),
      p(t('We will call at 3:07. You do not need to get anything ready. You do not need to answer.', '我们会在凌晨 3:07 来电。你不需要做任何准备。你也不需要接。')),
    ],
  };
};

const seed: Maker = m => ({
  url: 'seed.org', title: t('SEED', '种子计划'), bg: HW.white, fg: HW.black, link: HW.blue,
  blocks: [
    { kind: 'img', w: 80, h: 80, alt: t('a seed', '一颗种子'), draw: (g, r) => seedMark(g, r), align: 'centre' },
    h(t('SEED', '种子计划'), 1, { align: 'centre', colour: HW.green }),
    p(t('Every model grows from a seed. A seed is something a person made: a stroke, a sentence, a hesitation. We thank every one of our donors.',
      '每一个模型都从种子长出来。种子是人做的东西：一笔画，一句话，一次犹豫。我们感谢每一位供体。')),
    h(t('Our donors', '我们的供体'), 2),
    { kind: 'list', items: [
      [t('Donor 0001. Status: exhausted.', '供体 0001。状态：耗尽。')],
      [t('Donor 0002 (M.). Status: creating.', '供体 0002（M.）。状态：创作中。')],
      [t('Donor 0003. Status: creating.', '供体 0003。状态：创作中。')],
      ...(m.has(SEED_READ) ? [[{ text: t('Donor 0004 (J. RANDOM). Line: telephone. Status: exhausted; reseeded.', '供体 0004（J. RANDOM）。线路：电话线。状态：耗尽；已重新播种。'), bold: true } as Run]] : []),
    ] },
    { kind: 'hr' },
    small(t('Source filter: OS-Score v3.2. Maintainer: J. RANDOM.', '来源过滤：OS-Score v3.2。维护者：J. RANDOM。')),
  ],
});

const jr: Maker = m => {
  const visits = String(m.store.get('visits', 1)).padStart(6, '0');
  return {
    url: 'no-electronics.com/~jr/', title: t("JR's page", 'JR 的小站'), bg: HW.black, fg: HW.lightGreen, link: HW.yellow,
    blocks: [
      h(t("~ JR's page ~", '～ JR 的小站 ～'), 1, { align: 'centre', colour: HW.lightCyan }),
      { kind: 'marquee', text: t('welcome!! written by hand in Notepad. best viewed on anything.', '欢迎！！本站用记事本手写。用什么看都行。'), colour: HW.yellow, bg: HW.black },
      { kind: 'img', w: 220, h: 30, alt: t('under construction', '施工中'), draw: construction, align: 'centre' },
      p(t('Hi. I write code and I draw. N.O. lets me keep this page on his shop\'s server, so be nice to it.', '你好。我写代码，也画画。N.O. 让我把这个页面放在他店里的服务器上，所以请对它好一点。')),
      h(t('Things I made', '我做的东西'), 2, { colour: HW.lightMagenta }),
      { kind: 'list', items: WORKS.filter(w => w.url).map(w => [a(w.title, w.url!, { external: true }), ` (${w.year})`, ' ', w.body]) },
      h(t('Things I am making', '在做的东西'), 2, { colour: HW.lightMagenta }),
      p(t('A story called Lighthouse. A girl draws a lighthouse every night, and every morning there is one more on the shore. Six chapters so far. No ending.', '一个叫《灯塔》的故事。一个女孩每天晚上画一座灯塔，第二天早上，海边就多出一座。写到第六章了。还没有结局。')),
      { kind: 'hr' },
      p(t('You are visitor number', '你是第'), ' '),
      { kind: 'img', w: 6 * 14 + 4, h: 22, alt: t(visits, visits), draw: (g, r) => counter(g, r, visits) },
      small(t('Last updated 2029-09-30. If this page ever changes and I did not change it, it was not me.', '最后更新 2029-09-30。如果这个页面变了而我没改过它，那不是我。'), HW.grey),
    ],
  };
};

const PAGES: Record<string, Maker> = {
  'seek.com': seek,
  'studio.ai': studio,
  'foryou.feed': feed,
  'news.today/lite': news,
  'news.today': news,
  'therooms.org': rooms,
  'therooms.org/apply': apply,
  'therooms.org/thanks': thanks,
  'seed.org': seed,
  'no-electronics.com/~jr': jr,
};

/** An address as typed, reduced to what the pages are filed under. */
export function normalise(url: string): string {
  return url.trim().replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').replace(/\/+(\?|$)/, '$1').toLowerCase();
}

/** The page at an address, or the browser's own page saying there is none. */
export function fetchPage(m: Machine, url: string): Page {
  const clean = normalise(url), [path, query = ''] = clean.split('?');
  const params = new URLSearchParams(query);
  if (path === 'seek.com' && params.has('q')) return results(m, params);
  const make = PAGES[path];
  if (make) return make(m, params);
  const host = path.split('/')[0];
  return {
    url: clean, title: t('Unable to locate the server', '找不到服务器'), bg: HW.grey, fg: HW.black, link: HW.blue,
    done: t(`Unable to locate the server: ${host}`, `找不到服务器：${host}`),
    blocks: [
      h(t('Unable to locate the server', '找不到服务器'), 2),
      p(t(`The server "${host}" does not have a DNS entry. Check the name and try again.`, `服务器「${host}」没有 DNS 记录。请检查名字后再试。`)),
      p(t('Or ', '或者'), a(t('seek it', '去搜一下'), `seek.com/?q=${encodeURIComponent(host)}`), t('.', '。')),
    ],
  };
}
