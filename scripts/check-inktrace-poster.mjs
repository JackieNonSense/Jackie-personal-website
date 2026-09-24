import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/whois/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
const base=process.argv[2]||'http://localhost:3011';
const out='docs/visual/inktrace-press';
await mkdir(out,{recursive:true});
const ink=page=>page.locator('#work canvas').evaluate(c=>c.toDataURL());
const open=async(width,height,reducedMotion)=>{
 const page=await browser.newPage({viewport:{width,height},reducedMotion});
 await page.route(/\.(mp3|wav|ogg|m4a)(\?|$)/,route=>route.abort());
 await page.goto(base+'/',{waitUntil:'networkidle'});
 return page;
};
/** Scrolls so the run is `p` of the way through, and waits for the sheet to reprint. */
const scrollRun=async(page,p)=>{
 await page.evaluate(p=>{const r=document.getElementById('work'),top=r.getBoundingClientRect().top+scrollY;scrollTo({top:top+(r.offsetHeight-innerHeight)*p,behavior:'instant'});},p);
 await page.waitForTimeout(250);
};
try{
 // Still visitors: the finished sheet, unpinned, at every breakpoint.
 for(const [width,height,minScale] of [[1440,900,2],[900,900,1],[390,844,0]]){
  const page=await open(width,height,'reduce');
  const run=page.locator('#work');
  await run.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  assert.equal(await run.getAttribute('data-quiet'),'true','reduced motion does not pin the run');
  assert.ok((await run.boundingBox()).height<height*1.6,'the still run is not scroll-long');
  const print=await page.locator('#work canvas').evaluate(c=>{const r=c.getBoundingClientRect();return{scale:+c.dataset.scale,left:r.left,right:r.right,width:r.width};});
  assert.ok(print.scale>=minScale&&(print.scale<1||Number.isInteger(print.scale)),`whole-number enlargement at ${width} (got ${print.scale})`);
  assert.ok(print.left>=0&&print.right<=width,'the print stays inside the viewport');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal page overflow');
  const fit=await page.evaluate(()=>{const h=document.getElementById('work-title'),r=document.createRange();r.selectNodeContents(h);return{text:r.getBoundingClientRect().right,mask:h.getBoundingClientRect().right};});
  assert.ok(fit.text<=fit.mask,`PROJECTS stays inside its mask at ${width}`);
  const tryLink=page.getByRole('link',{name:/Try InkTrace/});
  const hit=await tryLink.evaluate(a=>{const r=a.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===a;});
  assert.ok(hit,'the finished sheet’s TRY INKTRACE button is really clickable');
  await run.screenshot({path:`${out}/${width}-still.png`});
  console.log(JSON.stringify({width,still:print}));
  await page.close();
 }
 // Scrolling visitors: the run pins, prints forward, runs backward, and fits the screen.
 for(const [width,height] of [[1440,900],[1366,768],[390,844]]){
  const page=await open(width,height,'no-preference');
  assert.equal(await page.locator('#work').getAttribute('data-quiet'),'false','motion pins the run');
  await scrollRun(page,0);await page.waitForTimeout(1800);// the question sets itself
  const pinned=[];const shots=[];
  for(const p of [0,.1,.2,.35,.5,.65,.76,.82,.9,1]){
   await scrollRun(page,p);
   const box=await page.locator('#work canvas').boundingBox();
   pinned.push(Math.round(box.y));shots.push(await ink(page));
   if(width!==1366)await page.screenshot({path:`${out}/${width}-run-${String(Math.round(p*100)).padStart(3,'0')}.png`});
   assert.ok(box.y>=0&&box.y+box.height<=height,`the sheet fits the screen while pinned at ${width}×${height} (p=${p}: ${Math.round(box.y)}–${Math.round(box.y+box.height)})`);
  }
  assert.equal(new Set(pinned.slice(0,-1)).size,1,`the sheet holds still while the run scrolls (${pinned})`);
  assert.equal(new Set(shots).size,shots.length,'every step of the run prints a different sheet');
  // At the end the two ways in are printed and live; hovering one reprints the sheet.
  const tryLink=page.getByRole('link',{name:/Try InkTrace/});
  assert.equal(await tryLink.getAttribute('href'),'https://inktrace.app');
  assert.equal(await page.getByRole('link',{name:/How InkTrace is built/}).getAttribute('href'),'https://github.com/JackieNonSense/inktrace-showcase');
  const before=await ink(page);
  await tryLink.hover();await page.waitForTimeout(150);
  assert.notEqual(await ink(page),before,'hovering a way in reprints its button');
  if(width===1440)await page.screenshot({path:`${out}/${width}-run-hover.png`});
  await page.mouse.move(2,2);
  await scrollRun(page,.35);
  assert.equal(await ink(page),shots[3],'scrolling back reprints the same sheet: the run reverses');
  // Mid-run the ways in are hidden from assistive tech too, so find them by address, not role.
  const hidden=page.locator('#work nav a[href="https://inktrace.app"]');
  assert.equal(await hidden.evaluate(a=>getComputedStyle(a).pointerEvents),'none','mid-run, the ways in are out of reach');
  assert.equal(await hidden.getAttribute('tabindex'),'-1','mid-run, the ways in are out of the tab order');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal page overflow');
  await page.getByRole('button',{name:'暂停动态效果'}).click();await page.waitForTimeout(300);
  assert.equal(await page.locator('#work').getAttribute('data-quiet'),'true','the homepage pause unpins it');
  console.log(JSON.stringify({width,height,pinnedAt:pinned[0],scale:await page.locator('#work canvas').getAttribute('data-scale')}));
  await page.close();
 }
 console.log('press run checks passed');
}finally{await browser.close();}
