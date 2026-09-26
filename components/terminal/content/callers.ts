import { POSTS } from './board';
import { hhmm, isoDate, machineNow } from './time';
import type { Text } from '../system/i18n';
import type { Machine } from '../system/machine';

/*
 * Who called, and when. The last call before the visitor's first is the last time
 * anyone logged in as JACKIE: the newest JACKIE post on the board.
 */
const lastJackie = POSTS.filter(p => p.from === 'JACKIE').at(-1)!;

/** The machine's last login, as a date on its own calendar. */
export function lastCallDate(previous: number | null): Date {
  if (previous !== null) return machineNow(new Date(previous));
  const [y, mo, d] = lastJackie.date.split('-').map(Number), [h, mi] = lastJackie.time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

/** Calendar days between two moments, counted day to day. */
function daysBetween(a: Date, b: Date): number {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(b) - day(a)) / 86_400_000);
}

/** The greeting's "Last call" line. */
export function lastCall(previous: number | null, now: number): Text {
  const then = lastCallDate(previous), days = daysBetween(then, machineNow(new Date(now)));
  const stamp = `${isoDate(then)} ${hhmm(then)}`;
  if (days <= 0) return { en: `Last call: ${stamp}, today`, zh: `上次登录：${stamp}，今天` };
  if (days === 1) return { en: `Last call: ${stamp}, yesterday`, zh: `上次登录：${stamp}，昨天` };
  return { en: `Last call: ${stamp}, ${days} days ago`, zh: `上次登录：${stamp}，${days} 天前` };
}

export type Call = { date: string; time: string; user: string; now?: boolean };

/**
 * The board's log of calls, newest first: everyone who ever posted called, and so
 * did the visitor, every time. Since Jackie, every caller has been JACKIE.
 */
export function lastCallers(m: Machine, limit = 40): Call[] {
  const visits = m.store.get<number[]>('calls', []).map((at, i, all) => {
    const d = machineNow(new Date(at));
    return { date: isoDate(d), time: hhmm(d), user: 'JACKIE', now: i === all.length - 1 };
  });
  const posts = POSTS.map(p => ({ date: p.date, time: p.time, user: p.from === 'SYSOP' ? 'JR' : p.from }));
  // Jackie's own last call, after his last diary entry.
  const calls: Call[] = [...posts, { date: '2030-11-02', time: '03:07', user: 'JR' }, ...visits];
  return calls.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, limit);
}
