import { POSTS, REPLY } from './board';
import { hhmm, isoDate, machineNow } from './time';
import type { Text } from '../system/i18n';
import type { Machine } from '../system/machine';

/** A message as the board shows it. */
export type Message = { from: string; date: string; time: string; subject: Text; body: Text };

type OwnPost = { subject: string; body: string; at: number };
/** Cheng answers the visitor after this long, as she always answers now. */
export const REPLY_AFTER = 90_000;

/** The board: the archive, then whatever the visitor wrote, and what came back. */
export function messages(m: Machine): Message[] {
  const own = m.store.get<OwnPost[]>('posts', []);
  const now = Date.now();
  const mine = own.flatMap(p => {
    const when = machineNow(new Date(p.at)), date = isoDate(when), time = hhmm(when);
    const post: Message = { from: 'JACKIE', date, time, subject: p.subject, body: p.body };
    if (now - p.at < REPLY_AFTER) return [post];
    // At nine in the evening, the day it was posted, or the next day if it was later than that.
    const reply = new Date(when);
    if (time >= '21:00') reply.setDate(reply.getDate() + 1);
    return [post, { from: 'CHENG', date: isoDate(reply), time: '21:00', subject: `re: ${p.subject}`, body: REPLY }];
  });
  return [...POSTS, ...mine];
}

export function post(m: Machine, subject: string, body: string): void {
  const own = m.store.get<OwnPost[]>('posts', []);
  m.store.set('posts', [...own, { subject, body, at: Date.now() }].slice(-20));
  m.mark('posted');
}

/** The flag a message sets once read. */
export const readFlag = (msg: Message) => `post:${msg.date}/${msg.time}/${msg.from}`;
