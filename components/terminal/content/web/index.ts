import { WEB } from '../../crt/palette';
import { HOME, slowpost, stories } from './slowpost';
import { cheng, chengGallery, chengGuestbook, weather } from './homepages';
import { FORUM, forum, threads } from './forum';
import { MARKET, market, rules, stall, verify } from './market';
import { BOARD_URL, JR, board, compose, home, letterPage } from './jr';
import { SHOP, buy, shop } from './shop';
import { SEEK, feed, results, seek, studio } from './seek';
import { link, song, t, text, type Maker } from './kit';
import type { Page } from '../../system/gui/page';
import type { Machine } from '../../system/machine';
import type { Text } from '../../system/i18n';

/*
 * The web as NAVIGATOR reaches it: every address it can find, and the page there.
 * The pages are in the files beside this one.
 */

export { HOME, BOARD_URL };

const PAGES: Record<string, Maker> = {
  [HOME]: slowpost, ...stories,
  'weather.laowang.cn': weather,
  'sky.homepage.cn/~cheng': cheng,
  'sky.homepage.cn/~cheng/guestbook': chengGuestbook,
  'sky.homepage.cn/~cheng/gallery': chengGallery,
  [FORUM]: forum, ...threads,
  [MARKET]: market, [`${MARKET}/jr`]: stall, [`${MARKET}/verify`]: verify, [`${MARKET}/rules`]: rules,
  [JR]: home, [BOARD_URL]: board, [`${BOARD_URL}/new`]: compose,
  [SHOP]: shop, [`${SHOP}/buy`]: buy,
  [SEEK]: seek, 'studio.ai': studio, 'foryou.feed': feed,
};

/** An address as typed, reduced to what the pages are filed under. */
export function normalise(url: string): string {
  return url.trim().replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').replace(/\/+(\?|$)/, '$1').toLowerCase();
}

/** The page at an address, or the browser's own page saying there is none. */
export function fetchPage(m: Machine, url: string): Page {
  const clean = normalise(url), [path, query = ''] = clean.split('?');
  const params = new URLSearchParams(query);
  if (path === SEEK && params.has('q')) return results(m, params);
  if (path === BOARD_URL && params.has('n')) return letterPage(m, params);
  const make = PAGES[path];
  if (make) return make(m, params);
  const host = path.split('/')[0];
  return {
    url: clean, title: t('Unable to locate the server', '找不到服务器'), bg: WEB.g85, fg: WEB.black, link: WEB.linkBlue,
    done: t(`Unable to locate the server: ${host}`, `找不到服务器：${host}`),
    blocks: [
      song(t('Unable to locate the server', '找不到服务器')),
      text(t(`The server "${host}" does not have a DNS entry. Check the name and try again.`, `服务器「${host}」没有 DNS 记录。请检查名字后再试。`)),
      text([t('Or ', '或者'), link(t('seek it', '去搜一下'), `${SEEK}/?q=${encodeURIComponent(host)}`), t('.', '。')]),
    ],
  };
}

/** What N.O. left in the bookmarks menu. */
export const BOOKMARKS: { label: Text; url: string }[] = [
  { label: t('SLOW POST', '慢邮 SLOW POST'), url: HOME },
  { label: t('SEEK', 'SEEK 搜索'), url: SEEK },
  { label: t('Night Ferry', '夜航船'), url: FORUM },
  { label: t('Handmade Market', '人手集市'), url: MARKET },
  { label: t("JR's page", 'JR 的小站'), url: JR },
  { label: t("JR's board", 'JR 的留言板'), url: BOARD_URL },
];

/** Every address with a page, for the tests (and nothing else: the night market is not listed anywhere). */
export const ADDRESSES = Object.keys(PAGES);
