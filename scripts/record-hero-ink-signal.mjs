import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const {chromium} = require('C:/Users/whois/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const destination = resolve('docs/visual/hero-ink-signal-v01');
await mkdir(destination, {recursive: true});
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--mute-audio', '--disable-background-networking'],
});
const errors = [];
const blockedRequests = [];
const context = await browser.newContext({viewport: {width: 1120, height: 820}, deviceScaleFactor: 1});
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (['localhost', '127.0.0.1'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
  blockedRequests.push(url.origin);
  return route.abort();
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const report = [];
const wait = ms => page.waitForTimeout(ms);
try {
  await page.goto('http://localhost:3011/studies/hero/ink-signal', {waitUntil: 'networkidle'});
  const stage = page.locator('[data-hero-proof]');
  await stage.waitFor();
  await page.waitForFunction(() => Number(document.querySelector('[data-hero-proof]')?.dataset.time) > 0);
  const entry = page.getByRole('button', {name: 'Open hidden paper', exact: true});
  const note = page.getByRole('dialog', {name: 'Hidden paper', exact: true});
  assert.equal(await note.count(), 0, 'No password before explicit activation');
  assert.equal(await page.locator('audio,video').count(), 0, 'The isolated sample has no media/audio elements');
  await stage.click({position: {x: 70, y: 80}});
  assert.equal(await note.count(), 0, 'Ordinary artwork click must not open or latch');
  await page.getByRole('button', {name: 'Pause motion', exact: true}).click();
  await wait(60);
  const pausedAt = Number(await stage.getAttribute('data-time'));
  await wait(350);
  assert.equal(Number(await stage.getAttribute('data-time')), pausedAt, 'Pause freezes the actual drawing clock');
  await page.getByRole('button', {name: 'Resume motion', exact: true}).click();
  await wait(160);
  assert(Number(await stage.getAttribute('data-time')) > pausedAt, 'Resume continues the clock');
  await stage.screenshot({path: `${destination}/01-rest.png`});
  await entry.focus();
  await page.keyboard.press('Enter');
  await note.waitFor({state: 'visible'});
  await wait(440);
  assert.match(await note.innerText(), /3c5614/, 'Existing password remains unchanged');
  await stage.screenshot({path: `${destination}/02-note.png`});
  await page.keyboard.press('Escape');
  await note.waitFor({state: 'hidden'});
  assert(await entry.evaluate(element => document.activeElement === element), 'Closing returns keyboard focus to the paper tab');
  report.push('Desktop: ordinary click does nothing; keyboard opens existing password; Escape closes and returns focus; pause/resume verified.');

  // Capture actual browser output, without changing component internals or inventing frames.
  if (!process.argv.includes('--audit-only')) {
    await stage.scrollIntoViewIfNeeded();
    await page.mouse.move(3, 3);
    const bounds = await stage.boundingBox();
    assert(bounds, 'The recording must use the actual artwork bounds');
    const crop = {left: Math.round(bounds.x), top: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height)};
    const session = await context.newCDPSession(page);
    const frames = [];
    let capturing = false;
    const onFrame = event => {
      // Acknowledge immediately; JPEG decode/resize/GIF quantization happen after capture.
      void session.send('Page.screencastFrameAck', {sessionId: event.sessionId}).catch(() => {});
      if (!capturing) return;
      const timestamp = event.metadata.timestamp * 1000;
      if (frames.length && timestamp - frames.at(-1).timestamp < 60) return;
      frames.push({jpeg: Buffer.from(event.data, 'base64'), timestamp});
    };
    session.on('Page.screencastFrame', onFrame);
    try {
      await session.send('Page.startScreencast', {format: 'jpeg', quality: 91, maxWidth: 1120, maxHeight: 820, everyNthFrame: 1});
      capturing = true;
      await page.getByRole('button', {name: 'Replay discovery demo', exact: true}).click();
      await page.mouse.move(3, 3);
      await wait(9600);
      capturing = false;
      await session.send('Page.stopScreencast');
    } finally {
      session.off('Page.screencastFrame', onFrame);
      await session.detach();
    }
    assert(frames.length > 1, 'Chrome must supply real compositor frames');
    const delays = frames.map((frame, index) => index + 1 < frames.length ? Math.max(10, Math.round(frames[index + 1].timestamp - frame.timestamp)) : Math.round(frames.at(-1).timestamp - frames.at(-2).timestamp));
    const duration = delays.reduce((a, b) => a + b, 0);
    const fps = frames.length / (duration / 1000);
    assert(fps >= 10, `Continuous browser capture must reach 10fps; received ${fps.toFixed(2)}fps`);
    const buffers = [];
    let width = 0, height = 0;
    for (const frame of frames) {
      const {data, info} = await sharp(frame.jpeg).extract(crop).resize({width: 960}).ensureAlpha().raw().toBuffer({resolveWithObject: true});
      width = info.width; height = info.height;
      buffers.push(data);
    }
    await sharp(Buffer.concat(buffers), {raw: {width, height: height * buffers.length, channels: 4, pageHeight: height}})
      .gif({loop: 0, delay: delays, effort: 4, colours: 192, dither: 0.25})
      .toFile(`${destination}/hero-discovery.gif`);
    await writeFile(`${destination}/recording.json`, JSON.stringify({capture: 'Chrome CDP screencast', frames: frames.length, durationMs: duration, framesPerSecond: fps, width, height, realTimestamps: frames.map(frame => frame.timestamp), sound: false}, null, 2));
    report.push(`Recorded ${frames.length} actual compositor frames, ${duration}ms, ${fps.toFixed(2)}fps, silent.`);
  }

  await page.emulateMedia({reducedMotion: 'reduce'});
  await wait(120);
  await entry.focus();
  await page.keyboard.press('Space');
  await note.waitFor({state: 'visible'});
  assert.match(await note.innerText(), /3c5614/);
  await page.getByRole('button', {name: 'Close hidden paper', exact: true}).click();
  await note.waitFor({state: 'hidden'});
  const stillAt = await stage.getAttribute('data-time');
  await wait(200);
  assert.equal(await stage.getAttribute('data-time'), stillAt);
  report.push('Reduced motion: static clock, keyboard and close control remain available.');

  await page.setViewportSize({width: 390, height: 844});
  await entry.click();
  await note.waitFor({state: 'visible'});
  await wait(80);
  const [nb, sb] = await Promise.all([note.boundingBox(), stage.boundingBox()]);
  assert(nb && sb && nb.x >= 0 && nb.x + nb.width <= 391, 'Mobile note fits the viewport');
  const closeBox = await page.getByRole('button', {name: 'Close hidden paper', exact: true}).boundingBox();
  assert(closeBox.width >= 44 && closeBox.height >= 44, 'Mobile close target is at least44px');
  await page.screenshot({path: `${destination}/03-mobile.png`});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
  report.push('390px: note contained, close target at least44px, no horizontal overflow.');
  assert.deepEqual(errors, [], 'No browser runtime exceptions');
  await writeFile(`${destination}/audit.json`, JSON.stringify({report, errors, blockedRequests, sound: false}, null, 2));
  console.log(JSON.stringify({destination, report, errors, blockedRequests}, null, 2));
} finally {
  await context.close();
  await browser.close();
}
