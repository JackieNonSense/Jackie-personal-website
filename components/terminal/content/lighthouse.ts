import type { NovelPage } from '../system/apps/novel';

/*
 * LIGHTHOUSE, the story Jackie was drawing in the good months: chapters one to six,
 * and no ending. The girl looks like Cheng. The pictures are stand-ins drawn by
 * scripts/build-terminal-story.py until the real drawings exist.
 */
const pic = (name: string) => `/terminal/pictures/${name}.png`;
const KEEPER = { en: 'THE KEEPER', zh: '守塔人' };

export const LIGHTHOUSE: NovelPage[] = [
  {
    picture: pic('lh-one'),
    text: {
      zh: '海边的小镇只有一座灯塔。它站在悬崖上，每天晚上转了一圈又一圈，告诉海上的船：这里是岸。',
      en: 'The little town by the sea had only one lighthouse. It stood on the cliff and turned, night after night, telling the ships at sea: here is the shore.',
    },
  },
  {
    picture: pic('lh-window'),
    text: {
      zh: '镇上有个女孩，叫小澄。她喜欢画画。每天晚上，她都趴在窗台上，画那座灯塔。',
      en: 'In the town lived a girl called Xiao Cheng, who loved to draw. Every night she leaned on her windowsill and drew the lighthouse.',
    },
  },
  {
    picture: pic('lh-two'),
    text: {
      zh: '一天早上，镇上的人发现，悬崖上多了一座灯塔。和小澄昨天晚上画的那座，一模一样。',
      en: 'One morning the town woke to find a second lighthouse on the cliff. It was exactly the one Xiao Cheng had drawn the night before.',
    },
  },
  {
    picture: pic('lh-two'),
    speaker: KEEPER,
    text: { zh: '「这是谁建的？」守塔人问。没有人知道。', en: '"Who built this?" asked the keeper. Nobody knew.' },
  },
  {
    picture: pic('lh-many'),
    text: {
      zh: '小澄又画了一座。第二天，海边又多了一座。她画得越多，海岸上的灯塔就越多。镇上的人都很高兴：这么多灯，船再也不会迷路了。',
      en: 'Xiao Cheng drew another, and the next day there was another on the coast. The more she drew, the more lighthouses there were. The town was delighted: with so many lights, no ship would ever be lost again.',
    },
  },
  {
    picture: pic('lh-coast'),
    text: {
      zh: '可是船开始迷路了。满海岸都是光，每一座都在说：这里是岸。船分不清哪一座才是真的。',
      en: 'But the ships began to lose their way. The whole coast was light, and every lighthouse said: here is the shore. No ship could tell which one was true.',
    },
  },
  {
    picture: pic('lh-coast'),
    speaker: KEEPER,
    text: {
      zh: '「别画了，」守塔人对小澄说，「哪一座是我的灯塔？我已经认不出来了。」',
      en: '"Stop drawing," the keeper said to Xiao Cheng. "Which one is my lighthouse? I can\'t tell any more."',
    },
  },
  {
    picture: pic('lh-window-dark'),
    text: { zh: '小澄放下了笔。', en: 'Xiao Cheng put down her pen.' },
  },
  {
    text: {
      zh: '（第六章完。第七章，待续。）\n\n// 结局还没想好。先放着。-- JR',
      en: '(End of chapter six. Chapter seven: to come.)\n\n// I don\'t know the ending yet. Leaving it for now. -- JR',
    },
  },
];
