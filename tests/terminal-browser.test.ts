import { describe, expect, it, vi } from 'vitest';
import { ADDRESSES, BOARD_URL, fetchPage, normalise } from '../components/terminal/content/web';
import { messages } from '../components/terminal/content/messages';
import { CHANNELS } from '../components/terminal/content/channels';
import { covers } from '../components/terminal/graphics/webtype';
import { HW } from '../components/terminal/crt/palette';
import { harness } from './terminal-harness';

/** NAVIGATOR opened again from its icon (the desk comes up with it on the board), its first page come down the line. */
function browser() {
  const h = harness();
  h.onPixelDesk();
  h.press('Escape');
  h.click(...h.at('net'));
  h.run(3);
  return h;
}

/** Types an address into the location bar and waits for the page. */
function goTo(h: ReturnType<typeof harness>, url: string) {
  h.click(...h.at('address'));
  for (let i = 0; i < 70; i++) h.press('Backspace');
  h.keys(url);
  h.press('Enter');
  h.run(3);
}

describe('NAVIGATOR', () => {
  it('opens on SLOW POST from its icon, the page coming down the line', () => {
    const h = harness();
    h.onPixelDesk();
    h.press('Escape');
    expect(h.gui().openWindows).toEqual([]);
    h.click(...h.at('net'));
    expect(h.gui().openWindows).toEqual(['browser']);
    h.run(0.05);
    expect(h.screen()).toContain('Contacting host: slowpost.net');
    h.run(3);
    expect(h.screen()).toContain('One letter a week, of things people made.');
    expect(h.screen()).toContain('Document: Done');
  });

  it('follows a link, and goes back', () => {
    const h = browser();
    h.clickText('Night Ferry', 'page');
    h.run(3);
    expect(h.screen()).toContain('http://yehangchuan.bbs.cn');
    expect(h.screen()).toContain('Has anyone heard from MOTH lately?');
    h.clickText('◄ Back');
    h.run(3);
    expect(h.screen()).toContain('One letter a week, of things people made.');
  });

  it('keeps bookmarks', () => {
    const h = browser();
    h.clickText('Bookmarks');
    h.clickText('Handmade Market');
    h.run(3);
    expect(h.screen()).toContain('http://handmade.market');
  });

  it('finds what people wrote, and hides what was generated', () => {
    const h = browser();
    goTo(h, 'seek.com');
    h.clickText('what are you looking for?', 'page');
    h.keys('cheng');
    h.press('Enter');
    h.run(3);
    expect(h.screen()).toContain('written by people, 1');
    expect(h.screen()).toContain("Cheng's Sky");
    expect(h.screen()).toContain('Studio: more like an artist than the artist');
    goTo(h, 'seek.com/?q=zzz');
    expect(h.screen()).toContain('Would you like one made for you?');
  });

  it('says so when there is no such server', () => {
    const h = browser();
    goTo(h, 'nowhere.net');
    expect(h.screen()).toContain('does not have a DNS entry');
  });

  it("opens JR's real works in a real tab", () => {
    const h = browser();
    goTo(h, 'no-electronics.com/~jr');
    h.clickText('InkTrace', 'page');
    expect(h.opened).toContain('https://inktrace.app');
  });

  it('files addresses however they are typed', () => {
    expect(normalise('HTTP://www.SlowPost.net/')).toBe('slowpost.net');
    expect(normalise('no-electronics.com/~jr/')).toBe('no-electronics.com/~jr');
    expect(normalise('seek.com/?q=a')).toBe('seek.com?q=a');
  });

  it('has every character of every page in its own type', () => {
    const h = harness();
    const words: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === 'string') words.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    const urls = [...ADDRESSES, 'seek.com/?q=cheng', 'seek.com/?q=zzz', 'nowhere.net', ...messages(h.m).map((_m, i) => `${BOARD_URL}?n=${i + 1}`)];
    for (const url of urls) { const p = fetchPage(h.m, url); walk(p.blocks); walk(p.title); }
    expect(covers('body', words.join(''))).toEqual([]);
  });
});

describe("JR's board", () => {
  it('is what the desk comes up on: the newest letter, and every letter below it', () => {
    const h = harness();
    h.onDesk();
    expect(h.gui().openWindows).toEqual(['browser']);
    h.run(3);
    expect(h.screen()).toContain("JR's board");
    expect(h.screen()).toContain("I didn't write anything.");
    const newest = messages(h.m).at(-1)!;
    expect(h.m.has(`post:${newest.date}/${newest.time}/${newest.from}`)).toBe(true);
  });

  it('scrolls with the wheel to the oldest letters, and reads one', () => {
    const h = harness();
    h.onDesk();
    h.run(3);
    h.wheel(...h.at('page'), 40);
    h.clickText("i'm here!!", 'page');
    h.run(3);
    expect(h.m.has('post:2029-10-01/23:40/CHENG')).toBe(true);
    h.clickText('◄ older', 'page');
    h.run(3);
    expect(h.screen()).toContain('re: Open');
  });

  it('opens from the Messages icon, wherever NAVIGATOR was', () => {
    const h = browser();
    h.click(...h.at('board'));
    h.run(3);
    expect(h.screen()).toContain('http://no-electronics.com/~jr/board');
  });

  it('posts as JACKIE, and Cheng answers', () => {
    const h = harness();
    h.onDesk();
    h.run(3);
    h.clickText('Write something', 'page');
    h.run(3);
    h.clickText('subject', 'page');
    h.keys('hello');
    h.press('Tab');
    h.keys('is anyone here');
    h.press('Enter');
    h.run(3);
    expect(h.screen()).toContain('JACKIE');
    expect(h.screen()).toContain('is anyone here');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
    h.clickText('Reload');
    h.run(3);
    expect(h.screen()).toContain('re: hello');
    clock.mockRestore();
  });
});

describe('the night market', () => {
  it('sells a tube and a screen saver, which arrive in Settings', () => {
    const h = browser();
    goTo(h, 'yeshi.shop');
    expect(h.screen()).toContain('you have ¥ 300');
    h.clickText('[ buy ]', 'page');
    h.run(3);
    expect(h.screen()).toContain('Paid.');
    expect(h.m.store.get('wallet', 0)).toBeLessThan(300);
    goTo(h, 'yeshi.shop/buy?item=p7');
    goTo(h, 'yeshi.shop/buy?item=stars');
    expect(h.m.has('bought:p7') && h.m.has('bought:stars')).toBe(true);
    h.click(4, 8);
    h.clickText('Settings...');
    expect(h.screen()).toContain('P7 radar blue');
    expect(h.screen()).toContain('Stars');
    h.clickText('P7 radar blue');
    expect(h.m.theme.id).toBe('p7');
    h.clickText('Stars');
    expect(h.m.store.get('saver', '')).toBe('stars');
  });

  it('keeps Settings as it was until something is bought', () => {
    const h = harness();
    h.onPixelDesk();
    h.click(4, 8);
    h.clickText('Settings...');
    expect(h.screen()).toContain('Seeds');
    expect(h.screen()).not.toContain('P7 radar blue');
    expect(h.screen()).not.toContain('Stars');
  });

  it('sells a tape that plays on channel 15, and nothing without the money', () => {
    const h = browser();
    const ch15 = CHANNELS.find(c => c.number === 15)!;
    const blue = () => { ch15.draw(h.m, 5); return h.m.graphics().filter(v => v === HW.blue).length / h.m.graphics().length; };
    expect(blue()).toBeGreaterThan(0.8);
    goTo(h, 'yeshi.shop/buy?item=tape');
    expect(h.screen()).toContain('channel 15');
    expect(h.m.has('bought:tape')).toBe(true);
    expect(blue()).toBeLessThan(0.5);
    h.m.store.set('wallet', 10);
    goTo(h, 'yeshi.shop/buy?item=stars');
    expect(h.screen()).toContain('Not enough money.');
    expect(h.m.has('bought:stars')).toBe(false);
  });
});
