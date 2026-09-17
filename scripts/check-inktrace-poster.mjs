import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/whois/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
await mkdir('docs/visual/inktrace-poster',{recursive:true});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  await page.route(/\.(mp3|wav|ogg|m4a)(\?|$)/,route=>route.abort());
  await page.goto('http://localhost:3011/',{waitUntil:'networkidle'});
  await page.locator('#work').scrollIntoViewIfNeeded();
  const poster=page.locator('#work');
  await poster.screenshot({path:`docs/visual/inktrace-poster/${width}-poster.png`});
  const before=await poster.boundingBox();
  await page.getByRole('button',{name:'Open the Living Archive'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.waitFor();
  assert.equal(await page.getByRole('tab',{name:/Wiki/}).evaluate(e=>getComputedStyle(e).color),'rgb(35, 36, 31)','window controls retain dark readable ink');
  const box=await dialog.boundingBox();
  const after=await poster.boundingBox();
  assert.equal(before.height,after.height,'opening keeps work section height');
  assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=page.viewportSize().height,'window fits viewport');
  // Above the single-column breakpoint the poster is a black intro column beside a
  // white sheet; a viewport-centred window would cover the INKTRACE title.
  if(width>700){
   const paper=await page.locator('[data-poster-paper]').boundingBox();
   assert.ok(box.x>=paper.x-2,`window starts inside the white sheet (${box.x} vs ${paper.x})`);
   assert.ok(box.x+box.width<=paper.x+paper.width+2,`window ends inside the white sheet (${box.x+box.width} vs ${paper.x+paper.width})`);
  }
  // The toner mask only paints over the heading's own box, so a title that
  // outgrows its column loses its last letter outright.
  const fit=await page.evaluate(()=>{const h=document.getElementById('work-title');
   const r=document.createRange();r.selectNodeContents(h);
   return{text:r.getBoundingClientRect().right,mask:h.getBoundingClientRect().right,label:h.textContent};});
  assert.ok(fit.text<=fit.mask,`the ${fit.label} title stays inside its mask at ${width} (text ${fit.text.toFixed(1)} vs mask ${fit.mask.toFixed(1)})`);
  const close=await page.getByRole('button',{name:'Close Living Archive'}).boundingBox();
  assert.ok(close.width>=44&&close.height>=44,'close target is at least 44px');
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'','no body scroll lock');
  await page.screenshot({path:`docs/visual/inktrace-poster/${width}-window.png`});
  await page.getByRole('tab',{name:/Wiki/}).click();
  await page.getByRole('button',{name:'Wrap right'}).click();
  assert.equal(await page.locator('[data-wiki-image]').evaluate(e=>e.style.float),'right');
  await page.screenshot({path:`docs/visual/inktrace-poster/${width}-wiki.png`});
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(),0);
  assert.equal(await page.getByRole('button',{name:'Open the Living Archive'}).evaluate(e=>e===document.activeElement),true);
  const font=await poster.evaluate(e=>getComputedStyle(e).fontFamily);
  assert.ok(!font.includes('Pixel'),'outside poster typography is not pixelized');
  console.log(JSON.stringify({width,poster:before,window:box,font}));
  await page.close();
 }
}finally{await browser.close();}
