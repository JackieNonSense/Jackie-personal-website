import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require('C:/Users/whois/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = resolve('docs/visual/approved-portfolio-v01');
await mkdir(out, {recursive:true});
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true, args:['--mute-audio','--disable-background-networking']});
const reports = [];
const content = ['The first internet felt', 'like another world.', 'I make things that bring', 'a little of that feeling back.', 'A mouse, a keyboard, a small discovery.', 'millennium-era visuals, underground music', 'INTERFACES', 'React / Next.js', 'TypeScript / HTML / CSS', 'INTERACTION', 'Motion / Canvas', 'Scroll / Pointer / Keyboard', 'EXPERIMENTS', 'Three.js', 'An interactive monitor'];
const intersects = (a,b) => a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;

try {
  for (const [width,height,dpr] of [[1440,900,1],[1920,1080,2],[390,844,2],[1024,768,1]]) {
    const context = await browser.newContext({viewport:{width,height}, deviceScaleFactor:dpr, reducedMotion:'reduce'});
    const blocked = [], errors = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (['localhost','127.0.0.1'].includes(url.hostname)) return route.continue();
      blocked.push(url.origin); return route.abort();
    });
    await context.addInitScript(() => {
      window.__mediaPlays = 0;
      HTMLMediaElement.prototype.play = function() { window.__mediaPlays++; this.muted = true; return Promise.reject(new Error('Silent visual audit: media playback is blocked')); };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:3011/', {waitUntil:'networkidle'});
    await page.locator('#about-title').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const about = page.locator('#about');
    const aboutText = await about.innerText();
    for (const fragment of content) assert(aboutText.includes(fragment), `Missing About content at${width}: ${fragment}`);
    assert.equal(await page.locator('main').count(), 1, 'No nested main from embedded Hero');
    assert.deepEqual(await page.locator('main>section[id]').evaluateAll(nodes => nodes.map(n=>n.id)), ['signal','work','about','experiments','contact']);
    assert.equal(await page.locator('[data-testid="paper-fault"]').count(),1);
    assert.equal(await page.locator('#about-title').innerText(),'ABOUT ME');
    const font = await page.locator('#about-title').evaluate(el => ({family:getComputedStyle(el).fontFamily,size:parseFloat(getComputedStyle(el).fontSize),mask:getComputedStyle(el).maskImage}));
    assert(font.family.includes('PortfolioCondensed'), 'Original condensed face remains');
    assert(font.mask.includes('toner-mask'), 'Original worn print treatment remains on title');
    assert(font.size <= (width <= 760 ? width*.37 : Math.min(width*.22,361)), 'Title is modestly reduced, not replaced');
    assert(font.size >= (width <=760 ? 100 : 140), 'Display title remains expressive');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
    await page.locator('#signal').screenshot({path:`${out}/${width}-hero.jpg`,type:'jpeg',quality:88});
    await page.locator('#work').screenshot({path:`${out}/${width}-work.jpg`,type:'jpeg',quality:88});
    await about.scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    const [copyBox,deckBox] = await Promise.all([about.locator('[class*="aboutCopy"]').boundingBox(),page.getByTestId('music-deck').boundingBox()]);
    assert(!intersects(copyBox,deckBox),'Biography and technical skills do not overlap the deck');
    await about.screenshot({path:`${out}/${width}-about.png`});
    await page.locator('#contact').screenshot({path:`${out}/${width}-contact.jpg`,type:'jpeg',quality:88});
    await page.getByRole('button',{name:'暂停动态效果',exact:true}).click();
    for (const fragment of content) assert((await about.innerText()).includes(fragment),'Pause does not remove About content');

    const print = page.locator('[data-print-stage]');
    await print.scrollIntoViewIfNeeded();
    assert.equal(await print.getAttribute('data-playing'),'false','Paused homepage stills the InkTrace print');
    const scale = await page.locator('#work canvas').evaluate(c=>+c.dataset.scale);
    assert(scale<1||Number.isInteger(scale),'InkTrace print keeps a whole-number enlargement wherever the screen allows one');
    assert.equal(await page.locator('#work').getAttribute('data-quiet'),'true','Paused homepage unpins the InkTrace run');
    const printBox = await page.locator('#work canvas').boundingBox();
    assert(printBox.x>=0&&printBox.x+printBox.width<=width,'InkTrace print stays within the page width');
    assert.equal(await page.evaluate(()=>window.__mediaPlays),0,'The homepage never auto-starts music');
    assert.deepEqual(errors,[],'No browser runtime exceptions');
    if(width===1440)await page.screenshot({path:`${out}/1440-full.jpg`,fullPage:true,type:'jpeg',quality:88});
    reports.push({width,height,dpr,font,copyBox,deckBox,content:'all original paragraphs and skills retained',errors,blocked,mediaPlayAttempts:0});
    console.log(`PASS ${width}x${height} DPR${dpr}`);
    await context.close();
  }
  await writeFile(`${out}/audit.json`,JSON.stringify(reports,null,2));
} finally {await browser.close();}
