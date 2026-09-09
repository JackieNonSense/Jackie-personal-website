// Read-only browser diagnosis; does not alter application files or persisted browser state.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const v04=process.argv.includes('--v04');
const out=resolve('docs/visual',v04?'monitor-v04-load':'monitor-load-audit');await mkdir(out,{recursive:true});
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),exceptions=[],frames=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);if(m.method==='Page.screencastFrame'){frames.push(m.params);send('Page.screencastFrameAck',{sessionId:m.params.sessionId}).catch(()=>{});}if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}});
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method)),45000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(expression){for(let i=0;i<160;i++){if(await run(`Boolean(${expression})`))return;await delay(250);}throw Error(expression);}
const root='[data-testid="monitor-entry"]';
async function shot(name){const clip=await run(`(()=>{const r=document.querySelector('${root}').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);const p=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});await writeFile(resolve(out,name+'.png'),Buffer.from(p.data,'base64'));}
const instrument=`(()=>{
 window.monitorAudit=[];window.monitorPixels=[];let old='',lastPixel='',frames=0;
 for(const method of ['drawElements','drawArrays']){
 const original=WebGL2RenderingContext.prototype[method];
 WebGL2RenderingContext.prototype[method]=function(...args){
  const result=original.apply(this,args);
  if(this.canvas.closest('[data-device-scene="monitor"]'))queueMicrotask(()=>{
   if(window.monitorExportRequested && this.canvas.dataset.bootPhase==='off'){
    window.monitorPoster=this.canvas.toDataURL('image/png');window.monitorExportRequested=false;
   }
  });
  if(this.canvas.closest('[data-device-scene="monitor"]') && this.getParameter(this.FRAMEBUFFER_BINDING)===null){
   const p=new Uint8Array(4);this.readPixels(Math.floor(this.drawingBufferWidth*.09),Math.floor(this.drawingBufferHeight*.52),1,1,this.RGBA,this.UNSIGNED_BYTE,p);
   const rgb=Array.from(p).join(',');if(rgb!==lastPixel&&p[3]>0){lastPixel=rgb;const program=this.getParameter(this.CURRENT_PROGRAM);const env=program&&this.getUniformLocation(program,'envMap');if(window.monitorPixels.length<400)window.monitorPixels.push({t:performance.now(),rgb,hasEnvironmentSampler:!!env});}
  }return result;
 };}
 function inspect(){
  const root=document.querySelector('${root}'),surface=root?.querySelector('[data-monitor-renderer]'),fallback=root?.querySelector('[data-device-fallback]')?.parentElement,canvas=root?.querySelector('canvas');
  const state={count:document.querySelectorAll('${root}').length,renderer:surface?.dataset.monitorRenderer,hidden:fallback?.hidden,display:fallback&&getComputedStyle(fallback).display,canvas:!!canvas,canvasVisibility:canvas&&getComputedStyle(canvas).visibility,awake:root?.dataset.awake,phase:canvas?.dataset.bootPhase,lines:canvas?.dataset.bootLines,width:root?.getBoundingClientRect().width,fonts:document.fonts.status};
  const key=JSON.stringify(state);if(key!==old){old=key;window.monitorAudit.push({t:performance.now(),...state});}
  if(frames++<2400)requestAnimationFrame(inspect);
 }requestAnimationFrame(inspect);
})()`;
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:2,mobile:false});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:instrument});
 await send('Network.setBlockedURLs',{urls:['*.js']});
 await send('Page.navigate',{url:'http://localhost:3011/#experiments'});await wait(`document.querySelector('${root}')`);
 await run(`document.querySelector('${root}').scrollIntoView({block:'center',behavior:'instant'})`);await delay(500);await shot('01-static-placeholder');
 await send('Network.setBlockedURLs',{urls:[]});
 await send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1440,maxHeight:900,everyNthFrame:1});
 await send('Page.navigate',{url:'http://localhost:3011/?monitor-audit=load#experiments'});await wait(`document.querySelector('${root}')`);
 await run(`document.querySelector('${root}').scrollIntoView({block:'center',behavior:'instant'})`);
 await wait(`document.querySelector('[data-monitor-renderer="three"]')`);await delay(500);await shot('02-three-off');
 await delay(1500);await shot('03-three-settled');
 const cold=await run('({states:monitorAudit,pixels:monitorPixels})');
 await run(`document.documentElement.style.scrollBehavior='auto';document.querySelector('${root}').scrollIntoView({block:'center',behavior:'instant'})`);await delay(300);
 const point=await run(`(()=>{const r=document.querySelector('${root}').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+110}})()`);
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await wait(`document.querySelector('${root} canvas').dataset.bootPhase==='ready'`);await shot('04-three-awake');
 const awake=await run('({states:monitorAudit,pixels:monitorPixels})');
 await send('Page.stopScreencast');
 for(let i=0;i<frames.length;i++)await writeFile(resolve(out,'frame-'+String(i).padStart(3,'0')+'.jpg'),Buffer.from(frames[i].data,'base64'));
 const count=await run(`({roots:document.querySelectorAll('${root}').length,scenes:document.querySelectorAll('[data-device-scene="monitor"]').length,fallbackDisplay:getComputedStyle(document.querySelector('[data-device-fallback="monitor"]').parentElement).display})`);
 if(v04){
  const colors=cold.pixels.map(p=>p.rgb.split(',').map(Number));
  assert.ok(colors.length>0);
  assert.ok(colors.every(c=>c[0]<160 && Math.abs(c[0]-colors[0][0])<=3),'No pale-shell flash from first draw through settled lighting');
  assert.ok(cold.states.filter(s=>s.canvas && s.renderer==='fallback').every(s=>s.canvasVisibility==='hidden'),'3D is hidden until its first complete frame');
  if(process.argv.includes('--export-poster')){
   await run('window.monitorExportRequested=true');
   await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:20,y:200});
   await wait('window.monitorPoster');
   const data=await run('window.monitorPoster');
   await writeFile(resolve('public/portfolio/monitor-standby-v04.png'),Buffer.from(data.split(',')[1],'base64'));
  }
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify({count,cold,awake,exceptions,frames:frames.map((f,i)=>({file:'frame-'+String(i).padStart(3,'0')+'.jpg',timestamp:f.metadata.timestamp}))},null,2));console.log(JSON.stringify({count,cold,awake,exceptions},null,2));
}finally{ws.close();}
