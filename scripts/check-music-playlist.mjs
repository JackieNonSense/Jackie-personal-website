import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/whois/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true, args:['--mute-audio'] });
try {
  const page = await browser.newPage();
  await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.addInitScript(() => {
    window.__mediaPlays = 0;
    HTMLMediaElement.prototype.play = function () {
      window.__mediaPlays++;
      this.muted = true;
      return Promise.reject(new Error('Silent playlist audit: playback forbidden'));
    };
  });
  await page.goto(process.env.MUSIC_AUDIT_URL || 'http://localhost:3011/', { waitUntil:'domcontentloaded' });
  const deck = page.getByTestId('music-deck');
  await deck.scrollIntoViewIfNeeded();
  const title = deck.locator('[class*="deckCaption"] > span').last();
  assert.equal(await title.innerText(), 'Fly high');
  assert.equal(await deck.getAttribute('data-power'), 'off');
  for (const expected of ['army_mov', 'DIVA', 'Fly high']) {
    const next = deck.getByRole('button', { name:'下一首', exact:true });
    await next.click();
    await page.waitForFunction(expected => document.querySelector('[data-testid="music-deck"] [class*="deckCaption"] > span:last-child')?.textContent === expected, expected);
    await page.waitForFunction(() => !document.querySelector('[data-testid="music-deck"] button[aria-label="下一首"]')?.disabled);
    assert.equal(await title.innerText(), expected);
    assert.equal(await deck.getAttribute('data-power'), 'off');
  }
  const metadata = await page.evaluate(async () => {
    const sources = ['/audio/fly-high-cut.mp3', '/audio/ilyhiryu-army-mov.mp3', '/audio/2z2-diva.mp3'];
    return Promise.all(sources.map(src => new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.muted = true; audio.volume = 0; audio.preload = 'metadata';
      const release = () => { clearTimeout(timer); audio.removeAttribute('src'); audio.load(); };
      const timer = setTimeout(() => { release(); reject(new Error(`Metadata timed out: ${src}`)); }, 15000);
      audio.addEventListener('loadedmetadata', () => {
        const result = { src, duration:audio.duration };
        release(); resolve(result);
      }, { once:true });
      audio.addEventListener('error', () => { release(); reject(new Error(`Invalid audio: ${src}`)); }, { once:true });
      audio.src = src;
    })));
  });
  for (const track of metadata) assert(Number.isFinite(track.duration) && track.duration > 1, track.src);
  assert.equal(await page.evaluate(() => window.__mediaPlays), 0, 'No autoplay or audible validation');
  assert.equal(await deck.locator('a[href*="creativecommons"]').count(), 0);
  console.log(JSON.stringify({ order:['Fly high','army_mov','DIVA'], metadata, mediaPlayAttempts:0, cycle:'passed' }, null, 2));
} finally { await browser.close(); }
