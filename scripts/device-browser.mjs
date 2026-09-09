import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const destination=resolve('docs/visual/front-audio-review');
await mkdir(destination,{recursive:true});
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});
let id=0;const pending=new Map(),exceptions=[],requests=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>reject(Error(method+' timeout')),45000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}))});
const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=expression=>run(`new Promise((resolve,reject)=>{const start=Date.now();const poll=()=>{if(${expression})resolve(true);else if(Date.now()-start>30000)reject('Timed out: '+${JSON.stringify(expression)});else setTimeout(poll,100)};poll()})`);
const point=selector=>run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
async function click(selector){const p=await point(selector);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
async function shot(name,full=false){const clip=full?await run(`({x:0,y:0,width:innerWidth,height:document.documentElement.scrollHeight,scale:1})`):undefined;const r=await send('Page.captureScreenshot',{format:'jpeg',quality:90,captureBeyondViewport:full,...(clip?{clip}:{})});await writeFile(resolve(destination,name+'.jpg'),Buffer.from(r.data,'base64'))}
async function scroll(id){await run(`document.getElementById('${id}').scrollIntoView({behavior:'instant'})`);await delay(800)}
const deck='[data-testid="music-deck"]';
const monitor='[data-testid="monitor-entry"]';
const report={url:'http://localhost:3011/',checkedAt:new Date().toISOString(),checks:[]};
const captured=[];
async function encodeRecording(){
 if(!captured.length)return;
 const start=captured[0].time;
 const data=await run(`(async()=>{
  const frames=${JSON.stringify(captured.map(f=>({...f,time:f.time-start})))};
  const images=await Promise.all(frames.map(f=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src='data:image/jpeg;base64,'+f.data})));
  const canvas=document.createElement('canvas');canvas.width=images[0].width;canvas.height=images[0].height;
  const ctx=canvas.getContext('2d'),stream=canvas.captureStream(12),chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2200000});
  const done=new Promise(res=>recorder.onstop=()=>res(new Blob(chunks,{type:'video/webm'})));
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start();
  const begin=performance.now();for(let n=0;n<images.length;n++){await new Promise(res=>setTimeout(res,Math.max(0,frames[n].time-(performance.now()-begin))));ctx.drawImage(images[n],0,0)}
  await new Promise(res=>setTimeout(res,200));recorder.stop();const blob=await done;stream.getTracks().forEach(t=>t.stop());
  return new Promise(res=>{const reader=new FileReader();reader.onload=()=>res(reader.result.split(',')[1]);reader.readAsDataURL(blob)});
 })()`);
 await writeFile(resolve(destination,'10-device-interactions.webm'),Buffer.from(data,'base64'));
 report.recording={file:'10-device-interactions.webm',frames:captured.length,durationMs:captured.at(-1).time-start,source:'Actual browser viewport frames, silent video; audio playback separately checked via native media and analyser'};
}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await send('Page.navigate',{url:report.url});await waitFor(`document.querySelector('${deck}')`);
 await run('document.fonts.ready');await delay(1200);
 report.checks.push({width:1440,height:900,dpr:1});
 assert.ok(await run(`(()=>{const a=[...document.querySelectorAll('#signal a')].find(a=>a.textContent.includes('FOLLOW THE SIGNAL')).getBoundingClientRect();const b=document.querySelector('[data-testid="control-rack"]').getBoundingClientRect();return a.bottom<=b.top||a.right<=b.left})()`),'Control rack does not cover hero navigation');
 assert.equal(await run(`document.querySelector('audio')===null`),true,'No initial audio element');
 assert.equal(requests.some(u=>/\.mp3/.test(u)),false,'No music download before interaction');
 const rift='[data-testid="rift-canvas"]';
 assert.equal(await run(`document.querySelector('#signal').textContent.includes('INKTRACE')`),false,'No project-name signal');
 const glyphs=await run(`document.querySelector('${rift}').toDataURL()`);await delay(300);
 assert.notEqual(await run(`document.querySelector('${rift}').toDataURL()`),glyphs,'Vertical characters move');
 await shot('00-hero');
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',...(await point('button[aria-label="探索裂隙"]'))});await delay(800);
 const gap=await run(`new DOMMatrix(getComputedStyle(document.querySelector('[data-paper-lip="upper"]')).transform).m42`);
 assert.ok(gap<=-11.9&&gap>=-12.1,'Upper paper moves only 12 CSS px');await shot('00-rift-open');
 await click('button[aria-label="探索裂隙"]');
 assert.equal(await run(`document.querySelector('button[aria-label="探索裂隙"]').getAttribute('aria-pressed')`),'true');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await delay(450);
 assert.equal(await run(`document.querySelector('button[aria-label="探索裂隙"]').getAttribute('aria-pressed')`),'false');
 await run(`document.activeElement.blur()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:10});
 await scroll('about');
 const offscreenGlyphs=await run(`document.querySelector('${rift}').toDataURL()`);await delay(250);
 assert.equal(await run(`document.querySelector('${rift}').toDataURL()`),offscreenGlyphs,'Offscreen rift stops drawing');
 await waitFor(`document.querySelector('[data-device-scene="deck"] canvas')`);await delay(1000);
 await shot('01-about-idle');
 await run(`document.querySelector('${deck} button[aria-label="播放音乐"]').focus()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await waitFor(`document.querySelector('${deck}').dataset.status==='playing'`);
 await delay(1200);await shot('02-about-playing');
 assert.ok(await run(`document.querySelector('audio').currentTime>0`),'Actual decoded audio advances');
 const spectrum=await run(`document.querySelector('${deck} canvas[aria-hidden]').toDataURL()`);await delay(250);
 assert.notEqual(await run(`document.querySelector('${deck} canvas[aria-hidden]').toDataURL()`),spectrum,'Actual spectrum changes');
 const background=await send('Target.createTarget',{url:'about:blank',background:false});
 await send('Target.activateTarget',{targetId:background.targetId});await delay(350);
 const hidden=await run('document.hidden');
 const timeBefore=await run(`document.querySelector('audio').currentTime`);
 const hiddenSpectrum=await run(`document.querySelector('${deck} canvas[aria-hidden]').toDataURL()`);await delay(500);
 assert.ok(await run(`document.querySelector('audio').currentTime>${timeBefore}`),'Audio keeps advancing while another tab is foreground');
 if(hidden)assert.equal(await run(`document.querySelector('${deck} canvas[aria-hidden]').toDataURL()`),hiddenSpectrum,'Hidden tab stops spectrum drawing');
 report.background={actualDocumentHidden:hidden,audioContinued:true};
 await send('Target.closeTarget',{targetId:background.targetId});await send('Page.bringToFront');await delay(300);
 if(process.argv.includes('--record')){
  let previous=0;const onFrame=e=>{const m=JSON.parse(e.data);if(m.method!=='Page.screencastFrame')return;send('Page.screencastFrameAck',{sessionId:m.params.sessionId}).catch(()=>{});const time=m.params.metadata.timestamp*1000;if(time-previous>=75){captured.push({data:m.params.data,time});previous=time}};
  ws.addEventListener('message',onFrame);await send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:1200,maxHeight:750,everyNthFrame:2});
  await delay(900);await click(`${deck} button[aria-label="下一首"]`);await delay(1400);
  await click(`${deck} button[aria-label="暂停音乐"]`);await delay(450);await click(`${deck} button[aria-label="播放音乐"]`);await delay(800);
  await scroll('experiments');await delay(450);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...(await point(`${monitor} a`))});await delay(1100);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:30,y:300});await delay(700);
  await send('Page.stopScreencast');ws.removeEventListener('message',onFrame);
  assert.ok(captured.length>15,'Actual interaction frames captured');
 }
 await scroll('experiments');await delay(1400);await shot('03-monitor-asleep');
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',...(await point(`${monitor} a`))});await delay(450);await shot('04-monitor-awake');
 assert.equal(await run(`document.querySelector('${monitor}').dataset.awake`),'true');
 assert.ok(await run(`document.querySelector('[aria-label="Music transport"]')!==null`),'Mini transport appears offscreen');
 assert.ok(await run(`!document.querySelector('audio').paused`),'Scrolling keeps music');
 if(process.argv.includes('--inspect')){await shot('05-full-desktop',true);console.log('Inspection screenshots saved');}
 else {
  await scroll('about');
  await click(`${deck} button[aria-label="下一首"]`);await delay(320);await shot('06-disc-exchange');
  assert.ok(await run(`document.querySelector('${deck} button[aria-label="下一首"]').disabled`));
  await click(`${deck} button[aria-label="暂停音乐"]`);await delay(1600);
  assert.equal(await run(`document.querySelector('${deck}').dataset.status`),'paused');
  assert.ok(await run(`document.querySelector('audio').paused`),'Switch pause cannot restart');
  await click(`${deck} button[aria-label="播放音乐"]`);await waitFor(`document.querySelector('${deck}').dataset.status==='playing'`);
  await click('button[aria-label="暂停动态效果"]');await delay(250);
  const still=await run(`document.querySelector('${deck} canvas[aria-hidden]').toDataURL()`);await delay(250);
  assert.equal(await run(`document.querySelector('${deck} canvas[aria-hidden]').toDataURL()`),still);
  assert.ok(await run(`!document.querySelector('audio').paused`),'Motion pause does not pause music');
  await click('button[aria-label="恢复动态效果"]');
  const frames=await run(`new Promise(res=>{const values=[];let last=performance.now();const tick=t=>{values.push(t-last);last=t;if(values.length>=60)res(values.slice(1));else requestAnimationFrame(tick)};requestAnimationFrame(tick)})`);
  const timings=frames.sort((a,b)=>a-b);report.frameTiming={frames:timings.length,medianMs:timings[Math.floor(timings.length*.5)],p95Ms:timings[Math.floor(timings.length*.95)],environment:'Headless Chrome software WebGL; observed frame intervals, not a hardware FPS promise'};
  for(const [width,height,dpr] of [[390,844,2],[1920,1080,2]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:width<700});
   await scroll('about');await shot(`07-about-${width}`);
   if(width<700){await run(`document.querySelector('${deck}').scrollIntoView({behavior:'instant',block:'center'})`);await delay(450);await shot('07-mobile-deck');}
   assert.ok(await run(`document.documentElement.scrollWidth<=innerWidth`),'No overflow '+width);
   const sizes=await run(`Array.from(document.querySelectorAll('${deck} button')).map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))`);
   assert.ok(sizes.every(b=>b.w>=44&&b.h>=44),'44px transport targets '+width);
   await scroll('experiments');await shot(`08-monitor-${width}`);
   if(width<700){
    await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});const p=await point(`${monitor} a`);
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,radiusX:2,radiusY:2,force:1,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(400);
    assert.ok(await run(`location.pathname==='/' && [...document.querySelectorAll('${monitor} a')].some(a=>a.textContent==='进入终端')`),'First touch wakes without navigation');
    await send('Emulation.setTouchEmulationEnabled',{enabled:false});
   }
   report.checks.push({width,height,dpr});
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(250);
  assert.equal(await run(`document.querySelector('[data-testid="portfolio"]').dataset.motion`),'static');
  await scroll('about');await click(`${deck} button[aria-label="暂停音乐"]`);await delay(220);
  await run(`window.originalPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Test permission denial','NotAllowedError'))}`);
  await click(`${deck} button[aria-label="播放音乐"]`);await waitFor(`document.querySelector('${deck}').dataset.status==='error'`);
  await run(`HTMLMediaElement.prototype.play=window.originalPlay`);
  await click(`${deck} button[aria-label="重试播放"]`);await waitFor(`document.querySelector('${deck}').dataset.status==='playing'`);
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Network.setBlockedURLs',{urls:['*edm-detection-mode.mp3*','*voxel-revolution.mp3*']});
  await click(`${deck} button[aria-label="下一首"]`);await waitFor(`document.querySelector('${deck}').dataset.status==='error'`);await delay(600);
  assert.ok(await run(`document.querySelector('audio').paused`),'Real blocked audio request stops transport');
  await send('Network.setBlockedURLs',{urls:[]});
  await click(`${deck} button[aria-label="重试播放"]`);await waitFor(`document.querySelector('${deck}').dataset.status==='playing'`);
  // An actual WebGL context-loss exercises the static vector fallback.
  await run(`document.querySelector('[data-device-scene="deck"] canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))`);await delay(200);
  assert.ok(await run(`!document.querySelector('[data-device-scene="deck"]') && document.querySelector('${deck} svg[data-device-fallback]')!==null`),'WebGL failure preserves static surface');
  await shot('09-static-fallback');
  await scroll('experiments');
  await run(`window.savedAudio=document.querySelector('audio')`);
  await click(`${monitor} a`);await waitFor(`location.pathname==='/terminal'`);await delay(500);
  assert.ok(await run(`window.savedAudio.paused && !window.savedAudio.getAttribute('src')`),'Route departure releases audio');
  await send('Page.navigate',{url:report.url});await waitFor(`document.querySelector('${deck}')`);
  assert.ok(await run(`!document.querySelector('audio')`),'Returning does not autoplay');
 }
 report.exceptions=exceptions;assert.equal(exceptions.length,0,'No browser exceptions');
 await encodeRecording();
 await writeFile(resolve(destination,'checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{ws.close();await fetch(`http://127.0.0.1:9333/json/close/${target.id}`).catch(()=>{})}
