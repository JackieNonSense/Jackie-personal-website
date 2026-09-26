import { describe, expect, it } from 'vitest';
import { normalise } from '../components/terminal/content/web';
import { harness } from './terminal-harness';

/** NAVIGATOR open on the desk, its first page come down the line. */
function browser() {
  const h = harness();
  h.onPixelDesk();
  h.click(...h.at('net'));
  h.run(3);
  return h;
}

describe('NAVIGATOR', () => {
  it('opens on SEEK from its icon, the page coming down the line', () => {
    const h = harness();
    h.onPixelDesk();
    h.click(...h.at('net'));
    expect(h.gui().openWindows.at(-1)).toBe('browser');
    h.run(0.05);
    expect(h.screen()).toContain('Contacting host: seek.com');
    h.run(3);
    expect(h.screen()).toContain('Search 41,208,113,556 pages');
    expect(h.screen()).toContain('Document: Done');
  });

  it('follows a link, and goes back', () => {
    const h = browser();
    h.clickText('The Rooms', 'page');
    h.run(3);
    expect(h.screen()).toContain('Bed and board');
    expect(h.screen()).toContain('http://therooms.org');
    h.clickText('◄ Back');
    h.run(3);
    expect(h.screen()).toContain('Search 41,208,113,556 pages');
  });

  it('finds what people wrote, and offers to make the rest', () => {
    const h = browser();
    h.clickText('what are you looking for?', 'page');
    h.keys('jackie');
    h.press('Enter');
    h.run(3);
    expect(h.screen()).toContain('Written by people: 1');
    expect(h.screen()).toContain("JR's page");
    h.clickText('seek again', 'page');
    h.keys('zzz');
    h.press('Enter');
    h.run(3);
    expect(h.screen()).toContain('Would you like one made for you?');
  });

  it('shows the Rooms a new line once the seed log has been read', () => {
    const h = browser();
    h.clickText('The Rooms', 'page');
    h.run(3);
    expect(h.screen()).not.toContain('J. RANDOM. Status: accepted.');
    h.m.mark('file:SYSTEM/SEED.LOG');
    h.clickText('Reload');
    h.run(3);
    h.wheel(...h.at('page'), 10);
    expect(h.screen()).toContain('J. RANDOM. Status: accepted.');
  });

  it('says so when there is no such server', () => {
    const h = browser();
    h.click(...h.at('address'));
    for (let i = 0; i < 20; i++) h.press('Backspace');
    h.keys('nowhere.net');
    h.press('Enter');
    h.run(3);
    expect(h.screen()).toContain('does not have a DNS entry');
  });

  it("opens JR's real works in a real tab", () => {
    const h = browser();
    h.clickText('what are you looking for?', 'page');
    h.keys('jackie');
    h.press('Enter');
    h.run(3);
    h.clickText("JR's page", 'page');
    h.run(3);
    h.clickText('InkTrace', 'page');
    expect(h.opened).toContain('https://inktrace.app');
  });

  it('files addresses however they are typed', () => {
    expect(normalise('HTTP://www.Seek.com/')).toBe('seek.com');
    expect(normalise('no-electronics.com/~jr/')).toBe('no-electronics.com/~jr');
    expect(normalise('seek.com/?q=a')).toBe('seek.com?q=a');
  });
});
