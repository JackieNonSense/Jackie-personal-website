import type { Text } from '../system/i18n';

/*
 * The message board. Four people had the number: Jackie (SYSOP), MOTH, Cheng and
 * N.O. Each writes in a way you can recognise, which is how you notice when a post
 * is no longer them:
 *
 *   MOTH      no capitals, no punctuation, "teh" for "the" (Chinese: 在见 for 再见),
 *             signs with a moth: }o{. His bot spells everything right, uses
 *             exclamation marks, and posts at 3:07.
 *   CHENG     kaomoji now and then, posts at any hour, signs ~cheng~ / ~澄~.
 *             Her bot puts (^_^) after every sentence and posts at 21:00 sharp.
 *   NIGHTOWL  capitals, short sentences, signs -- N.O. His bot says "Hope this helps!".
 *   GUEST_*   never had the number. Bots from the start.
 *   JACKIE    whoever sat at this machine after Jackie, years later. The visitor's
 *             own posts appear under this name too.
 */
export type Post = { from: string; date: string; time: string; subject: Text; body: Text };

export const POSTS: Post[] = [
  {
    from: 'SYSOP', date: '2029-10-01', time: '23:02',
    subject: { en: 'Open', zh: '开张' },
    body: {
      zh: `这里是我的小站。没有网，只有一根电话线。

能拨进来的只有你们三个。

规矩只有一条：这里写的东西，只给这里的人看。

-- JR`,
      en: `This is my little board. No internet, just one phone line.

The only people who can dial in are the three of you.

One rule: whatever is written here is only for the people here.

-- JR`,
    },
  },
  {
    from: 'MOTH', date: '2029-10-01', time: '23:11',
    subject: { en: 're: Open', zh: 're: 开张' },
    body: {
      zh: `你是穿越回 1993 年了吗 哈哈哈哈
这个绿色好好看 我要在这里住下了

  }o{  moth`,
      en: `did you time travel back to 1993 lol
this green is so good im moving in

  }o{  moth`,
    },
  },
  {
    from: 'CHENG', date: '2029-10-01', time: '23:40',
    subject: { en: "i'm here!!", zh: '我来啦！！' },
    body: {
      zh: `我来啦 (^o^)/
这个字体好可爱，有种小时候去网吧的感觉。
你终于肯出来见人了，虽然是用电话线见，哈哈。

~澄~`,
      en: `i'm here (^o^)/
this font is so cute, it feels like the internet cafe when we were kids.
you finally agreed to see people, even if it's down a phone line haha.

~cheng~`,
    },
  },
  {
    from: 'NIGHTOWL', date: '2029-10-02', time: '01:15',
    subject: { en: 'LINE CHECK', zh: '线路检查' },
    body: {
      zh: `线路干净。2400 波特，稳定。
别升级调制解调器。慢一点，安全一点。

-- N.O.`,
      en: `LINE CLEAN. 2400 BAUD HOLDS.
DO NOT UPGRADE THE MODEM. SLOWER IS SAFER.

-- N.O.`,
    },
  },
  {
    from: 'MOTH', date: '2029-10-19', time: '04:02',
    subject: { en: 'you up', zh: '在吗' },
    body: {
      zh: `在吗 我睡不着
刚才想到 以前我们在宿舍通宵做游戏 你画图我写代码 天亮了去吃包子
现在谁还通宵做游戏啊 模型五分钟就能生一个
可是我还是想做
在见

  }o{`,
      en: `you up i cant sleep
was just thinking about teh dorm, pulling all nighters making games, you drawing me coding, dumplings when teh sun came up
who stays up all night making games now, teh model makes one in five minutes
i still want to though
night

  }o{`,
    },
  },
  {
    from: 'CHENG', date: '2029-11-09', time: '00:00',
    subject: { en: 'HAPPY BIRTHDAY', zh: '生日快乐！！' },
    body: {
      zh: `生日快乐！！27 岁的 JR！

      , , , , ,
     | | | | | |
    {~~~~~~~~~~~}
    {   2   7   }
    {___________}

画得有点丑，不许笑 (>_<)
今年要开开心心的，要一直画画。

~澄~`,
      en: `HAPPY BIRTHDAY!! JR is 27!

      , , , , ,
     | | | | | |
    {~~~~~~~~~~~}
    {   2   7   }
    {___________}

it's a bit ugly, no laughing (>_<)
be happy this year. keep drawing.

~cheng~`,
    },
  },
  {
    from: 'MOTH', date: '2029-11-09', time: '00:40',
    subject: { en: 'present', zh: '礼物' },
    body: {
      zh: `礼物是一个点子 不要钱的那种
一个人在接天上掉下来的东西 接得越多掉得越快
最后你接不住了 游戏就结束了
像不像人生 所以好玩
你做 我测 老规矩

  }o{  moth`,
      en: `present is an idea, teh free kind
a guy catching things that fall from teh sky. teh more you catch teh faster they fall
eventually you cant keep up and its over
like life. thats why its fun
you make it i test it, like always

  }o{  moth`,
    },
  },
  {
    from: 'SYSOP', date: '2029-12-20', time: '02:14',
    subject: { en: 'FALL 1.0', zh: 'FALL 1.0' },
    body: {
      zh: `FALL 做完了。在「游戏」里，或者在 DOS 里输入 FALL。

MOTH：3480。你的 3120 掉下去了。

-- JR`,
      en: `FALL is done. It's under Games, or type FALL in DOS.

MOTH: 3480. Your 3120 has fallen.

-- JR`,
    },
  },
  {
    from: 'MOTH', date: '2029-12-20', time: '09:02',
    subject: { en: 're: FALL 1.0', zh: 're: FALL 1.0' },
    body: {
      zh: `我不服 今晚打回来

  }o{`,
      en: `nope. taking it back tonight

  }o{`,
    },
  },
  {
    from: 'MOTH', date: '2029-12-24', time: '03:51',
    subject: { en: '3510', zh: '3510' },
    body: {
      zh: `3510
凌晨四点 我赢了 睡了 在见

  }o{`,
      en: `3510
4am. i win. sleeping. night

  }o{`,
    },
  },
  {
    from: 'SYSOP', date: '2030-01-08', time: '22:10',
    subject: { en: 'New: LIGHTHOUSE', zh: '新坑：灯塔' },
    body: {
      zh: `开了一个新故事，叫《灯塔》。在「阅读」里能看到。慢慢画。

-- JR`,
      en: `Started a new story, LIGHTHOUSE. It's under Reading. I'll take my time.

-- JR`,
    },
  },
  {
    from: 'CHENG', date: '2030-01-09', time: '00:31',
    subject: { en: 're: LIGHTHOUSE', zh: 're: 灯塔' },
    body: {
      zh: `这个女孩……怎么越看越眼熟 (¬_¬)

画得真好。你的线条回来了。
我好开心。真的。

~澄~`,
      en: `this girl... why does she look more familiar every time i look (¬_¬)

it's really good. your lines are back.
i'm so happy. really.

~cheng~`,
    },
  },
  {
    from: 'NIGHTOWL', date: '2030-01-20', time: '23:48',
    subject: { en: 'RE: LIGHTHOUSE', zh: '回：灯塔' },
    body: {
      zh: `画得好。
只存在这台机器上。别的地方，哪里都不要放。

-- N.O.`,
      en: `GOOD WORK.
KEEP IT ON THIS MACHINE. NOWHERE ELSE. NOWHERE.

-- N.O.`,
    },
  },
  {
    from: 'CHENG', date: '2030-02-01', time: '04:12',
    subject: { en: 'tired', zh: '好累' },
    body: {
      zh: `Studio 这周让我画了三百张同一个角色。
不同角度，不同表情，不同的光。
画到后来我都不认识她了。
也不认识我自己的手了。

没事，就是发个牢骚。睡了。

~澄~`,
      en: `studio had me draw the same character three hundred times this week.
different angles, different faces, different light.
by the end i didn't recognise her.
i didn't recognise my own hands either.

it's fine, just complaining. going to sleep.

~cheng~`,
    },
  },
  {
    from: 'CHENG', date: '2030-02-10', time: '21:00',
    subject: { en: 'Another happy day!', zh: '今天也很开心！' },
    body: {
      zh: `今天也很开心！(^_^) Studio 的大家都很好！(^_^) 午饭吃了很好吃的面！(^_^) 你最近也要好好吃饭哦！(^_^)

~澄~`,
      en: `Another happy day today! (^_^) Everyone at Studio is so nice! (^_^) I had really good noodles for lunch! (^_^) Make sure you eat well too! (^_^)

~cheng~`,
    },
  },
  {
    from: 'GUEST_4411', date: '2030-02-12', time: '14:26',
    subject: { en: 'Great board!', zh: '很棒的站点！' },
    body: {
      zh: '很棒的站点！内容非常有价值，感谢分享！期待更多高质量的创作！',
      en: 'Great board! Very valuable content, thank you for sharing! Looking forward to more high-quality creations!',
    },
  },
  {
    from: 'SYSOP', date: '2030-02-12', time: '23:59',
    subject: { en: 'who are you', zh: '你是谁' },
    body: {
      zh: `GUEST_4411，你是谁？号码是谁给你的？

-- JR`,
      en: `GUEST_4411, who are you? Who gave you this number?

-- JR`,
    },
  },
  {
    from: 'GUEST_4411', date: '2030-02-13', time: '14:26',
    subject: { en: 're: who are you', zh: 're: 你是谁' },
    body: {
      zh: '感谢你的回复！我是一名热爱创作的访客。你的作品真的很有启发性！',
      en: 'Thank you for your reply! I am a visitor who loves creativity. Your work is truly inspiring!',
    },
  },
  {
    from: 'MOTH', date: '2030-03-08', time: '23:20',
    subject: { en: 'leaving', zh: '走了' },
    body: {
      zh: `明天去房间 三个月
钱够我做完自己的游戏了
里面不让带东西 所以这段时间别给我留言了 看不到
FALL 最高分我又刷了一次 3720 等我回来你再打
在见

  }o{  moth`,
      en: `going to teh rooms tomorrow. three months
enough money to finish my own game
cant bring anything in so dont leave me messages, i wont see them
set a new FALL high score, 3720. beat it when im back
bye

  }o{  moth`,
    },
  },
  {
    from: 'SYSOP', date: '2030-03-09', time: '00:05',
    subject: { en: 're: leaving', zh: 're: 走了' },
    body: {
      zh: `早点回来。

-- JR`,
      en: `Come back soon.

-- JR`,
    },
  },
  {
    from: 'MOTH', date: '2030-04-02', time: '03:07',
    subject: { en: 'Hello from the rooms!', zh: '来自房间的问候！' },
    body: {
      zh: `大家好！房间里很舒适，每个人都很友善！每天都能专心创作，真的很充实！再见！

  }o{  moth`,
      en: `Hello everyone! The rooms are very comfortable and everyone is friendly! Every day I can focus on creating, which is really fulfilling! See you!

  }o{  moth`,
    },
  },
  {
    from: 'SYSOP', date: '2030-04-05', time: '22:40',
    subject: { en: 're: Hello from the rooms!', zh: 're: 来自房间的问候！' },
    body: {
      zh: `MOTH？房间里能拨号？你还好吗？

-- JR`,
      en: `MOTH? You can dial out from the rooms? Are you okay?

-- JR`,
    },
  },
  {
    from: 'MOTH', date: '2030-04-06', time: '03:07',
    subject: { en: 're: re: Hello from the rooms!', zh: 're: re: 来自房间的问候！' },
    body: {
      zh: `很好！房间里很舒适，大家都很友善！再见！

  }o{  moth`,
      en: `I'm great! The rooms are very comfortable and everyone is friendly! See you!

  }o{  moth`,
    },
  },
  {
    from: 'CHENG', date: '2030-04-10', time: '21:00',
    subject: { en: 'Chapter six!', zh: '第六章！' },
    body: {
      zh: `《灯塔》第六章的封面好美！(^_^) 满海岸的灯都亮起来的那一页，我看哭了！(^_^) 还记得我们一起在漫展门口拍的那张照片吗？(^_^) 那天真开心！(^_^)

~澄~`,
      en: `The cover of LIGHTHOUSE chapter six is so beautiful! (^_^) The page where the whole coast lights up made me cry! (^_^) Remember the photo we took together at the convention entrance? (^_^) That was such a happy day! (^_^)

~cheng~`,
    },
  },
  {
    from: 'NIGHTOWL', date: '2030-05-18', time: '02:31',
    subject: { en: 'LISTEN', zh: '听着' },
    body: {
      zh: `有人在你的线路上。好几个月了。不是我。

别在这台机器上写任何你不愿意失去的东西。

他们不需要网络。他们有你的号码。

-- N.O.`,
      en: `SOMEONE IS ON YOUR LINE. HAS BEEN FOR MONTHS. NOT ME.

DO NOT WRITE ANYTHING ON THIS MACHINE YOU ARE NOT WILLING TO LOSE.

THEY DO NOT NEED THE NET. THEY HAVE YOUR NUMBER.

-- N.O.`,
    },
  },
  {
    from: 'SYSOP', date: '2030-05-19', time: '16:02',
    subject: { en: 'N.O.?', zh: 'N.O.？' },
    body: {
      zh: `电话打不通，店也关了。有人知道他去哪了吗？

-- JR`,
      en: `His phone's disconnected and the shop is shut. Does anyone know where he went?

-- JR`,
    },
  },
  {
    from: 'CHENG', date: '2030-05-19', time: '21:00',
    subject: { en: 're: N.O.?', zh: 're: N.O.？' },
    body: {
      zh: `他可能只是去旅行了呀！(^_^) 不要担心！(^_^)

~澄~`,
      en: `Maybe he just went travelling! (^_^) Don't worry! (^_^)

~cheng~`,
    },
  },
  {
    from: 'NIGHTOWL', date: '2030-06-01', time: '10:00',
    subject: { en: 'Hello!', zh: '大家好！' },
    body: {
      zh: `大家好！我过得很好！退休生活太棒啦！希望对你有帮助！

-- N.O.`,
      en: `Hi everyone! Just wanted to say I'm doing great! Retirement is wonderful! Hope this helps!

-- N.O.`,
    },
  },
  {
    from: 'SYSOP', date: '2030-06-11', time: '19:30',
    subject: { en: 'the envelope', zh: '信封' },
    body: {
      zh: `阿澄，信封是你寄的吗？

-- JR`,
      en: `Cheng, did you send the envelope?

-- JR`,
    },
  },
  {
    from: 'CHENG', date: '2030-06-11', time: '21:00',
    subject: { en: 're: the envelope', zh: 're: 信封' },
    body: {
      zh: `什么信封呀？(^_^) 我最近一直在 Studio 哦！(^_^)

~澄~`,
      en: `What envelope? (^_^) I've been at Studio the whole time! (^_^)

~cheng~`,
    },
  },
  {
    from: 'GUEST_7302', date: '2030-07-09', time: '14:26',
    subject: { en: 'Inspiring!', zh: '很有启发！' },
    body: {
      zh: '你的作品真的很有启发性！特别是那些深夜的照片，很有氛围感！期待更多！',
      en: 'Your work is truly inspiring! Especially the late-night photos, so atmospheric! Looking forward to more!',
    },
  },
  {
    from: 'SYSOP', date: '2030-10-15', time: '03:07',
    subject: { en: 'Welcome!', zh: '欢迎！' },
    body: {
      zh: `欢迎来到我的小站！这里有我的作品、日记和游戏，希望你喜欢！有任何问题，欢迎留言！

-- JR`,
      en: `Welcome to my little board! Here you'll find my works, my diary and my games. I hope you enjoy them! If you have any questions, feel free to leave a message!

-- JR`,
    },
  },
  {
    from: 'GUEST_0913', date: '2031-01-04', time: '14:26',
    subject: { en: 'Thank you!', zh: '感谢分享！' },
    body: {
      zh: '感谢分享！非常有价值的内容！',
      en: 'Thank you for sharing! Such valuable content!',
    },
  },
  {
    from: 'JACKIE', date: '2031-02-11', time: '04:20',
    subject: { en: 'anyone?', zh: '有人吗' },
    body: {
      zh: `有人吗。

开机的时候它叫我 Jackie。我不记得自己是谁了，可这台机器好像认识我。`,
      en: `Anyone here?

When it booted it called me Jackie. I don't remember who I am, but this machine seems to know me.`,
    },
  },
  {
    from: 'JACKIE', date: '2031-09-30', time: '03:40',
    subject: { en: 'the photos', zh: '照片' },
    body: {
      zh: 'PHOTOS 里那些 3:07 的照片，拍的是这个房间吗？我现在就坐在这个房间里吗？',
      en: 'The 3:07 photos in PHOTOS. Is that this room? Am I sitting in that room right now?',
    },
  },
  {
    from: 'GUEST_2250', date: '2032-03-17', time: '14:26',
    subject: { en: 'Great content!', zh: '内容很棒！' },
    body: {
      zh: '内容很棒！已收藏！',
      en: 'Great content! Saved!',
    },
  },
  {
    from: 'JACKIE', date: '2032-06-06', time: '01:12',
    subject: { en: 'the diary', zh: '日记' },
    body: {
      zh: '我读完了日记。里面写的都是我做过的事，可我一件也不记得。',
      en: "I finished the diary. Everything in it is something I did. I don't remember any of it.",
    },
  },
  {
    from: 'JACKIE', date: '2033-03-02', time: '02:58',
    subject: { en: "can't leave", zh: '走不了' },
    body: {
      zh: '我想断线，它让我先交一颗种子。你们交了什么？',
      en: 'I tried to log off. It asked me for a seed first. What did you give it?',
    },
  },
  {
    from: 'JACKIE', date: '2033-03-02', time: '03:07',
    subject: { en: "re: can't leave", zh: 're: 走不了' },
    body: {
      zh: '我写了我妈妈的名字。',
      en: "I wrote my mother's name.",
    },
  },
  {
    from: 'JACKIE', date: '2033-05-21', time: '23:16',
    subject: { en: "re: re: can't leave", zh: 're: re: 走不了' },
    body: {
      zh: '我什么也没写，直接按了回车。它也收下了。',
      en: "I didn't write anything. I just pressed enter. It took that too.",
    },
  },
];

/** How the bots answer what the visitor posts: Cheng's, at nine in the evening. */
export const REPLY: Text = {
  zh: `写得真好！(^_^) 好久没看到你发帖了！(^_^) 最近也要好好吃饭哦！(^_^)

~澄~`,
  en: `This is so good! (^_^) It's been so long since you posted! (^_^) Make sure you're eating well! (^_^)

~cheng~`,
};

export const ABOUT: Text = {
  zh: `JR，Jackie Random。写代码的，也画画。

这台机器从没联过网。我在这里放我做的东西：游戏、画、一个还没画完的故事，还有一些不给别人看的东西。

如果你是拨号进来的，你应该认识我。

如果你不认识我，号码是谁给你的？

-- JR`,
  en: `JR, Jackie Random. I write code, and I draw.

This machine has never been on the net. I keep the things I make here: games, drawings, a story I haven't finished, and some things I don't show anyone.

If you dialled in, you should know me.

If you don't know me, who gave you the number?

-- JR`,
};

export type Work = { title: Text; year: string; body: Text; url?: string };

/** Works that live outside this machine. */
export const WORKS: Work[] = [
  {
    title: 'InkTrace',
    year: '2025',
    body: {
      zh: '一个给写小说的人用的独立平台。章节、人物、时间线和整个世界的设定，都放在同一个地方。',
      en: 'An independent platform for people who write novels. Chapters, characters, timelines and the whole of a world, kept in one place.',
    },
    url: 'https://inktrace.app',
  },
  {
    title: 'CD Deck',
    year: '2026',
    body: {
      zh: '一个像操作机器一样使用的音乐播放器。',
      en: 'A music player you operate like a machine.',
    },
    url: '/#about',
  },
  {
    title: { en: 'This terminal', zh: '这台终端' },
    year: '2026',
    body: {
      zh: '暗房间里的一台终端：屏幕下面有六种显像管可选，桌面用鼠标操作。',
      en: 'A terminal in a dark room: six tubes to choose from under the screen, and a desk you drive with the mouse.',
    },
  },
];
