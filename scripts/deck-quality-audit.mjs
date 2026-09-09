// Read-only page inspection: no changes to the running application or model.
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/visual/deck-quality-diagnosis';await mkdir(out,{recursive:true});
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const requests=new Map();
ws.addEventListener('message',event=>{const m=JSON.parse(event.data),p=requests.get(m.id);if(p){requests.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method)),90000);requests.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');
 for(const [route,dpr] of [['/#about',1],['/#about',2],['/design/deck',1],['/design/deck',2]]){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:dpr,mobile:false});
  await send('Page.navigate',{url:'http://localhost:3011'+route});
  for(let i=0;i<180;i++){if(await run(`Boolean(document.querySelector('[data-deck-renderer]'))`))break;await delay(200);}
  await run(`document.fonts.ready`);
  await run(`document.querySelector('[data-deck-renderer]').scrollIntoView({block:'center',behavior:'instant'})`);
  for(let i=0;i<180;i++){if(await run(`document.querySelector('[data-deck-renderer]')?.dataset.deckRenderer==='three'`))break;await delay(200);}
  await delay(600);
  const data=await run(`(()=>{const c=document.querySelector('[data-device-scene="deck"] canvas'),r=c.getBoundingClientRect(),g=c.getContext('webgl2'),chain=[];let n=c;while(n){const s=getComputedStyle(n);chain.push({tag:n.tagName,filter:s.filter,transform:s.transform,imageRendering:s.imageRendering});n=n.parentElement;}return {url:location.href,dpr:devicePixelRatio,canvas:[c.width,c.height],css:[r.width,r.height],drawingBuffer:[g.drawingBufferWidth,g.drawingBufferHeight],samples:g.getParameter(g.SAMPLES),antialias:g.getContextAttributes().antialias,renderer:document.querySelector('[data-deck-renderer]').dataset.deckRenderer,chain}})()`);
  results.push(data);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(`${out}/${route.includes('design')?'review':'home'}-dpr${dpr}.png`,Buffer.from(shot.data,'base64'));
 }
 await writeFile(`${out}/metrics.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id);}
