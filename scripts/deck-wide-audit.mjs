import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/visual/deck-wide-study';await mkdir(out,{recursive:true});
const tab=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params);const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method)),120000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));async function wait(expr){for(let i=0;i<250;i++){if(await run(`Boolean(${expr})`))return;await delay(150);}throw Error(expr);}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`${out}/${name}.png`,Buffer.from(r.data,'base64'));}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:3011/design/deck-wide'});await wait(`document.querySelector('[data-wide-study] img')?.complete`);await shot('01-blender-in-page');
 await run(`document.querySelectorAll('button')[1].click()`);await wait(`document.querySelector('canvas')?.dataset.studyProgress==='0.0000'`);
 await run(`document.querySelector('[data-wide-study]').scrollIntoView({block:'center',behavior:'instant'})`);await delay(500);
 await run(`(()=>{const c=document.querySelector('canvas');window.studyChunks=[];window.studyRecorder=new MediaRecorder(c.captureStream(30),{mimeType:'video/webm'});window.studyRecorder.ondataavailable=e=>window.studyChunks.push(e.data);window.studyRecorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>window.studyVideo=reader.result;reader.readAsDataURL(new Blob(window.studyChunks,{type:'video/webm'}));};window.studyRecorder.start();})()`);
 await run(`document.querySelectorAll('button')[0].click()`);await wait(`Number(document.querySelector('canvas').dataset.hingeAngle)>107.9`);await shot('02-real-open');await delay(500);
 await run(`document.querySelectorAll('button')[1].click()`);await wait(`Number(document.querySelector('canvas').dataset.hingeAngle)<.1`);await delay(300);await run('window.studyRecorder.stop()');await wait('window.studyVideo');
 await writeFile(`${out}/mechanism.webm`,Buffer.from((await run('window.studyVideo')).split(',')[1],'base64'));
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await run(`document.querySelectorAll('button')[0].click()`);await wait(`Number(document.querySelector('canvas').dataset.hingeAngle)>107.9`);await shot('03-mobile-open');
 assert.equal(await run('document.documentElement.scrollWidth>innerWidth'),false);assert.equal(await run(`document.querySelectorAll('audio').length`),0);assert.deepEqual(errors,[]);
 const report={errors,openClose:true,mobileOverflow:false,reducedMotion:true,noAudio:true,notHomepage:true};await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(report);
}finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+tab.id);}
