import {browser} from './refresh-browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]||'http://localhost:3011',out=process.argv[3]||'docs/visual/ink-living-home/local';
const b=await browser(),results=[];
const click=label=>b.run(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
try{
 await mkdir(out,{recursive:true});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__audioAttempts=0;HTMLMediaElement.prototype.play=function(){window.__audioAttempts++;return Promise.reject(new Error('Silent homepage audit'));};`});
 for(const width of [390,1024,1440,1920]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
  await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await b.send('Page.navigate',{url:base+'/#work'});
  await b.until(`(()=>{const e=document.querySelector('#work [aria-label="Open the Living Archive"]');return e&&Object.keys(e).some(k=>k.startsWith('__reactProps$')&&typeof e[k]?.onClick==='function')})()`);
  await b.run('document.fonts.ready');
  await b.run(`document.querySelector('#work').scrollIntoView({block:'start',behavior:'instant'})`);
  await b.shot(`${out}/${width}-book.png`);
  await click('Open the Living Archive');await b.until(`!!document.querySelector('#work [data-living-window]')`);
  for(const scene of ['timeline','characters','ai','wiki']){
   await b.run(`document.querySelector('#tab-${scene}').click()`);
   await b.until(`document.querySelector('[data-living-window]').dataset.scene==='${scene}'`);
   for(let i=0;i<(scene==='wiki'?7:5);i++)await click('Next key step');
   const layout=await b.run(`(()=>{const root=document.querySelector('#work'),win=root.querySelector('[data-living-window]'),r=win.getBoundingClientRect(),stage=win.querySelector('[data-archive-stage],[data-wiki-stage]'),slot=win.querySelector('[data-reading-slot]');return{main:document.querySelectorAll('main').length,h1:document.querySelectorAll('h1').length,work:document.querySelectorAll('#work').length,overflow:document.documentElement.scrollWidth>innerWidth,readingOverlap:stage.getBoundingClientRect().bottom>slot.getBoundingClientRect().top+1,aboutOverlap:root.getBoundingClientRect().bottom>document.querySelector('#about').getBoundingClientRect().top+1,audioAttempts:window.__audioAttempts,font:getComputedStyle(win.querySelector('button')).fontFamily,clip:{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}}})()`);
   const misses=await b.run(`(()=>{const list=[...document.querySelector('#work [data-living-window]').querySelectorAll('button')].filter(e=>!e.disabled&&e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden');return list.flatMap(e=>{e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return r.width<43||r.height<43||![[r.x+r.width/2,r.y+r.height/2],[r.x+3,r.y+3],[r.right-3,r.bottom-3]].every(([x,y])=>e.contains(document.elementFromPoint(x,y)))?[e.getAttribute('aria-label')||e.innerText]:[]})})()`);
   results.push({width,scene,...layout,misses,pass:layout.main===1&&layout.h1===1&&layout.work===1&&!layout.overflow&&!layout.readingOverlap&&!layout.aboutOverlap&&!layout.audioAttempts&&!misses.length&&layout.font.includes('Workshop')});
   if(width===1440||width===390)await b.shot(`${out}/${width}-${scene}.png`,layout.clip);
  }
  await click('Close Living Archive');
  const closed=await b.run(`document.activeElement?.getAttribute('aria-label')==='Open the Living Archive'&&!document.querySelector('[data-living-window]')`);
  results.push({width,check:'close and restore focus',pass:closed});
 }
 // Real clocks, homepage pause, preserved local pause and no background catch-up.
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await b.send('Page.navigate',{url:base+'/#work'});
 await b.until(`(()=>{const e=document.querySelector('[aria-label="Open the Living Archive"]');return e&&Object.keys(e).some(k=>k.startsWith('__reactProps$'))})()`);
 await click('Open the Living Archive');await b.until(`!!document.querySelector('[data-archive-stage]')`);
 await b.run(`document.querySelector('[data-archive-stage]').scrollIntoView({block:'center',behavior:'instant'})`);
 await b.delay(600);
 const time=()=>b.run(`Number(document.querySelector('[data-archive-stage]').dataset.demoMs)`);
 const a=await time();await b.delay(300);const c=await time();
 await click('暂停动态效果');await b.delay(150);const held=await time();await b.delay(350);
 results.push({check:'global pause freezes scene',pass:c>a&&(await time())===held});
 await click('恢复动态效果');await b.delay(300);
 results.push({check:'global resume retains place',pass:(await time())>held&&(await time())<held+800});
 await click('Pause demo');await click('暂停动态效果');await click('恢复动态效果');
 results.push({check:'local pause survives global toggle',pass:await b.run(`!!document.querySelector('[aria-label="Continue demo"]')&&window.__audioAttempts===0`)});
 await writeFile(`${out}/audit.json`,JSON.stringify({base,results,errors:b.errors},null,2));
 console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failed:results.filter(r=>!r.pass),errors:b.errors},null,2));
 if(results.some(r=>!r.pass)||b.errors.length)process.exitCode=1;
}finally{await b.close();}
