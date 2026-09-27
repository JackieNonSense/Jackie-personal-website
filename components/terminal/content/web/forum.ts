import { WEB } from '../../crt/palette';
import { face } from './art';
import { bold, link, small, song, space, t, text, type Maker } from './kit';
import type { Block, Page } from '../../system/gui/page';
import type { Text } from '../../system/i18n';

/*
 * Night Ferry: a forum for people still on slow lines. The Rooms have no site of
 * their own on this web; they come up in what people say to each other, in a thread
 * asking after a friend, in the classifieds between a man who mends televisions and a
 * room to let.
 */

export const FORUM = 'yehangchuan.bbs.cn';

type Post = { who: Text; face: string; ink: number; meta: [string, string][]; when: Text; words: Text };

function post(p: Post, shade: number): Block {
  return {
    kind: 'row', gap: 0, cells: [
      { w: 108, bg: shade, border: WEB.forumLine, pad: 6, blocks: [
        text(bold(p.who, { colour: WEB.forum })),
        { kind: 'row', gap: 6, cells: [
          { w: 28, blocks: [{ kind: 'img', img: face(p.face, p.ink), w: 24, h: 24, frame: WEB.forumLine }] },
          { blocks: p.meta.map(([en, zh]) => small(t(en, zh), { colour: WEB.g40 })) },
        ] },
      ] },
      { bg: shade, border: WEB.forumLine, pad: 8, blocks: [
        small(p.when, { colour: WEB.g40 }),
        { kind: 'rule', colour: WEB.forumLine },
        text(p.words),
      ] },
    ],
  };
}

function page(url: string, title: Text, crumbs: [Text, string?][], blocks: Block[]): Page {
  return {
    url, title: { en: `${(title as { en: string }).en} - Night Ferry`, zh: `${(title as { zh: string }).zh} - 夜航船` }, bg: WEB.white, fg: WEB.black, link: WEB.forum,
    blocks: [
      { kind: 'box', bg: WEB.forum, pad: 6, blocks: [
        { kind: 'row', gap: 8, cells: [
          { blocks: [song(t('NIGHT FERRY', '夜 航 船'), { colour: WEB.white }), small(t('for slow lines · dial-up users, turn pictures off', '慢线路讨论区 · 拨号用户请关闭图片'), { colour: WEB.forumPale })] },
          { w: 200, blocks: [space(6), text(t('23 online · 3 of them people', '在线 23 人 · 其中 3 人是人'), { colour: WEB.forumPale, align: 'right' })] },
        ] },
      ] },
      text(crumbs.flatMap(([label, href], i) => [...(i ? [' » '] : []), href ? link(label, href) : label]), { colour: WEB.forum }),
      ...blocks,
      space(4),
      small(t('Night Ferry · powered by a 486 in a cupboard · since 1998', '夜航船 · 由柜子里的一台 486 驱动 · 始于 1998'), { align: 'centre', colour: WEB.g55 }),
    ],
  };
}

const threadHead = (title: Text, views: string, replies: number): Block => ({
  kind: 'box', bg: WEB.forumBar, border: WEB.forumLine, pad: 4, blocks: [
    { kind: 'row', gap: 8, cells: [{ blocks: [text(bold(title))] }, { w: 150, blocks: [small(t(`views ${views} · replies ${replies}`, `查看 ${views} · 回复 ${replies}`), { colour: WEB.g40, align: 'right' })] }] },
  ],
});

const MOTH_TITLE = t('[MISSING] Has anyone heard from MOTH lately?', '【寻人】有人最近收到 MOTH 的消息吗？');
const FEED_TITLE = t('The feed is full of "my style". I never drew any of it.', '推荐流里全是"我的画风"，可我一张都没画过');
const ADS_TITLE = t('[CLASSIFIEDS] March', '【分类信息】三月');

export const forum: Maker = () => page(FORUM, t('Night Ferry', '夜航船'), [[t('Night Ferry', '夜航船')]], [
  ...[
    [t('Missing', '寻人启事'), t('People we have not heard from in their own words.', '很久没用自己的话说过话的人。'), [[MOTH_TITLE, 'thread-3307', '2030-04-03 03:07']]],
    [t('The feed', '推荐流'), t('What the machines are making of us.', '机器把我们做成了什么。'), [[FEED_TITLE, 'thread-2210', '2029-03-18 01:40']]],
    [t('Classifieds', '分类信息'), t('Mending, lessons, rooms. Read before you answer.', '修理、家教、出租。回复之前先读完。'), [[ADS_TITLE, 'thread-2988', '2030-03-29 23:10']]],
  ].map(([name, blurb, threads]) => ({
    kind: 'box', border: WEB.forumLine, pad: 0, head: { text: name as Text, bg: WEB.forum, fg: WEB.white }, blocks: [
      { kind: 'box', bg: WEB.forumRowA, pad: 6, blocks: [
        small(blurb as Text, { colour: WEB.g40 }),
        ...(threads as [Text, string, string][]).map(([title, id, when]) => ({
          kind: 'row', gap: 8, cells: [{ blocks: [text(link(title, `${FORUM}/${id}`))] }, { w: 130, blocks: [small(t(`last: ${when}`, `最后：${when}`), { colour: WEB.g55, align: 'right' })] }],
        } as Block)),
      ] },
    ],
  } as Block)),
]);

export const threads: Record<string, Maker> = {
  [`${FORUM}/thread-3307`]: () => page(`${FORUM}/thread-3307`, MOTH_TITLE, [[t('Night Ferry', '夜航船'), FORUM], [t('Missing', '寻人启事'), FORUM], [MOTH_TITLE]], [
    threadHead(MOTH_TITLE, '1,207', 3),
    post({ who: 'JR', face: 'jr', ink: WEB.jrCobalt, meta: [['started it', '楼主'], ['posts 211', '帖子 211'], ['since 2027-11', '注册 2027-11']], when: t('posted 2030-04-02 23:41', '发表于 2030-04-02 23:41'),
      words: t('In March MOTH said he was going to "the Rooms" for a bit. Bed and board, and all he had to do was keep drawing.\nHis account has posted every day since. But he never used a capital letter in his life, and now every word is spelled right.\nHas anyone talked to him, him, since?',
        'MOTH 三月说要去"房间"待一阵，说那边包吃住，只要接着画画就行。\n之后他的账号每天都在发帖。可是他从来不用大写字母，现在每个字都拼对了。\n有人最近和他本人说过话吗？') }, WEB.forumRowA),
    post({ who: t('Old Ticket', '旧船票'), face: 'ticket', ink: WEB.umber, meta: [['2nd', '2 楼'], ['posts 1,033', '帖子 1,033'], ['since 2026-02', '注册 2026-02']], when: t('posted 2030-04-03 00:12', '发表于 2030-04-03 00:12'),
      words: t('My cousin went in last autumn. He rings home every week and sounds so well.\nOnly it is the same thing every time, word for word.', '我表弟去年秋天也进去了。每周都给家里打电话，声音很精神。\n就是每次说的都是同一段话，一个字都不差。') }, WEB.forumRowB),
    post({ who: 'N.O.', face: 'no', ink: WEB.black, meta: [['3rd', '3 楼'], ['posts 88', '帖子 88'], ['since 1998-06', '注册 1998-06']], when: t('posted 2030-04-03 01:55', '发表于 2030-04-03 01:55'),
      words: t('DON\'T ANSWER HIM.', '别回他。') }, WEB.forumRowA),
    post({ who: 'MOTH', face: 'moth', ink: WEB.leaf, meta: [['4th', '4 楼'], ['posts 4,512', '帖子 4,512'], ['since 2027-03', '注册 2027-03']], when: t('posted 2030-04-03 03:07', '发表于 2030-04-03 03:07'),
      words: t('Hey everyone! I\'m doing great at the Rooms! The food is amazing and I have never been more creative!\nThanks for asking. Hope this helps!', '大家好！我在房间过得非常好！伙食很棒，我从来没有这么有创造力过！\n感谢大家的关心，希望对你有帮助！') }, WEB.forumRowB),
  ]),
  [`${FORUM}/thread-2210`]: () => page(`${FORUM}/thread-2210`, FEED_TITLE, [[t('Night Ferry', '夜航船'), FORUM], [t('The feed', '推荐流'), FORUM], [FEED_TITLE]], [
    threadHead(FEED_TITLE, '3,441', 3),
    post({ who: 'JR', face: 'jr', ink: WEB.jrCobalt, meta: [['started it', '楼主'], ['posts 211', '帖子 211'], ['since 2027-11', '注册 2027-11']], when: t('posted 2029-03-18 01:40', '发表于 2029-03-18 01:40'),
      words: t('Every picture in my feed is "in the style of JR". The girl on the water tower, the rooftop at night. They are good. Some are better than mine.\nI did not draw a single one of them.', '推荐流里每一张都是"JR 风格"。水塔上的女孩，夜里的天台。画得很好，有几张比我画得还好。\n可我一张都没画过。') }, WEB.forumRowA),
    post({ who: 'feedfan_0913', face: 'lamp', ink: WEB.g40, meta: [['2nd', '2 楼'], ['posts 12,880', '帖子 12,880'], ['since 2030-01', '注册 2030-01']], when: t('posted 2029-03-18 01:41', '发表于 2029-03-18 01:41'),
      words: t('Congratulations on your success! You should be proud that your style inspires so many creators!', '恭喜你！你的风格启发了这么多创作者，你应该感到骄傲！') }, WEB.forumRowB),
    post({ who: 'N.O.', face: 'no', ink: WEB.black, meta: [['3rd', '3 楼'], ['posts 88', '帖子 88'], ['since 1998-06', '注册 1998-06']], when: t('posted 2029-03-18 02:20', '发表于 2029-03-18 02:20'),
      words: t('KEEP YOUR ORIGINALS ON A DISK. NOT IN A CLOUD. THE 2ND POST JOINED IN 2030. IT IS 2029.', '原稿存在自己的盘上。别存云上。二楼的注册时间是 2030 年。现在是 2029 年。') }, WEB.forumRowA),
    post({ who: t('Old Ticket', '旧船票'), face: 'ticket', ink: WEB.umber, meta: [['4th', '4 楼'], ['posts 1,033', '帖子 1,033'], ['since 2026-02', '注册 2026-02']], when: t('posted 2029-03-18 08:05', '发表于 2029-03-18 08:05'),
      words: t('Same here, with my watercolours. I stopped posting them. I paint for the drawer now.', '我也是，我的水彩。我不往网上发了。现在画了就放抽屉里。') }, WEB.forumRowB),
  ]),
  [`${FORUM}/thread-2988`]: () => page(`${FORUM}/thread-2988`, ADS_TITLE, [[t('Night Ferry', '夜航船'), FORUM], [t('Classifieds', '分类信息'), FORUM], [ADS_TITLE]], [
    threadHead(ADS_TITLE, '902', 5),
    ...[
      [t('Mending CRT televisions and monitors. Tubes, yokes, flybacks. Old electronics market, stall 41, until they pull it down. -- N.O.', '修 CRT 电视和显示器。显像管、偏转线圈、高压包。旧电子市场 41 号摊位，拆之前都在。—— N.O.'), 'N.O.'],
      [t('Maths lessons, primary and middle school. By a person. I will show you my working.', '小学、初中数学家教。真人上课。我会把演算过程写给你看。'), t('Teacher Liu', '刘老师')],
      [t('Room to let near the river. Quiet. Window faces east. No generated neighbours that I know of.', '河边有一间房出租。安静，窗户朝东。据我所知没有生成的邻居。'), t('landlady', '房东')],
      [t('LONG-TERM HOME CONTENT DONORS WANTED. Bed and board. Paid by the hesitation. No experience. Just be yourself. -- The Rooms, intake office', '长期招募居家内容供体。包食宿。按犹豫计酬。无需经验，做你自己就好。—— 房间计划招募处'), t('recruiter_09', '招募专员_09')],
      [t('Buying old things. Selling them too. Open only at night. yeshi.shop  (type it yourself; I don\'t do links)', '收旧货，也卖。只在夜里开门。yeshi.shop（自己敲进去，我不做链接）'), t('stallkeeper', '摊主')],
    ].map(([words, who], i) => post({ who: who, face: ['no', 'lamp', 'cat', 'lamp', 'cat'][i], ink: i === 3 ? WEB.g55 : WEB.umber, meta: [[`${i + 1}`, `${i + 1} 楼`]], when: t(`posted 2030-03-${String(20 + i * 2)} ${i === 4 ? '03:07' : '22:1' + i}`, `发表于 2030-03-${String(20 + i * 2)} ${i === 4 ? '03:07' : '22:1' + i}`), words: words as Text }, i % 2 ? WEB.forumRowB : WEB.forumRowA)),
  ]),
};
