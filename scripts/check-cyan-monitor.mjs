import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/whois/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = resolve('docs/visual/cyan-monitor-v04');
const baseURL = process.env.MONITOR_AUDIT_URL || 'http://localhost:3011/';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio', '--disable-background-networking'] });
const results = [];
try {
  for (const width of [1440, 390, 1024, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: width === 390 ? 2 : 1, hasTouch: width === 390, isMobile: width === 390 });
    await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await context.addInitScript(() => {
      window.__mediaPlays = 0;
      HTMLMediaElement.prototype.play = function () { window.__mediaPlays++; this.muted = true; return Promise.reject(new Error('Silent audit')); };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if(message.type()==='error'&&/shader|THREE.WebGLProgram/.test(message.text()))errors.push(message.text());});
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('#experiments').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const monitor = page.getByTestId('monitor-entry');
    const link = page.getByRole('link', { name: 'Open monitor', exact: true });
    const screen = monitor.locator('[data-monitor-fallback-screen]');
    await monitor.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-device-fallback="monitor"]')?.naturalWidth === 1536);
    await page.waitForFunction(() => document.querySelector('[data-crt-renderer="three"]')?.dataset.crtPhase === 'off');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    assert.equal(await screen.getAttribute('aria-hidden'), 'true');
    await monitor.screenshot({ path: `${out}/${width}-rest.png` });
    if (width === 390) {
      await link.tap();
      assert.equal(new URL(page.url()).pathname, '/', 'First touch previews without navigating');
    } else await link.hover();
    await page.waitForFunction(() => Number(document.querySelector('[data-crt-renderer="three"]')?.dataset.crtElapsed) >= .7);
    assert.equal(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-phase'), 'booting', 'JR raster comes before ENTER');
    await monitor.screenshot({ path: `${out}/${width}-refresh.png` });
    await page.waitForFunction(() => document.querySelector('[data-crt-renderer="three"]')?.dataset.crtPhase === 'ready');
    assert(Number(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-elapsed')) >= 2, 'ENTER waits for the two-second reveal');
    assert.equal(await screen.textContent(), 'JR\nENTER', 'No explanatory boot lines');
    assert.equal(await screen.getAttribute('aria-hidden'), 'false');
    const geometry = await monitor.locator('[data-crt-display]').evaluate(el => {
      const r = el.getBoundingClientRect();
      return { screen: { x: r.x, y: r.y, w: r.width, h: r.height },renderer:el.firstElementChild.dataset.crtRenderer,phase:el.firstElementChild.dataset.crtPhase };
    });
    assert.equal(geometry.renderer,'three');
    assert.equal(geometry.phase,'ready');
    await monitor.screenshot({ path: `${out}/${width}-hover.png` });
    await page.screenshot({ path: `${out}/${width}-context.png` });
    if (width !== 390) {
      await page.mouse.move(0, 0); await page.waitForTimeout(500);
      assert.equal(await screen.getAttribute('aria-hidden'), 'true');
      assert.equal(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-phase'),'off');
      if (width === 1440) {
        await link.hover(); await page.waitForTimeout(650);
        assert.equal(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-phase'), 'booting');
        await page.mouse.move(0,0); await page.waitForTimeout(500);
        assert.equal(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-phase'), 'off', 'Leaving mid-refresh cancels and fades');
        await link.hover(); await page.waitForTimeout(250);
        assert(Number(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-elapsed')) < .5, 'Re-enter starts fresh');
        await page.mouse.move(0,0); await page.waitForTimeout(500);
      }
      await link.focus();
      await page.waitForFunction(() => document.querySelector('[data-crt-renderer="three"]')?.dataset.crtPhase === 'ready');
      assert.equal(await screen.getAttribute('aria-hidden'), 'false', 'Keyboard equivalent');
      await page.getByRole('button', { name: '暂停动态效果', exact: true }).click();
      await link.focus(); await page.waitForTimeout(60);
      assert.equal(await screen.getAttribute('aria-hidden'), 'false', 'Pause keeps entry usable');
      const frame=await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-frame');
      await page.waitForTimeout(200);
      assert.equal(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-frame'),frame,'Pause stops GPU clock');
    }
    assert.equal(await link.getAttribute('href'), '/terminal');
    assert.equal(await monitor.locator('canvas').count(), 1, 'One curved CRT canvas, no old shell');
    assert.equal(await page.evaluate(() => window.__mediaPlays), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    if(width===1920){
      await monitor.locator('[data-crt-renderer] canvas').evaluate(canvas=>canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());
      await page.waitForFunction(()=>document.querySelector('[data-crt-renderer="canvas2d"]')?.dataset.crtPhase==='ready');
      assert.equal(await link.getAttribute('href'),'/terminal','Context loss retains native entry');
      await monitor.screenshot({path:`${out}/fallback-2d.png`});
    }
    results.push({ width, geometry, errors, mediaPlayAttempts: 0 });
    if(width===1440&&process.argv.includes('--record')){
      await page.getByRole('button',{name:'恢复动态效果',exact:true}).click();
      await link.evaluate(el=>el.blur());await page.mouse.move(0,0);await page.waitForTimeout(600);
      const bounds=await monitor.boundingBox();
      const crop={left:Math.round(bounds.x),top:Math.round(bounds.y),width:Math.floor(bounds.width),height:Math.floor(bounds.height)};
      const cdp=await context.newCDPSession(page),frames=[];
      cdp.on('Page.screencastFrame',event=>{void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId});const timestamp=event.metadata.timestamp*1000;if(!frames.length||timestamp-frames.at(-1).timestamp>=55)frames.push({jpeg:Buffer.from(event.data,'base64'),timestamp});});
      await cdp.send('Page.startScreencast',{format:'jpeg',quality:94,everyNthFrame:1});
      await page.waitForTimeout(500);await link.hover();await page.waitForTimeout(3800);await page.mouse.move(0,0);await page.waitForTimeout(1000);
      await cdp.send('Page.stopScreencast');await cdp.detach();
      const buffers=[];let height=0,width=0;
      for(const f of frames){const result=await sharp(f.jpeg).extract(crop).ensureAlpha().raw().toBuffer({resolveWithObject:true});buffers.push(result.data);width=result.info.width;height=result.info.height;}
      const delays=frames.map((f,i)=>i+1<frames.length?Math.max(20,Math.round(frames[i+1].timestamp-f.timestamp)):80);
      await sharp(Buffer.concat(buffers),{raw:{width,height:height*buffers.length,channels:4,pageHeight:height}}).gif({loop:0,delay:delays,colours:192,effort:4,dither:.15}).toFile(`${out}/crt-hover.gif`);
      await writeFile(`${out}/recording.json`,JSON.stringify({capture:'Real Chrome compositor frames',frames:frames.length,duration:delays.reduce((a,b)=>a+b,0),sound:false}));
    }
    if (width === 1440) {
      const resume = page.getByRole('button', { name:'恢复动态效果', exact:true });
      if (await resume.count()) await resume.click();
      await link.evaluate(el=>el.blur()); await page.mouse.move(0,0); await page.waitForTimeout(500);
      await page.emulateMedia({ reducedMotion:'reduce' });
      await link.focus(); await page.waitForTimeout(180);
      assert.equal(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-phase'), 'ready', 'Reduced motion shows JR and ENTER immediately');
      const frame = await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-frame');
      await page.waitForTimeout(220);
      assert.equal(await monitor.locator('[data-crt-renderer]').getAttribute('data-crt-frame'), frame, 'Reduced motion has no blink loop');
      await monitor.screenshot({ path:`${out}/reduced-motion.png` });
    }
    console.log(`PASS ${width}: transparent artwork, hover/focus/touch, on-glass JR reveal, silent`);
    await context.close();
  }
  await writeFile(`${out}/audit.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
