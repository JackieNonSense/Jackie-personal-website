import {browser} from './refresh-browser.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const b=await browser(),out='docs/visual/undercurrent-refresh',results=[];
await mkdir(out,{recursive:true});
const mouse=(x,y)=>b.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
const click=async(x,y)=>{await b.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x,y});await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x,y});};
const scroll=selector=>b.run(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:2,mobile:false});
 await b.send('Page.navigate',{url:'http://localhost:3011/'});await b.until(`document.querySelector('[data-testid="rift-canvas"]')?.dataset.opening!==undefined`);await b.run('document.fonts.ready');await b.delay(600);
 await b.shot(out+'/hero-rest.png');
 await b.run(`(()=>{const c=document.querySelector('[data-testid="rift-canvas"]');window.clips=[];window.recorder=new MediaRecorder(c.captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:6000000});window.recorder.ondataavailable=e=>window.clips.push(e.data);window.recorder.start();})()`);
 await mouse(450,500);await b.delay(650);await b.shot(out+'/hero-open.png');
 results.push({step:'hover',data:await b.run(`({...document.querySelector('[data-testid="rift-canvas"]').dataset})`)});
 assert.ok(Number(results.at(-1).data.opening)>.95);
 for(let x=450;x<1080;x+=12){await mouse(x,500);await b.delay(16);}await b.delay(250);await b.shot(out+'/hero-follow.png');
 await click(1050,500);await mouse(200,250);await b.delay(300);
 assert.equal(await b.run(`document.querySelector('[aria-label="探索裂隙"]').getAttribute('aria-pressed')`),'true');
 await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await b.delay(1100);
 assert.ok(Number(await b.run(`document.querySelector('[data-testid="rift-canvas"]').dataset.opening`))<.01);
 const video=await b.run(`new Promise(resolve=>{window.recorder.onstop=()=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(window.clips,{type:'video/webm'}));};window.recorder.stop();})`);await writeFile(out+'/rift-interaction.webm',Buffer.from(video,'base64'));
 await scroll('#work');await b.delay(600);await b.shot(out+'/work-desktop.png');
 await b.run(`Array.from(document.querySelectorAll('#work button')).find(b=>b.textContent.includes('Connect the story')).focus()`);await b.delay(250);await b.shot(out+'/work-annotation.png');
 assert.equal(await b.run(`document.querySelector('[data-testid="inktrace-exhibit"]').dataset.highlight`),'connections');
 await scroll('[data-testid="music-deck"]');await b.until(`document.querySelector('[data-deck-renderer]')?.dataset.deckRenderer==='three'`);await b.delay(500);await b.shot(out+'/deck-rest.png');
 const vol=await b.run(`(()=>{const e=document.querySelector('[data-model-key="volup"]'),r=e.getBoundingClientRect();return{x:r.x+r.width*.6,y:r.y+r.height/2}})()`);await mouse(vol.x,vol.y);await click(vol.x,vol.y);await b.delay(200);
 results.push({step:'pointer-volume',style:await b.run(`(()=>{const e=document.querySelector('[data-model-key="volup"]');return{outline:getComputedStyle(e).outlineStyle,focus:e.matches(':focus-visible')}})()`)});
 assert.equal(results.at(-1).style.outline,'none');await b.shot(out+'/deck-volume.png');
 for(const [w,h] of [[390,844],[1920,1080]]){
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:2,mobile:w===390});await scroll('#work');await b.delay(500);await b.shot(out+'/work-'+w+'.png');
  const layout=await b.run(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cta:document.querySelector('#work a[target]').getBoundingClientRect().toJSON()})`);assert.ok(layout.scrollWidth<=layout.width);results.push({step:'layout-'+w,...layout});
  await b.run(`window.scrollTo({top:0,behavior:'instant'})`);await b.delay(400);await b.shot(out+'/hero-'+w+'.png');
 }
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await b.run(`document.querySelector('[aria-label="探索裂隙"]').focus()`);await b.delay(100);
 assert.equal(await b.run(`document.querySelector('[data-testid="rift-canvas"]').dataset.drawing`),'static');
 results.push({step:'reduced',data:await b.run(`({...document.querySelector('[data-testid="rift-canvas"]').dataset})`)});
 console.log(JSON.stringify({results,errors:b.errors},null,2));assert.equal(b.errors.length,0);
 await writeFile(out+'/checks.json',JSON.stringify({results,errors:b.errors},null,2));
}finally{b.close();}
