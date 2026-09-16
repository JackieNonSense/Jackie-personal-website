import {browser} from './refresh-browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/visual/ink-living-archive/wiki-v01';
await mkdir(out,{recursive:true});
const b=await browser(),report=[];
const click=label=>b.run(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
const state=()=>b.run(`(()=>{const q=s=>document.querySelector(s),r=e=>{const a=e.getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,b:a.bottom}};return{window:r(q('[data-wiki-window]')),stage:r(q('[data-wiki-stage]')),paper:r(q('article')),image:r(q('[data-wiki-image]')),slot:r(q('[data-reading-slot]')),quote:q('[data-wiki-quote]')?r(q('[data-wiki-quote]')):null,mode:q('[data-wiki-window]').dataset.mode,clock:q('[data-wiki-stage]').dataset.demoMs,actors:q('[data-wiki-stage]').dataset.actorFrames,overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(q('article')).fontFamily,loaded:document.fonts.check('16px WorkshopPixel'),hasMedia:!!q('audio,video,iframe'),textBottom:Math.max(...[...q('article').querySelectorAll('[data-paragraph],[data-wiki-quote],figure')].map(e=>e.getBoundingClientRect().bottom)),footerTop:q('article footer').getBoundingClientRect().top};})()`);
const clipShot=async name=>{const clip=await b.run(`(()=>{const a=document.querySelector('[data-wiki-window]').getBoundingClientRect();return{x:a.x+scrollX,y:a.y+scrollY,width:a.width,height:a.height,scale:1}})()`);await b.shot(`${out}/${name}.png`,clip);};
try{
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [390,1024,1440,1920])for(const dpr of [1,2]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1080,deviceScaleFactor:dpr,mobile:width===390});
  await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});
  await b.until(`!!document.querySelector('[data-wiki-image]')&&document.fonts.check('16px WorkshopPixel')`);
  await b.run(`document.querySelector('[data-wiki-window]').scrollIntoView({block:'start',behavior:'instant'})`);await b.delay(900);
  const initial=await state();await clipShot(`${width}-${dpr}-start`);
  await b.run(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('Wrap right')).click()`);await b.delay(100);
  const wrapped=await state();
  await click('Move quotation earlier');await click('Mara, open character record');await b.delay(100);
  const final=await state();await clipShot(`${width}-${dpr}-result`);
  const hit=await b.run(`(()=>{const misses=[];for(const el of document.querySelectorAll('[data-wiki-window] button')){el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();if(r.height<44)misses.push(el.getAttribute('aria-label')||el.textContent);for(const [x,y] of [[r.x+r.width/2,r.y+r.height/2],[r.x+3,r.y+3],[r.right-3,r.bottom-3]])if(!el.contains(document.elementFromPoint(x,y)))misses.push('occluded: '+(el.getAttribute('aria-label')||el.textContent));}return misses})()`);
  const item={width,dpr,initial,wrapped,final,hit};report.push(item);
  if(process.argv.includes('--scout'))continue;
  assert(!initial.overflow&& !final.overflow,'no horizontal overflow');
  assert(final.textBottom<=final.footerTop-6,'all prose clears manuscript footer');
  assert(final.slot.y>=final.paper.b,'reading slot never overlays page');
  assert(wrapped.image.w<initial.image.w*.6,'actual image dimensions change');
  assert(Math.abs(final.window.h-initial.window.h)<2,'stable window height');
  assert.deepEqual(hit,[],'all controls have44px and reachable edges');
  assert(final.loaded&&!final.hasMedia,'local pixel font and no media');
 }
 console.log(JSON.stringify({passed:report.length,errors:b.errors},null,2));
}finally{await writeFile(`${out}/layout-audit.json`,JSON.stringify({report,errors:b.errors},null,2));await b.close();}
