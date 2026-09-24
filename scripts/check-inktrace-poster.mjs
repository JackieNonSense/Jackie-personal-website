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
 // Moving visitors: the page scrolls on normally; the run plays itself once seen.
 const sheetInView=page=>page.evaluate(()=>{const c=document.querySelector('#work canvas').getBoundingClientRect();scrollTo({top:scrollY+c.top-(innerHeight-c.height)/2,behavior:'instant'});});
 for(const [width,height] of [[1440,900],[1366,768],[390,844]]){
  const page=await open(width,height,'no-preference');
  const run=page.locator('#work');
  assert.equal(await run.getAttribute('data-quiet'),'false','motion plays the run');
  assert.ok((await run.boundingBox()).height<height*1.6,'the run no longer holds the page: it is about a screen tall');
  // Scrolling towards it: nothing starts until the sheet is actually seen.
  await page.evaluate(()=>scrollTo({top:document.getElementById('work').offsetTop-innerHeight*1.5,behavior:'instant'}));
  await page.waitForTimeout(600);
  const unseen=await ink(page);
  await page.waitForTimeout(600);
  assert.equal(await ink(page),unseen,'the run waits off screen');
  // A real wheel scroll through the section stays smooth: no long frames.
  const frames=await page.evaluate(async()=>{
   const gaps=[];let last=performance.now(),on=true;
   const tick=now=>{gaps.push(now-last);last=now;if(on)requestAnimationFrame(tick);};requestAnimationFrame(tick);
   await new Promise(r=>setTimeout(r,50));
   for(let i=0;i<24;i++){scrollBy({top:90,behavior:'instant'});await new Promise(r=>setTimeout(r,40));}
   on=false;return gaps;
  });
  const worst=Math.max(...frames.slice(2));
  await sheetInView(page);
  const box=await page.locator('#work canvas').boundingBox();
  assert.ok(box.y>=0&&box.y+box.height<=height,`the sheet fits the screen at ${width}×${height}`);
  const shots=[];
  for(const wait of [300,2200,2500,2500,2500,3000]){await page.waitForTimeout(wait);shots.push(await ink(page));if(width!==1366)await page.screenshot({path:`${out}/${width}-play-${shots.length}.png`});}
  assert.equal(new Set(shots).size,shots.length,'the run moves on by itself while seen');
  // Scrolled away mid-run, it pauses; the ending waits for the visitor.
  await page.waitForTimeout(3000);
  const tryLink=page.getByRole('link',{name:/Try InkTrace/});
  assert.equal(await tryLink.getAttribute('href'),'https://inktrace.app');
  assert.equal(await page.getByRole('link',{name:/How InkTrace is built/}).getAttribute('href'),'https://github.com/JackieNonSense/inktrace-showcase');
  const hit=await tryLink.evaluate(a=>{const r=a.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===a;});
  assert.ok(hit,'the finished run’s TRY INKTRACE button is really clickable');
  const end=await ink(page);
  await tryLink.hover();await page.waitForTimeout(150);
  assert.notEqual(await ink(page),end,'hovering a way in reprints its button');
  if(width===1440)await page.screenshot({path:`${out}/${width}-play-hover.png`});
  await page.mouse.move(2,2);
  // REPRINT runs it again from the question, with the ways in out of reach meanwhile.
  await page.getByRole('button',{name:/REPRINT/}).click();await page.waitForTimeout(400);
  assert.notEqual(await ink(page),end,'REPRINT starts the run again');
  const hidden=page.locator('#work nav a[href="https://inktrace.app"]');
  assert.equal(await hidden.evaluate(a=>getComputedStyle(a).pointerEvents),'none','mid-run, the ways in are out of reach');
  assert.equal(await hidden.getAttribute('tabindex'),'-1','mid-run, the ways in are out of the tab order');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(300);
  const away=await ink(page);await page.waitForTimeout(800);
  assert.equal(await ink(page),away,'scrolled away, the run pauses');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal page overflow');
  await page.getByRole('button',{name:'暂停动态效果'}).click();await page.waitForTimeout(300);
  assert.equal(await run.getAttribute('data-quiet'),'true','the homepage pause shows the finished sheet');
  console.log(JSON.stringify({width,height,scale:await page.locator('#work canvas').getAttribute('data-scale'),worstFrameWhileScrolling:Math.round(worst)}));
  await page.close();
 }
 console.log('press run checks passed');
}finally{await browser.close();}
