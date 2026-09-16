import {browser} from './refresh-browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const b=await browser(),out='docs/visual/ink-living-archive/four-scenes-v01',results=[],requests=[];
const click=label=>b.run(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
try{
 await mkdir(out,{recursive:true});await b.send('Network.enable');b.onEvent(m=>{if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__errors=[];const original=console.error;console.error=(...a)=>{window.__errors.push(a.map(String).join(' '));original(...a);};`});
 for(const width of [390,1024,1440,1920])for(const dpr of [1,2]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:dpr,mobile:width===390});
  await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});
  await b.until(`(()=>{const e=document.querySelector('[aria-label="Open the Living Archive"]');return e&&Object.keys(e).some(k=>k.startsWith('__reactProps$')&&typeof e[k]?.onClick==='function')})()`);await b.run('document.fonts.ready.then(()=>true)');
  await click('Open the Living Archive');await b.until(`!!document.querySelector('[data-living-window]')`);
  let firstHeight=0;
  for(const scene of ['timeline','characters','ai','wiki']){
   await b.run(`document.querySelector('#tab-${scene}').click()`);await b.until(`document.querySelector('[data-living-window]').dataset.scene==='${scene}'`);
   for(let i=0;i<(scene==='wiki'?7:5);i++)await click('Next key step');
   await b.run(`document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true)))))`);
   const geometry=await b.run(`(()=>{const win=document.querySelector('[data-living-window]'),stage=win.querySelector('[data-archive-stage],[data-wiki-stage]'),slot=win.querySelector('[data-reading-slot]'),r=win.getBoundingClientRect(),sr=stage.getBoundingClientRect(),rr=slot.getBoundingClientRect();return {height:r.height,stage:sr.height,slot:rr.height,overlap:sr.bottom>rr.top+1,overflow:document.documentElement.scrollWidth>innerWidth,slotOverflow:slot.scrollHeight>slot.clientHeight+4,fonts:document.fonts.check('16px WorkshopPixel'),scene:win.dataset.scene,errors:window.__errors,clip:{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}}})()`);
   if(!firstHeight)firstHeight=geometry.height;
   const hit=await b.run(`(()=>{const buttons=[...document.querySelector('[data-living-window]').querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden');return buttons.map(e=>{e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect(),points=[[r.x+r.width/2,r.y+r.height/2],[r.x+3,r.y+3],[r.right-3,r.bottom-3]];return {name:e.getAttribute('aria-label')||e.innerText,small:r.width<43||r.height<43,hit:points.every(([x,y])=>e.contains(document.elementFromPoint(x,y)))}}).filter(e=>e.small||!e.hit)})()`);
   // Desktop holds a fixed window; mobile Wiki keeps its full readable manuscript height.
   const pass=!geometry.overlap&&!geometry.overflow&&!geometry.slotOverflow&&!hit.length&&!geometry.errors.length&&(width===390||Math.abs(geometry.height-firstHeight)<2);
   results.push({width,dpr,scene,pass,...geometry,hit,heightDelta:geometry.height-firstHeight});
   if(dpr===1&&(width===1440||width===390))await b.shot(`${out}/${width}-${scene}-result.png`,geometry.clip);
  }
 }
 await writeFile(`${out}/layout-audit.json`,JSON.stringify({results,requests:[...new Set(requests)],errors:b.errors},null,2));
 console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,failures:results.filter(r=>!r.pass).map(({width,dpr,scene,hit,heightDelta,slotOverflow,overflow,errors})=>({width,dpr,scene,hit,heightDelta,slotOverflow,overflow,errors})),exceptions:b.errors.length},null,2));
}finally{await b.close();}
