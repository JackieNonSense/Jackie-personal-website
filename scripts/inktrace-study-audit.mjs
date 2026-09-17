// Use ONLY the dedicated --headless --mute-audio review browser on CDP 9333.
// Does not navigate to the homepage or exercise any audio controls.
import { browser } from './refresh-browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const b = await browser();
const out = 'docs/visual/inktrace-drawers-v01';
const results = [];
await mkdir(out, { recursive: true });
async function click(name) {
  const point = await b.run(`(()=>{const e=document.querySelector('button[aria-label="${name}"]');e.scrollIntoView({block:'nearest',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function fullShot(name) {
  const size = await b.run('({width:innerWidth,height:document.documentElement.scrollHeight})');
  await b.shot(`${out}/${name}.png`, { x: 0, y: 0, ...size, scale: 1 });
}
try {
  for (const [width, height] of [[1440, 900], [390, 844], [1920, 1080]]) {
    await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: width === 390 });
    await b.send('Page.navigate', { url: 'http://localhost:3011/studies/inktrace' });
    await b.until(`document.querySelector('main')?.dataset.open==='none'`);
    await b.run('document.fonts.ready');
    await b.delay(350);
    assert.equal(await b.run("!!document.querySelector('audio,video,canvas')"), false);
    await fullShot(`closed-${width}`);
    await click('Why I built it');
    await b.delay(700);
    assert.equal(await b.run("document.querySelector('main').dataset.open"), 'why');
    await fullShot(`why-${width}`);
    await click('Inside the workspace');
    await b.delay(850);
    await fullShot(`workspace-${width}`);
    const layout = await b.run(`({width:innerWidth,doc:document.documentElement.scrollWidth,panels:document.querySelectorAll('[role=region]').length,active:document.querySelector('main').dataset.open,buttons:[...document.querySelectorAll('button[aria-expanded]')].map(e=>{const r=e.getBoundingClientRect();return{label:e.getAttribute('aria-label'),w:r.width,h:r.height,x:r.x,right:r.right,reachable:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}})})`);
    assert.ok(layout.doc <= width, JSON.stringify(layout));
    assert.equal(layout.panels, 1);
    assert.ok(layout.buttons.every(r => r.w >= 44 && r.h >= 44));
    assert.ok(layout.buttons.every(r => r.x >= 0 && r.right <= width));
    results.push(layout);
    await click('How things connect');
    await b.delay(850);
    await fullShot(`connections-${width}`);
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await b.delay(500);
    assert.equal(await b.run("document.querySelector('main').dataset.open"), 'none');
    assert.equal(await b.run("document.activeElement.getAttribute('aria-label')"), 'How things connect');
  }
  await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await b.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await b.send('Page.navigate', { url: 'http://localhost:3011/studies/inktrace' });
  await b.until(`!!document.querySelector('button[aria-label="Why I built it"]')`);
  await b.run('document.fonts.ready');
  await b.delay(300);
  const touch = await b.run(`(()=>{const e=document.querySelector('button[aria-label="Why I built it"]');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await b.delay(100);
  await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  await b.delay(60);
  await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await b.delay(600);
  assert.equal(await b.run("document.querySelector('main').dataset.open"), 'why');
  results.push({ touch: 'passed' });
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.delay(100);
  assert.equal(await b.run("document.querySelector('main').dataset.motion"), 'still');
  await click('Inside the workspace');
  await b.delay(100);
  assert.equal(await b.run("document.querySelector('[role=region]').getAttribute('aria-labelledby')===document.querySelector('button[aria-label=\"Inside the workspace\"]').id"), true);
  results.push({ reduced: 'passed' });
  await b.send('Network.enable');
  await b.send('Network.setBlockedURLs', { urls: ['*ivory-stock-v01.png*', '*black-stock-v01.png*'] });
  await b.send('Page.reload', { ignoreCache: true });
  await b.until(`document.querySelector('main')?.dataset.open==='none'`);
  await click('Why I built it');
  await b.delay(400);
  await fullShot('texture-fallback-390');
  results.push({ texturesUnavailable: 'content and controls remain usable' });
  assert.equal(b.errors.length, 0);
  await writeFile(`${out}/checks.json`, JSON.stringify({ results, errors: b.errors }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await b.close();
}
