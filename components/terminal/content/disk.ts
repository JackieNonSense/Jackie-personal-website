import { dir, file, type DirNode, type Node } from '../system/fs';
import { restoreDrawings } from './paint';
import type { Machine } from '../system/machine';
import { DIARY } from './diary';
import { PHOTOS } from './photos';
import { hhmm, isoDate, machineNow } from './time';

/** A stable small hash, for sizes that look arbitrary. */
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/*
 * Jackie Random's drive. Most of it is ordinary: the files anyone leaves on a
 * machine they use every day. The story is in DIARY, PHOTOS and the deleted log.
 *
 * `deleted: true` files are listed by UNDELETE with their first letter lost;
 * `when` files appear only once the visitor has seen something else.
 */

/** FALL's high-score table, as the game and GAMES\HISCORE.DAT show it. */
export const FALL_SCORES = [
  { name: 'MOTH', score: 3721, date: '2030-04-02' },
  { name: 'MOTH', score: 3720, date: '2030-03-08' },
  { name: 'MOTH', score: 3510, date: '2029-12-24' },
  { name: 'JR', score: 3480, date: '2029-12-20' },
  { name: 'MOTH', score: 3120, date: '2029-12-19' },
];

const PCX = 38_912;

function photo(name: string, id: string, props: Partial<Parameters<typeof file>[2]> = {}) {
  const taken = PHOTOS[id].taken;
  return file(name, taken === 'now' ? isoDate(machineNow()) : taken.slice(0, 10), { photo: id, size: PCX + fnv(name) % 4096, ...props });
}

/** The deleted log: Jackie's own scorer, grading everything he made, and then you. */
function seedLog(m: Machine) {
  const now = machineNow();
  const rows = [
    '2029-12-20  03:07  FALL (game)                      0.991',
    '2030-01-08  03:07  LIGHTHOUSE ch.1 (drawing)        0.994',
    '2030-01-20  03:07  LIGHTHOUSE ch.2 (drawing)        0.993',
    '2030-03-09  03:07  diary entry                      0.972',
    '2030-04-03  03:07  LIGHTHOUSE ch.3-6 (drawing)      0.997',
    '2030-04-03  03:07  ORBIT (game)                     0.988',
    '2030-04-03  03:07  diary entry                      0.999',
    '2030-06-12  03:07  diary entry                      0.911',
    '2030-07-19  03:07  diary entry                      0.804',
    '2030-09-03  03:07  unsaved text                     0.690',
    '2030-09-27  03:07  diary entry                      0.412',
  ].join('\n');
  const head = {
    en: `SEED COLLECTION LOG
SOURCE FILTER  OS-Score v3.2   maintainer: J. RANDOM
DONOR          J. RANDOM       line: PSTN / BBS

DATE        TIME   OUTPUT                           SCORE`,
    zh: `种子收集日志
来源过滤器     OS-Score v3.2   维护者：J. RANDOM
供体           J. RANDOM       线路：电话线 / BBS

日期        时间   产出                             评分`,
  };
  const tail = {
    en: `                   below threshold
2030-09-27  03:07  DONOR STATUS: EXHAUSTED
2030-09-27  03:07  RESEED FROM DONOR .............. OK
            03:07  VARIANTS ....................... RUN
${isoDate(now)}  ${hhmm(now)}  NEXT VARIANT: session open
                   output ${m.keystrokes} chars, ${m.clicks} clicks, ${m.hesitations} hesitations
                   scoring ...`,
    zh: `                   低于阈值
2030-09-27  03:07  供体状态：耗尽
2030-09-27  03:07  从供体重新播种 ................. 完成
            03:07  变体 ........................... 已运行
${isoDate(now)}  ${hhmm(now)}  下一个变体：会话进行中
                   已产出 ${m.keystrokes} 个字符、${m.clicks} 次点击，犹豫 ${m.hesitations} 次
                   评分中……`,
  };
  return { en: `${head.en}\n${rows}\n${tail.en}`, zh: `${head.zh}\n${rows}\n${tail.zh}` };
}

export function disk(): DirNode {
  return dir('', '1987-01-01', [
    file('AUTOEXEC.BAT', '2029-09-12', {
      text: {
        en: `@ECHO OFF
REM  JR's machine. N.O. set this up. Don't touch.
PROMPT $P$G
PATH C:\\SYSTEM;C:\\GAMES
LOADHIGH C:\\SYSTEM\\HZK16.SYS
C:\\SYSTEM\\MODEM.COM /ANSWER
BBS.EXE
REM 03:07 SCHEDULER
REM   ^ I didn't write this line.   -- JR`,
        zh: `@ECHO OFF
REM  JR 的机器。N.O. 装的，别乱动。
PROMPT $P$G
PATH C:\\SYSTEM;C:\\GAMES
LOADHIGH C:\\SYSTEM\\HZK16.SYS
C:\\SYSTEM\\MODEM.COM /ANSWER
BBS.EXE
REM 03:07 SCHEDULER
REM   ^ 这一行不是我写的。   -- JR`,
      },
    }),
    file('CONFIG.SYS', '2029-09-12', { text: 'FILES=30\nBUFFERS=20\nDEVICE=C:\\SYSTEM\\ANSI.SYS\nDEVICE=C:\\SYSTEM\\HZK16.SYS' }),
    file('README.TXT', '2029-10-01', {
      text: {
        en: `If you're reading this, you found your way into DOS.

The diary is in DIARY, photos in PHOTOS, games in GAMES.
Leave SYSTEM alone.

  CD DIARY          then  MORE 0001.TXT   (N for the next one)
  PICVIEW PHOTOS

-- JR`,
        zh: `如果你在读这个，说明你进了 DOS。

日记在 DIARY，照片在 PHOTOS，游戏在 GAMES。
SYSTEM 别动。

  CD DIARY          然后  MORE 0001.TXT   （按 N 看下一篇）
  PICVIEW PHOTOS

-- JR`,
      },
    }),
    file('TODO.TXT', '2030-05-10', {
      text: {
        en: `TODO

[x] fix the E key on the keyboard
[x] high-score table for FALL
[ ] ORBIT bug (runtime error 200, probably a divide by zero)
[ ] LIGHTHOUSE ch.6 cover
[ ] coffee
[ ] ask N.O. about the line noise (a click, every night, around three)
[ ] call Mum`,
        zh: `TODO

[x] 修键盘的 E 键
[x] FALL 加最高分表
[ ] ORBIT 的 bug（runtime error 200，大概是除零）
[ ] 灯塔 第六章封面
[ ] 买咖啡
[ ] 问 N.O. 线路噪声的事（每天夜里三点左右，「咔」的一声）
[ ] 给妈打电话`,
      },
    }),
    dir('DIARY', '2030-09-27', DIARY.map(e => file(e.name, e.date, { text: { en: e.en, zh: e.zh }, deleted: e.deleted }))),
    dir('PHOTOS', '2030-08-11', [
      photo('WORKSHOP.PCX', 'workshop'),
      photo('DESK.PCX', 'desk'),
      photo('WINDOW.PCX', 'window'),
      photo('MOTH.PCX', 'moth'),
      photo('EXPO_01.PCX', 'expo_01'),
      photo('EXPO_02.PCX', 'expo_02'),
      photo('ROOMS.PCX', 'rooms'),
      photo('PRINT.PCX', 'print'),
      photo('ROOM_001.PCX', 'room_001'),
      photo('ROOM_002.PCX', 'room_002'),
      photo('ROOM_003.PCX', 'room_003'),
      photo('ROOM_004.PCX', 'room_004'),
      photo('ROOM_005.PCX', 'room_005'),
      photo('ROOM_006.PCX', 'room_006'),
      photo('ROOM_007.PCX', 'room_007'),
      photo('ROOM_008.PCX', 'room_008'),
      photo('ROOM_009.PCX', 'room_009', { deleted: true }),
      photo('ROOM_010.PCX', 'room_010', { when: m => m.has('file:SYSTEM/SEED.LOG') }),
    ]),
    dir('GAMES', '2030-04-03', [
      file('FALL.EXE', '2029-12-20', { program: 'fall', size: 24576 }),
      file('FALL.TXT', '2029-12-20', {
        text: {
          en: 'FALL\n\nCatch what falls. The more you catch, the faster it falls.\nMiss three and it ends.\n\nIdea: MOTH. Code and pictures: JR.',
          zh: 'FALL\n\n接住掉下来的东西。接得越多，掉得越快。\n漏掉三个，游戏结束。\n\n点子：MOTH。代码和画：JR。',
        },
      }),
      file('ORBIT.EXE', '2030-04-03', { program: 'orbit', size: 31744 }),
      file('HISCORE.DAT', '2030-04-02', {
        text: 'FALL  HIGH SCORES\n\n' + FALL_SCORES.map((s, i) => `${i + 1}. ${s.name.padEnd(6)} ${String(s.score).padStart(6)}   ${s.date}`).join('\n'),
      }),
    ]),
    dir('DRAFTS', '2030-06-02', [
      file('LIGHT_07.TXT', '2030-06-02', {
        text: {
          en: `LIGHTHOUSE, endings

A: the girl burns all her drawings, and every lighthouse goes dark in one night.
   -- too neat.
B: the keeper finds his own lighthouse again.
   -- too sweet.
C: ...

// Why can't I write the ending.
// Because I don't know mine.`,
          zh: `灯塔，结局

A：女孩烧掉了所有的画，所有的灯塔一夜之间全灭了。
   —— 太假。
B：守塔人重新找到了自己的那座灯塔。
   —— 太甜。
C：……

// 为什么我写不出结局。
// 因为我不知道自己的结局。`,
        },
      }),
      file('MUM.TXT', '2029-08-10', {
        text: {
          en: `Mum,

I quit my job. Don't worry, I've got savings, and I'm not ill.
I just want to draw again for a while. Properly, the way I did when I was small and you pinned everything on the fridge.

I'll call you at the weekend.`,
          zh: `妈：

我辞职了。别担心，我有存款，身体也没事。
就是想重新好好画一阵子画。像小时候那样，画什么你都贴在冰箱上的那种。

周末给你打电话。`,
        },
      }),
    ]),
    dir('NOTES', '2029-11-02', [
      file('MACHINE.TXT', '2029-09-13', {
        text: {
          en: `Notes on the machine

- Wait for the hum after power-on before pressing anything. It's degaussing.
- N.O. put six buttons under the screen: six tubes in one set. Green is the one it came with. Each button hums too.
- The phone number is written on the back of the case. Nobody but the four of us has it.
- DO NOT plug in a network card. N.O. made me promise.
- The E key sticks. Hit it harder.`,
          zh: `机器备忘

- 开机后等那一声「嗡」完了再按键。那是在消磁。
- N.O. 在屏幕下面装了六个按键：一台机器，六种显像管。绿色是它原来的样子。每按一个也会「嗡」一下。
- 电话号码写在机箱背面。除了我们四个，没人知道。
- 绝对不要插网卡。答应过 N.O. 的。
- E 键会卡。用力按。`,
        },
      }),
      file('OS-SCORE.TXT', '2029-11-02', {
        text: {
          en: `// OS-Score v3.2, written down from memory.
// The company's copy never left the building.

score(work):
    novelty = distance(work, everything_seen_before)
    intent  = traces_of_hesitation(work)     // people hesitate. machines don't.
    residue = what_is_left_after_compression(work)
    return sigmoid(novelty * intent * residue)

// The most useful feature is intent.
// People erase and redraw. They stop in the same place for a long time.
// That hesitation is what an original is.
// I taught it, by hand, how to find hesitation.`,
          zh: `// OS-Score v3.2，凭记忆写下来的。
// 公司那份，从来没出过那栋楼。

score(work):
    novelty = distance(work, everything_seen_before)
    intent  = traces_of_hesitation(work)     // 人会犹豫。机器不会。
    residue = what_is_left_after_compression(work)
    return sigmoid(novelty * intent * residue)

// 最有用的特征是 intent。
// 人会擦掉重画，会在同一个地方停很久。
// 那些犹豫，就是原创。
// 是我亲手教会它怎么找到犹豫的。`,
        },
      }),
    ]),
    dir('WORK', '2029-05-17', [
      file('WEEKLY.TXT', '2029-05-17', {
        text: {
          en: `WEEKLY REPORT  2029-W20   Data Quality   J. Random

This week
- OS-Score accuracy 94.1% -> 96.8%
- New feature "intent" (traces of hesitation) live, recall +11%
- Downstream: the SEED pipeline now takes about 32,000 high-scoring samples a day

Next week
- 99%

Notes
- What does "downstream" mean? (removed)`,
          zh: `周报  2029-W20   数据质量组   J. Random

本周
- OS-Score 准确率 94.1% -> 96.8%
- 新特征 intent（犹豫痕迹）上线，召回率 +11%
- 下游对接：SEED 管线每天接收高分样本约 3.2 万条

下周
- 99%

备注
- 「下游」是指什么？（已删除）`,
        },
      }),
    ]),
    dir('SYSTEM', '1987-01-01', [
      file('README.TXT', '2029-09-12', {
        text: {
          en: `THIS MACHINE WAS NEVER ON THE NET. KEEP IT THAT WAY.

DOS NOTES FOR THE KID
  DIR, CD, TYPE. YOU KNOW THESE.
  A DELETED FILE IS NOT GONE. DOS ONLY FORGETS THE FIRST LETTER OF ITS NAME.
  UNDELETE SHOWS THEM. GIVE IT THE WHOLE NAME BACK AND IT RETURNS.
  NOTHING ON A DISK IS EVER REALLY GONE. REMEMBER THAT.

-- N.O.   1987 / 2029`,
          zh: `这台机器从没联过网。保持下去。

给小子的 DOS 笔记
  DIR、CD、TYPE，你都会。
  删掉的文件没有消失。DOS 只是忘了它名字的第一个字母。
  UNDELETE 能把它们列出来。把完整的名字还给它，它就回来了。
  磁盘上的东西，从来不会真正消失。记住这一点。

-- N.O.   1987 / 2029`,
        },
      }),
      file('HZK16.SYS', '1992-03-01', { size: 261_696 }),
      file('ANSI.SYS', '1987-01-01', { size: 9_029 }),
      file('MODEM.COM', '1989-06-14', { size: 4_352 }),
      file('SEED.LOG', '2030-09-27', { text: seedLog, size: 2_304, deleted: true }),
    ]),
  ]);
}

/** Files the visitor has already recovered stay recovered on their next visit. */
export function restoreDisk(m: Machine): void {
  restoreDrawings(m);
  const walk = (node: Node, parts: string[]) => {
    if (node.kind === 'dir') { node.children.forEach(c => walk(c, [...parts, c.name])); return; }
    if (node.deleted && m.has('undeleted:' + parts.join('/'))) node.deleted = false;
  };
  m.fs.root.children.forEach(c => walk(c, [c.name]));
}
