import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const destination = resolve(process.env.PORTFOLIO_REVIEW_DIR || 'docs/visual/portfolio-review');
await mkdir(destination, { recursive: true });
const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { socket.addEventListener('open', res, { once:true }); socket.addEventListener('error', rej, { once:true }); });
let sequence=0;
const pending=new Map(), exceptions=[];
socket.addEventListener('message', event => {
 const message=JSON.parse(event.data);
 if(message.method==='Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
 if(!message.id) return;
 const request=pending.get(message.id); if(!request) return;
 pending.delete(message.id); clearTimeout(request.timeout);
 if(message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
});
function send(method,params={}){return new Promise((res,rej)=>{const id=++sequence;const timeout=setTimeout(()=>{pending.delete(id);rej(new Error(method+' timed out'));},45000);pending.set(id,{resolve:res,reject:rej,timeout});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
const delay = ms=>new Promise(res=>setTimeout(res,ms));
async function screenshot(name,clip){const viewport=clip??await evaluate('({x:scrollX,y:scrollY,width:innerWidth,height:innerHeight,scale:1})');const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:viewport});await writeFile(resolve(destination,name),Buffer.from(shot.data,'base64'));const preview=await send('Page.captureScreenshot',{format:'jpeg',quality:85,captureBeyondViewport:true,clip:viewport});await writeFile(resolve(destination,name.replace('.png','.jpg')),Buffer.from(preview.data,'base64'));}
async function click(selector){const rect=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect});await delay(400);}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await send('Page.navigate',{url:'http://localhost:3011/'});
 await evaluate(`new Promise((res,rej)=>{const start=Date.now();const check=()=>{if(document.querySelector('[data-testid="portfolio"]'))res(true);else if(Date.now()-start>35000)rej('Portfolio missing');else setTimeout(check,100)};check()})`);
 await evaluate(`document.fonts.ready.then(()=>Promise.all([...document.images].map(i=>i.decode())))`);
 await delay(1200);
 const report={url:'http://localhost:3011/',checkedAt:new Date().toISOString(),checks:[]};
 assert.equal(await evaluate(`document.querySelectorAll('h1').length`),1);
 assert.equal(await evaluate(`document.querySelector('[data-testid="proof-stage"]')===null`),true);
 const before=await evaluate(`document.querySelector('canvas').toDataURL()`);await delay(300);
 assert.notEqual(await evaluate(`document.querySelector('canvas').toDataURL()`),before,'Characters really move');
 await screenshot('00-signal-desktop.png');
 assert.ok(await evaluate(`(()=>{const r=document.querySelector('nav[aria-label="Primary navigation"] a:last-child').getBoundingClientRect();return r.right>innerWidth*.9})()`),'Contact stays on the right, away from signal status');
 assert.ok(await evaluate(`(()=>{const a=[...document.querySelectorAll('#signal a')].find(a=>a.textContent.includes('FOLLOW THE SIGNAL')).getBoundingClientRect();const b=document.querySelector('button[aria-label="暂停动态效果"]').getBoundingClientRect();return a.bottom<=b.top||a.right<=b.left})()`),'Pause control does not obscure scroll navigation');
 await click('button[aria-label="锁定 Inktrace 信号"]');
 assert.equal(await evaluate(`document.querySelector('button[aria-label="解除信号锁定"]').getAttribute('aria-pressed')`),'true');
 await screenshot('00-signal-locked.png');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
 assert.equal(await evaluate(`document.querySelector('button[aria-label="锁定 Inktrace 信号"]').getAttribute('aria-pressed')`),'false');
 await evaluate(`document.querySelector('button[aria-label="锁定 Inktrace 信号"]').focus()`);
 await evaluate(`window.__signalClicks=[];document.querySelector('button[aria-label="锁定 Inktrace 信号"]').addEventListener('click',e=>window.__signalClicks.push({detail:e.detail,trusted:e.isTrusted}))`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await delay(100);
 const enter=await evaluate(`({locked:!!document.querySelector('button[aria-label="解除信号锁定"]'),clicks:window.__signalClicks,active:document.activeElement.outerHTML.slice(0,300)})`);
 assert.ok(enter.locked,'Native Enter activation locks: '+JSON.stringify(enter));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,text:' ',unmodifiedText:' '});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await delay(100);
 assert.ok(await evaluate(`!!document.querySelector('button[aria-label="锁定 Inktrace 信号"]')`),'Native Space activation releases');
 await evaluate(`document.activeElement.blur()`);
 await click('button[aria-label="暂停动态效果"]');
 const paused=await evaluate(`document.querySelector('canvas').toDataURL()`);await delay(200);
 assert.equal(await evaluate(`document.querySelector('canvas').toDataURL()`),paused,'Pause stops drawing');
 await click('button[aria-label="恢复动态效果"]');
 const frames = await evaluate(`new Promise(res=>{const times=[];let last=performance.now();const tick=now=>{times.push(now-last);last=now;if(times.length===90)res(times);else requestAnimationFrame(tick)};requestAnimationFrame(tick)})`);
 const sorted=frames.slice(1).sort((a,b)=>a-b);
 report.frameTiming={sampleFrames:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],environment:'Headless Chrome, software GPU; not a hardware FPS promise'};
 for(const [index,id] of ['work','about','experiments','contact'].entries()){
   await evaluate(`document.getElementById('${id}').scrollIntoView({behavior:'instant'})`);await delay(450);
   assert.ok(await evaluate(`document.querySelector('[aria-label^="Chapter"]').getAttribute('aria-label').includes('${id.toUpperCase()}')`));
   await screenshot(`0${index+1}-${id}.png`);
   if(id==='work'){
     // Anchor scroll-margin deliberately leaves 30px of the hero visible; move
     // completely past it before asserting IntersectionObserver suspension.
     await evaluate(`scrollBy({top:40,behavior:'instant'})`);await delay(200);
     const offscreen=await evaluate(`document.querySelector('canvas').toDataURL()`);await delay(250);
     assert.ok((await evaluate(`document.querySelector('canvas').toDataURL()`))===offscreen,'Offscreen canvas stops drawing');
   }
 }
 await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(300);
 const height=await evaluate(`document.documentElement.scrollHeight`);
 await screenshot('05-full-scroll-desktop.png',{x:0,y:0,width:1440,height,scale:1});
 for(const [width,height,dpr] of [[390,844,2],[1920,1080,2]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:width<700});
   await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(500);
   const dimensions=await evaluate(`({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,canvasWidth:document.querySelector('canvas').width,cssWidth:document.querySelector('canvas').getBoundingClientRect().width})`);
   assert.ok(dimensions.scrollWidth<=width,'No horizontal overflow');
   assert.ok(dimensions.canvasWidth<=Math.ceil(dimensions.cssWidth*2),'Canvas DPR capped');
   report.checks.push({width,height,dpr,...dimensions});
   await screenshot(width<700?'06-mobile-signal.png':'07-wide-signal.png');
   if(width<700){
     assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('#signal header')).backgroundColor`),'rgba(0, 0, 0, 0)','Mobile identity has a dark contrast backing over the oversized title');
     await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
     const point=await evaluate(`(()=>{const r=document.querySelector('button[aria-label="锁定 Inktrace 信号"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
     await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:2,radiusY:2,force:1,id:1}]});
     await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(300);
     assert.ok(await evaluate(`!!document.querySelector('button[aria-label="解除信号锁定"]')`),'Touch tap locks without hover');
     await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:2,radiusY:2,force:1,id:1}]});
     await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(300);
     assert.ok(await evaluate(`!!document.querySelector('button[aria-label="锁定 Inktrace 信号"]')`),'Second touch tap releases');
     await send('Emulation.setTouchEmulationEnabled',{enabled:false});
     await screenshot('08-full-scroll-mobile.png',{x:0,y:0,width,height:await evaluate('document.documentElement.scrollHeight'),scale:1});
   }
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(300);
 assert.equal(await evaluate(`document.querySelector('[data-testid="portfolio"]').dataset.motion`),'static');
 const reduced=await evaluate(`document.querySelector('canvas').toDataURL()`);await delay(200);assert.equal(await evaluate(`document.querySelector('canvas').toDataURL()`),reduced);
 assert.ok(await evaluate(`!![...document.querySelectorAll('a')].find(a=>a.textContent.includes('查看作品'))`));
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await delay(300);
 assert.equal(await evaluate(`document.querySelector('[data-testid="portfolio"]').dataset.motion`),'running','Live preference changes work in both directions');
 if(process.argv.includes('--record')){
   await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
   await evaluate(`scrollTo({top:0,behavior:'instant'})`);await delay(350);
   const captured=[];let previous=0;
   const onFrame=event=>{const message=JSON.parse(event.data);if(message.method!=='Page.screencastFrame')return;const {data,metadata,sessionId}=message.params;send('Page.screencastFrameAck',{sessionId}).catch(()=>{});const time=metadata.timestamp*1000;if(time-previous>=90){captured.push({data,time});previous=time;}};
   socket.addEventListener('message',onFrame);
   await send('Page.startScreencast',{format:'jpeg',quality:80,maxWidth:960,maxHeight:600,everyNthFrame:2});
   await delay(1200);
   await click('button[aria-label="锁定 Inktrace 信号"]');await delay(900);
   await evaluate(`new Promise(res=>{const start=performance.now();const end=document.documentElement.scrollHeight-innerHeight;const step=now=>{const p=Math.min(1,(now-start)/9000);scrollTo({top:end*p,behavior:'instant'});if(p<1)requestAnimationFrame(step);else res(true)};requestAnimationFrame(step)})`);
   await delay(700);await send('Page.stopScreencast');socket.removeEventListener('message',onFrame);
   assert.ok(captured.length>20,'Real browser scrolling frames captured');
   const baseTime=captured[0].time;
   const webm=await evaluate(`(async()=>{
     const frames=${JSON.stringify(captured.map(f=>({data:f.data,time:f.time-baseTime})))};
     const images=await Promise.all(frames.map(f=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src='data:image/jpeg;base64,'+f.data})));
     const c=document.createElement('canvas');c.width=images[0].width;c.height=images[0].height;
     const ctx=c.getContext('2d');const stream=c.captureStream(12);const chunks=[];
     const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2000000});
     const done=new Promise(res=>recorder.onstop=()=>res(new Blob(chunks,{type:'video/webm'})));
     recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start();
     const start=performance.now();for(let n=0;n<images.length;n++){await new Promise(res=>setTimeout(res,Math.max(0,frames[n].time-(performance.now()-start))));ctx.drawImage(images[n],0,0);}
     await new Promise(res=>setTimeout(res,150));recorder.stop();const blob=await done;stream.getTracks().forEach(t=>t.stop());
     return new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.readAsDataURL(blob)});
   })()`);
   await writeFile(resolve(destination,'09-scroll-preview.webm'),Buffer.from(webm,'base64'));
   report.recording={file:'09-scroll-preview.webm',frames:captured.length,durationMs:captured.at(-1).time-baseTime,source:'Actual CDP viewport frames; no generated UI'};
 }
 report.exceptions=exceptions;assert.equal(exceptions.length,0,'No browser exceptions');
 await writeFile(resolve(destination,'checks.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{socket.close();await fetch(`http://127.0.0.1:9333/json/close/${target.id}`).catch(()=>{});}
