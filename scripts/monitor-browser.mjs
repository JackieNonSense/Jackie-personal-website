import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve('docs/visual',process.argv.includes('--v04')?'monitor-v04':process.argv.includes('--v03')?'monitor-v03':'monitor-v02'); await mkdir(output,{recursive:true});
const target = await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0; const pending=new Map(), errors=[], frames=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails); if(m.method==='Page.screencastFrame'){send('Page.screencastFrameAck',{sessionId:m.params.sessionId}).catch(()=>{});frames.push({data:m.params.data,time:m.params.metadata.timestamp*1000});} if(!m.id)return;const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>reject(Error(method)),45000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const root='[data-testid="monitor-entry"]', canvas=root+' canvas';
async function wait(expression){for(let i=0;i<120;i++){if(await run(`Boolean(${expression})`))return;await delay(250);}throw Error('Waiting for '+expression);}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(output,name+'.png'),Buffer.from(r.data,'base64'));}
async function hover(on){const p=on?await run(`(()=>{const r=document.querySelector('${root}').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+110}})()`):{x:20,y:200};await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});}
const report={url:'http://localhost:3011/#experiments',checks:[],date:new Date().toISOString()};
try {
 await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 if(process.argv.includes('--reference')){
  await send('Page.navigate',{url:'http://localhost:3011/terminal'});await wait(`document.querySelector('canvas')`);await delay(3500);await shot('00-terminal-reference');
 }
 await send('Page.navigate',{url:report.url});await wait(`document.querySelector('${root}')`);
 await run(`document.documentElement.style.scrollBehavior='auto';document.querySelector('${root}').scrollIntoView({block:'center',behavior:'instant'})`);
 await wait(`document.querySelector('[data-monitor-renderer="three"]')`);await delay(1000);
 await shot('01-asleep');
 await send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:1440,maxHeight:900,everyNthFrame:2});await delay(400);
 await hover(true);await wait(`Number(document.querySelector('${canvas}').dataset.bootLines)>0`);
 const partial=await run(`Number(document.querySelector('${canvas}').dataset.bootLines)`);
 assert.ok(partial>0&&partial<5,'startup reveals a partial set of lines');await shot('02-booting');
 await wait(`document.querySelector('${canvas}').dataset.bootPhase==='ready'`);await shot('03-ready');await delay(500);
 await hover(false);await delay(650);assert.equal(await run(`document.querySelector('${canvas}').dataset.bootPhase`),'off');await delay(300);
 await send('Page.stopScreencast');report.checks.push('real WebGL screen: black / partial lines / ready / cancelled');
 await hover(true);await delay(180);await hover(false);await delay(650);
 assert.equal(await run(`document.querySelector('${canvas}').dataset.bootLines`),'0');report.checks.push('rapid hover cancels without stale lines');
 await run(`document.querySelector('${root} a').focus()`);await wait(`document.querySelector('${canvas}').dataset.bootPhase==='ready'`);
 await run(`document.activeElement.blur()`);await delay(650);report.checks.push('keyboard focus wakes the physical screen');
 for(const [width,height,dpr] of [[390,844,2],[1920,1080,2]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:width===390});
  await run(`document.querySelector('${root}').scrollIntoView({block:'center',behavior:'instant'})`);await delay(700);
  await hover(true);await delay(1600);await shot('04-'+width);
  if(width===1920 && (process.argv.includes('--v03') || process.argv.includes('--v04'))){
   const clip=await run(`(()=>{const r=document.querySelector('${root} a').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
   const detail=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});
   await writeFile(resolve(output,'08-material-detail.png'),Buffer.from(detail.data,'base64'));
  }
  assert.ok(await run('document.documentElement.scrollWidth<=innerWidth'),'no horizontal overflow');
  report.checks.push(`${width} x ${height}, DPR ${dpr}, no overflow`);await hover(false);
  if(width===390){
   await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   const p=await run(`(()=>{const r=document.querySelector('${root} a').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});
   await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await wait(`document.querySelector('${root}').dataset.awake==='true'`);
   assert.ok(await run(`location.pathname==='/' && document.querySelector('${root}').innerText.includes('进入终端')`));
   report.checks.push('real emulated touch: first tap wakes, explicit terminal entry remains');
   await send('Emulation.setTouchEmulationEnabled',{enabled:false});
   // Reload to reset the intentional touch latch before subsequent pointer tests.
   const loaded=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.removeEventListener('message',listener);reject(Error('Reload timed out'));},30000);
    function listener(e){if(JSON.parse(e.data).method==='Page.loadEventFired'){clearTimeout(timer);ws.removeEventListener('message',listener);resolve();}}
    ws.addEventListener('message',listener);
   });
   await send('Page.reload');await loaded;await wait(`document.querySelector('${root}')`);
   await run(`document.querySelector('${root}').scrollIntoView({block:'center',behavior:'instant'})`);
   await wait(`document.querySelector('[data-monitor-renderer="three"]')`);
  }
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(300);await hover(true);await delay(120);
 assert.equal(await run(`document.querySelector('${canvas}').dataset.bootLines`),'5');report.checks.push('reduced motion: immediate completed text');
 await shot('05-reduced');
 await run(`document.querySelector('${canvas}').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);
 await wait(`document.querySelector('[data-monitor-renderer="fallback"]')`);await shot('06-fallback');
 assert.equal(await run(`document.querySelector('${root} a').getAttribute('href')`),'/terminal');report.checks.push('context loss: static startup + native link survive');
 if(frames.length){
  const selected=frames.filter((f,i)=>i===0||f.time-frames[i-1].time>0);const start=selected[0].time;
  const encoded=await run(`(async()=>{const frames=${JSON.stringify(selected.map(f=>({...f,time:f.time-start})))};const images=await Promise.all(frames.map(f=>new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src='data:image/jpeg;base64,'+f.data})));const c=document.createElement('canvas');c.width=images[0].width;c.height=images[0].height;const ctx=c.getContext('2d'),s=c.captureStream(20),chunks=[],rec=new MediaRecorder(s,{mimeType:'video/webm;codecs=vp8'});rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(res=>rec.onstop=()=>res(new Blob(chunks,{type:'video/webm'})));rec.start();const t=performance.now();for(let i=0;i<images.length;i++){await new Promise(r=>setTimeout(r,Math.max(0,frames[i].time-(performance.now()-t))));ctx.drawImage(images[i],0,0)}rec.stop();const blob=await done;s.getTracks().forEach(t=>t.stop());return new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.readAsDataURL(blob)})})()`);
  await writeFile(resolve(output,'07-wake.webm'),Buffer.from(encoded,'base64'));report.recordingFrames=frames.length;
 }
 report.exceptions=errors;assert.equal(errors.length,0,'No runtime exceptions');await writeFile(resolve(output,'checks.json'),JSON.stringify(report,null,2));console.log(report);
}finally{ws.close();}
