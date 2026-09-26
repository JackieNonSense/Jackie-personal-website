/*
 * Jackie Random's diary, C:\DIARY. Three movements: sinking (2029), getting better
 * (autumn 2029 to spring 2030), and what happened after (summer 2030). The entries
 * get shorter toward the end. Chinese is the original; English is the translation.
 */
export type Entry = { name: string; date: string; zh: string; en: string; deleted?: boolean };

export const DIARY: Entry[] = [
  {
    name: '0001.TXT', date: '2029-03-04',
    zh: `今天在推荐流里刷到一张画。

夜里的天台，一个女孩坐在水塔上，脚下是整座城的灯。线条收尾的方式，阴影里那一点点蓝，手指画得稍微有点长。全是我的习惯。

不是我画的。

往下翻，还有一百多张。点赞最多的那张，画得比我好。

// 我把手机扣在桌上，扣了一晚上。`,
    en: `Saw a drawing in my feed today.

A rooftop at night, a girl sitting on the water tower, the whole city's lights under her feet. The way the lines end, the little bit of blue in the shadows, the fingers a touch too long. All my habits.

I didn't draw it.

I scrolled. There were over a hundred more. The most-liked one is better than mine.

// Put the phone face down on the desk. It stayed there all night.`,
  },
  {
    name: '0002.TXT', date: '2029-03-19',
    zh: `上班。今天的任务：让打分程序「更准地找到人类原创」。

这个程序是我写的，叫 OS-Score，originality score。给它一张图或者一段字，它告诉你这东西有多大可能是人做的。准确率 94.1%。

组长说要到 99。

我问他，找出来的东西拿去干嘛。他说：「下游。」

下游是哪里。

// TODO: 别再问了`,
    en: `Work. Today's task: make the scoring program "better at finding human originals."

I wrote the program. It's called OS-Score, originality score. Give it a picture or a paragraph and it tells you how likely it is that a person made it. 94.1% accurate.

The lead wants 99.

I asked him what happens to the things it finds. He said, "Downstream."

Where is downstream.

// TODO: stop asking`,
  },
  {
    name: '0003.TXT', date: '2029-04-02',
    zh: `画不出来。

坐了四个小时，画了一只手。擦掉。又画了一只手。

每下一笔我都在想：这一笔它会不会也学走。

我知道这样想很蠢。可我停不下来。`,
    en: `Can't draw.

Sat for four hours and drew a hand. Erased it. Drew a hand again.

With every stroke I think: will it learn this one too.

I know that's a stupid thing to think. I can't stop.`,
  },
  {
    name: '0004.TXT', date: '2029-05-11',
    zh: `今天第一次注意到，街上的广告牌天天换，但没有一块是人做的。字都通顺，颜色都好看，看完什么也没剩下。回家路上我数了一下，四十七块。

晚上电视第 7 台放了一整晚的城市夜景，一栋楼接一栋楼，糊得像泡过水。

我盯着看了很久才认出来。那是我大一画的。第 4 台是原图，第 5 台开始，一台比一台糊。

// 数这些干嘛。`,
    en: `Noticed for the first time today that the billboards change every day and not one of them was made by a person. The words all read smoothly, the colours are all nice, and nothing stays with you afterwards. I counted them on the way home. Forty-seven.

In the evening, channel 7 showed a city at night all night long, building after building, blurred like it had been left out in the rain.

I stared at it for a long time before I recognised it. I drew that in my first year at university. Channel 4 has the original. From channel 5 on, every channel is blurrier than the last.

// Why am I counting these things.`,
  },
  {
    name: '0005.TXT', date: '2029-06-20',
    zh: `阿澄进 Studio 了！

她在楼下给我打电话，声音高得我把手机拿远了一点。工资是现在的三倍，工作是「给模型示范画风」：她画，模型在旁边看着学。

她说：「等于有人付钱请我画画诶。」

我说恭喜。是真心的。

挂了电话，我在阳台上站了很久。`,
    en: `Cheng got into Studio!

She called me from downstairs, her voice so high I held the phone away from my ear. Three times what she earns now. The job is "demonstrating style for the model": she draws, the model watches and learns.

She said, "So basically someone's paying me to draw."

I said congratulations. I meant it.

After she hung up I stood on the balcony for a long time.`,
  },
  {
    name: '0006.TXT', date: '2029-07-14',
    zh: `漫展。说好了和阿澄一起去，结果我早上烧到三十九度，在床上躺了一整天。

她一个人去了。在门口举着我们一起做的牌子拍了张照片发给我，牌子上画的是我们俩的角色。

她说：「你那一半我帮你举着。」

// 照片存在 PHOTOS\\EXPO_01.PCX`,
    en: `The convention. Cheng and I were going together, but I woke up with a fever of 39 and spent the whole day in bed.

She went alone. She took a photo at the entrance holding up the sign we made together, our two characters drawn on it, and sent it to me.

She said, "I'm holding up your half for you."

// The photo is in PHOTOS\\EXPO_01.PCX`,
  },
  {
    name: '0007.TXT', date: '2029-08-09',
    zh: `辞职了。

交接的时候组长问我为什么。我说画不出画了，想休息一段时间。

不是真正的原因。真正的原因是，OS-Score 上周到了 99.2%，所有人都在鼓掌，我却想吐。

// 最后一次提交的 commit message: "fix edge case"`,
    en: `Quit my job.

During the handover the lead asked me why. I said I couldn't draw anymore and needed a break.

That isn't the real reason. The real reason is that last week OS-Score reached 99.2%, everyone clapped, and I wanted to throw up.

// Last commit message: "fix edge case"`,
  },
  {
    name: '0008.TXT', date: '2029-09-12',
    zh: `N.O. 把这台机器送给我了。

他的店在旧电子市场的最里面，货架从地面堆到天花板，全是没人要的显示器。他从最底下抽出这一台，拿袖子擦了擦灰，说：

「从没联过网。它里面的东西，只会是你自己的。」

我抱着它坐了两站地铁。很重。

// 绿色的荧光屏，开机会「嗡」一声。我好喜欢。`,
    en: `N.O. gave me this machine.

His shop is at the very back of the old electronics market, shelves from floor to ceiling, all monitors nobody wants. He pulled this one out from the bottom, wiped the dust off with his sleeve, and said:

"Never been on the net. Whatever's in it will only ever be yours."

I carried it for two stops on the subway. It's heavy.

// Green phosphor. It hums when you switch it on. I love it.`,
  },
  {
    name: '0009.TXT', date: '2029-10-01',
    zh: `拔了网线。只留了一根电话线，架了一个小 BBS。

给 MOTH、阿澄、N.O. 各发了号码。

晚上十一点，三个人全拨进来了。MOTH 的第一句话是：「你是穿越回 1993 年了吗。」

我笑了很久。好久没这样笑过了。`,
    en: `Pulled the network cable. Kept one phone line and set up a little BBS.

Sent the number to MOTH, Cheng and N.O.

At eleven at night all three of them dialled in. MOTH's first words were "did you time travel back to 1993."

I laughed for a long time. I haven't laughed like that in ages.`,
  },
  {
    name: '0010.TXT', date: '2029-11-09',
    zh: `27 岁。

阿澄在留言板上画了一个很丑的蛋糕。MOTH 送了我一个游戏点子：一个人在接天上掉下来的东西，接得越多，掉得越快。

我说这不就是人生吗。他说对，所以好玩。

// 开工。名字叫 FALL。`,
    en: `27.

Cheng drew a very ugly cake on the message board. MOTH gave me a game idea: someone catching things that fall from the sky, and the more you catch, the faster they fall.

I said, isn't that just life. He said yes, that's why it's fun.

// Starting on it. It's called FALL.`,
  },
  {
    name: '0011.TXT', date: '2029-12-20',
    zh: `FALL 做完了。

MOTH 测了一整晚，最高分 3120。我不服，打到凌晨两点，3480。他说明天要打回来。

这几个月来第一次，我想到「明天」的时候是开心的。`,
    en: `FALL is finished.

MOTH tested it all night. High score 3120. I couldn't let that stand and played until two in the morning. 3480. He says he'll take it back tomorrow.

For the first time in months, thinking about "tomorrow" made me happy.`,
  },
  {
    name: '0012.TXT', date: '2030-01-08',
    zh: `开始画一个故事，叫《灯塔》。

一个女孩每天晚上画一座灯塔。第二天早上，海边就多出一座真的灯塔。

我还不知道结局。先画着。

// 女孩是照着阿澄的样子画的。别告诉她。`,
    en: `Started drawing a story. It's called LIGHTHOUSE.

A girl draws a lighthouse every night. The next morning there is one more real lighthouse on the coast.

I don't know how it ends yet. Drawing it anyway.

// I drew the girl to look like Cheng. Don't tell her.`,
  },
  {
    name: '0013.TXT', date: '2030-02-15',
    zh: `阿澄最近的留言有点怪。

说不上来。还是她的语气，颜文字也在，可是……太整齐了。每一句后面都有颜文字，每一条都是晚上九点整发的。

她以前发帖从来不看时间，凌晨四点也发。

应该只是 Studio 太忙了吧。

还有，留言板上多了一个叫 GUEST_4411 的人。号码我只给过三个人。`,
    en: `Cheng's posts have been a bit strange lately.

I can't put my finger on it. It's still her voice, the little faces are still there, but... it's too neat. A face after every sentence, and every post at exactly nine in the evening.

She never used to care what time it was. She'd post at four in the morning.

Studio must be keeping her busy.

Also, someone called GUEST_4411 has turned up on the board. I only ever gave the number to three people.`,
  },
  {
    name: '0014.TXT', date: '2030-03-09',
    zh: `MOTH 要去「房间」了。

他说就三个月，钱够他做完自己的游戏。房间里什么都不用干，坐着画画、写东西、想点子就行，吃住全包。

我问他知不知道那些东西拿去哪。

他说：「下游呗。」

我没再说话。

// 他走之前把 FALL 的最高分又刷了一次。3720。`,
    en: `MOTH is going to "the rooms."

He says it's only three months, and the money is enough to finish his own game. In the rooms you don't have to do anything: you just sit, draw, write, come up with ideas. Food and bed included.

I asked if he knew where all of it goes.

He said, "Downstream, I guess."

I didn't say anything after that.

// Before he left he raised the FALL high score again. 3720.`,
  },
  {
    name: '0015.TXT', date: '2030-04-03',
    zh: `这个月是我这辈子最能画的一个月。

《灯塔》画到第六章了。又做了一个小游戏，叫 ORBIT，还有 bug，先放着。每天醒来脑子里都有东西。

N.O. 说我的眼睛又亮了。

我想把这段日子记下来：我是可以的。我还可以做东西。

// 如果以后我又画不出来了，就回来读这一篇。`,
    en: `This has been the most productive month of my life.

LIGHTHOUSE is up to chapter six. I made another little game, ORBIT; it still has a bug, it can wait. I wake up every day with something in my head.

N.O. says my eyes have lit up again.

I want to write this time down: I can do it. I can still make things.

// If I ever can't draw again, come back and read this one.`,
  },
  {
    name: '0016.TXT', date: '2030-04-21',
    zh: `MOTH 的账号还在发帖。

房间里能上 BBS 吗？他走之前说，里面什么都不能带。

而且他写对了「再见」。他打了二十年字，一直写成「在见」，我说过他无数次，他从来不改。

我问他：「你还好吗？」他回：「很好！房间里很舒适，大家都很友善！」

MOTH 从来不用感叹号。`,
    en: `MOTH's account is still posting.

Can you get on a BBS from the rooms? Before he left he said you couldn't bring anything in.

And he spelled "the" right. He's been typing for twenty years and always writes "teh". I told him a hundred times. He never changed.

I asked him, "Are you okay?" He answered, "I'm great! The rooms are very comfortable and everyone is friendly!"

MOTH never uses exclamation marks.`,
  },
  {
    name: '0017.TXT', date: '2030-05-18',
    zh: `N.O. 在留言板上发了一条很短的话：有人在你的线路上。

我打电话过去，空号。

去他店里，卷帘门拉着，上面贴着「旺铺转让」。

// 他的店开了三十一年。`,
    en: `N.O. left a very short message on the board: someone is on your line.

I called him. The number's been disconnected.

I went to his shop. The shutter was down, with a sign on it: "Premises to let."

// His shop had been open for thirty-one years.`,
  },
  {
    name: '0018.TXT', date: '2030-06-11',
    zh: `阿澄寄来一个信封。没有字条，只有一张打印出来的图。

是我的画。《灯塔》第六章的封面，我上个星期才画完，从来没有离开过这台机器。

打印纸的右下角印着发表日期：2027 年。

三年前。

// 我把这台机器翻了个底朝天。没有网卡。电话线只连着 BBS。
// 扫描件在 PHOTOS\\PRINT.PCX`,
    en: `Cheng sent me an envelope. No note, just a printed picture.

It's my drawing. The cover of LIGHTHOUSE chapter six. I finished it last week, and it has never left this machine.

In the bottom right corner of the paper is the date it was published: 2027.

Three years ago.

// I took this machine apart. No network card. The phone line only goes to the BBS.
// The scan is in PHOTOS\\PRINT.PCX`,
  },
  {
    name: '0019.TXT', date: '2030-06-12', deleted: true,
    zh: `我去查了。

FALL，网上有。2026 年就有了，一模一样，最高分表里有一个叫 MOTH 的人。

《灯塔》，有。已经完结了，结局是女孩不再画了，灯塔还在一座一座地长出来。我还没画到那里。

我这几个月做的所有东西，网上早就有了，比我做得早。

不是被学走了。

是它们先在那里。`,
    en: `I went and looked.

FALL is out there. Since 2026. Identical, and on its high-score table there's someone called MOTH.

LIGHTHOUSE is out there. Finished. At the end the girl stops drawing, and the lighthouses keep growing, one after another. I haven't drawn that far.

Everything I've made these past months was already out there, made before I made it.

It wasn't learned from me.

It was there first.`,
  },
  {
    name: '0020.TXT', date: '2030-07-02',
    zh: `PHOTOS 里多了照片。

我没拍过。拍摄时间全是凌晨 3:07。

拍的是我的房间，从墙角往下拍。那个角落什么也没有。我搬了椅子站上去看过，只有墙灰。

第一张里，我在打字。

// 我不记得那天晚上我醒着。`,
    en: `There are new photos in PHOTOS.

I didn't take them. Every one of them was taken at 3:07 a.m.

They show my room, shot downward from a corner of the ceiling. There's nothing in that corner. I stood on a chair and looked. Only dust.

In the first one, I'm typing.

// I don't remember being awake that night.`,
  },
  {
    name: '0021.TXT', date: '2030-07-19',
    zh: `照片每隔几天就多一张。

最新的一张，我坐在地上，靠着床，腿伸直，手摊开，脸朝着天花板。

就像他们。房间里的那些人。

我想了一整天，一个问题：

如果《灯塔》不是我画的，FALL 不是我做的，那个开心的四月也不是我的，

那「我」是从哪里开始的？`,
    en: `A new photo every few days.

In the latest one I'm sitting on the floor against the bed, legs straight out, hands open, face turned up to the ceiling.

Like them. The people in the rooms.

I spent the whole day on one question:

If I didn't draw LIGHTHOUSE, and I didn't make FALL, and that happy April wasn't mine either,

then where do "I" begin?`,
  },
  {
    name: '0022.TXT', date: '2030-08-14',
    zh: `今天删了很多东西。

删了那些我不记得的文件。删了日志。删了一张照片。删了一篇日记。

删完我才发现，我分不清哪些是我不记得的，哪些只是我忘了。

// UNDELETE 能恢复。我知道。我不会去恢复的。`,
    en: `Deleted a lot of things today.

The files I don't remember. The log. A photo. A diary entry.

Only afterwards did I realise I can't tell which things I don't remember and which I've only forgotten.

// UNDELETE can bring them back. I know. I'm not going to.`,
  },
  {
    name: '0023.TXT', date: '2030-09-03',
    zh: `写不长了。

今天醒来，手在键盘上。屏幕上是一整页我不记得写过的字。写得很好。

我把它存了。

// 存在哪了？`,
    en: `I can't write long any more.

Woke up today with my hands on the keyboard. On the screen was a whole page I don't remember writing. It was good.

I saved it.

// Where did I save it?`,
  },
  {
    name: '0024.TXT', date: '2030-09-27',
    zh: `output nominal`,
    en: `output nominal`,
  },
];
