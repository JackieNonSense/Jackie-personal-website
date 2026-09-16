import {browser} from './refresh-browser.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const b=await browser(),report=[];
try{
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [390,1024,1440,1920]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height:1080,deviceScaleFactor:1,mobile:width===390});
  await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});await b.until(`!!document.querySelector('[data-wiki-window]')`);await b.run('document.fonts.ready.then(()=>true)');await b.delay(300);
  const states=[];
  for(let step=0;step<8;step++){
   await b.until(`!!document.querySelector('[aria-label="Demonstration step ${step+1} of 8"]')`);
   await b.run('new Promise(resolve=>requestAnimationFrame(()=>resolve(true)))');
   const rect=await b.run(`(()=>{const a=document.querySelector('article'),w=document.querySelector('[data-wiki-window]'),text=[...a.querySelectorAll('[data-paragraph],[data-wiki-quote],figure')];return{height:w.getBoundingClientRect().height,paper:a.getBoundingClientRect().height,clearance:a.querySelector('footer').getBoundingClientRect().top-Math.max(...text.map(e=>e.getBoundingClientRect().bottom))}})()`);
   states.push(rect);assert(rect.clearance>=6,`step${step} text clears footer at${width}`);
   if(step<7)await b.run(`document.querySelector('[aria-label="Next key step"]').click()`);
  }
  report.push({width,states});
  assert(Math.max(...states.map(r=>r.height))-Math.min(...states.map(r=>r.height))<2,`all8steps keep stable window at${width}`);
 }
 await b.send('Network.enable');await b.send('Network.setCacheDisabled',{cacheDisabled:true});await b.send('Network.setBlockedURLs',{urls:['*coast-v01.webp']});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});await b.delay(1800);
 report.push({blockedMap:await b.run(`Array.from(document.images).map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth}))`)});
 await b.until(`document.body.innerText.includes('illustration unavailable')`);
 await b.run(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('Wrap right')).click()`);
 assert.equal(await b.run(`document.querySelector('[data-wiki-image]').style.width`),'44%');
 report.push({mapFailed:true,htmlControlsWork:true});
 await b.send('Network.setBlockedURLs',{urls:[]});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='2d')throw Error('test graphics denied');return get.call(this,kind,...args)};`});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});await b.until(`!!document.querySelector('article')`);await b.delay(700);
 await b.run(`document.querySelector('[aria-label="Mara, open character record"]').click()`);
 assert((await b.run(`document.querySelector('[data-reading-slot]').textContent`)).includes('Mara / The archivist'));
 report.push({canvasUnavailable:true,readingControlsWork:true,errors:b.errors});assert.deepEqual(b.errors,[]);
 console.log(JSON.stringify({passed:true,viewports:4,steps:32,fallbacks:2}));
}finally{await writeFile('docs/visual/ink-living-archive/wiki-v01/fallback-audit.json',JSON.stringify(report,null,2));await b.close();}
