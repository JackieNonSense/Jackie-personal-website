import {browser} from './refresh-browser.mjs';
import {writeFile} from 'node:fs/promises';
const b=await browser(),checks=[];
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`HTMLCanvasElement.prototype.getContext=function(){return null};`});await b.send('Network.enable');await b.send('Network.setCacheDisabled',{cacheDisabled:true});await b.send('Network.setBlockedURLs',{urls:['*living-archive/scenes/*','*living-archive/wiki/coast-v01.webp']});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});await b.until(`!!document.querySelector('[aria-label="Open the Living Archive"]')`);await b.run(`document.querySelector('[aria-label="Open the Living Archive"]').click()`);await b.until(`!!document.querySelector('[data-living-window]')`);
 for(const id of ['timeline','characters','ai','wiki']){
  await b.run(`document.querySelector('#tab-${id}').click()`);await b.until(`document.querySelector('[data-living-window]').dataset.scene==='${id}'`);for(let i=0;i<(id==='wiki'?7:5);i++)await b.run(`document.querySelector('[aria-label="Next key step"]').click()`);
  if(id==='characters')await b.run(`document.querySelector('[aria-label="Sen, view character"]').click()`);
  if(id==='ai')await b.run(`document.querySelector('[aria-label="Confirm and create canvas"]').click()`);
  if(id==='wiki')await b.run(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Wrap left')).click()`);
  await b.delay(150);const result=await b.run(`({text:document.querySelector('[data-reading-slot]').innerText,overflow:document.documentElement.scrollWidth>innerWidth,canvas:document.querySelector('canvas')?.dataset.renderMode,mapFallback:document.body.innerText.includes('illustration unavailable')})`);
  const pass=!result.overflow&&(id==='timeline'?result.text.includes('Departure'):id==='characters'?result.text.includes('Sen'):id==='ai'?result.text.includes('Canvas created'):result.mapFallback);checks.push({id,pass,...result});
 }
 await writeFile('docs/visual/ink-living-archive/four-scenes-v01/fallback-audit.json',JSON.stringify({checks,errors:b.errors},null,2));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length,errors:b.errors},null,2));
}finally{await b.close();}
