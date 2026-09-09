import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const out=resolve('docs/visual/deck-a-v02');await mkdir(out,{recursive:true});
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&['error','warn'].includes(m.params.type))errors.push(m.params.args.map(a=>a.description??a.value));if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}});
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method)),120000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(expression){for(let i=0;i<160;i++){if(await run(`Boolean(${expression})`))return;await delay(250);}throw Error(expression);}
async function shot(name){const p=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,name+'.png'),Buffer.from(p.data,'base64'));}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://localhost:3011/design/deck'});
  await wait(`document.querySelector('[data-deck-renderer="three"]')`);await delay(1000);await shot('01-closed');
  console.log(await run(`JSON.stringify({renderer:document.querySelector('[data-deck-renderer]').dataset,diagnostics:document.querySelector('canvas').dataset,visibility:getComputedStyle(document.querySelector('canvas')).visibility,dim:document.querySelector('[data-deck-renderer]').getBoundingClientRect()})`));
  console.log(await run(`(()=>{const g=document.querySelector('canvas').getContext('webgl2');return JSON.stringify({lost:g.isContextLost(),error:g.getError(),renderer:g.getParameter(g.RENDERER)})})()`));
  if(!process.argv.includes('--diagnose'))assert.equal(await run(`document.querySelector('[data-deck-renderer]').dataset.deckRenderer`),'three','Prepared model must remain visible after first draw');
  if(process.argv.includes('--diagnose')) {await run(`document.querySelector('[data-device-scene="deck"]').parentElement.style.visibility='visible'`);await shot('diagnostic-forced-visible');}
  const poster=await run(`document.querySelector('[data-device-scene="deck"] canvas').toDataURL('image/png')`);
  if(process.argv.includes('--poster'))await writeFile(resolve('public/portfolio/deck-a-standby-v02.png'),Buffer.from(poster.split(',')[1],'base64'));
  for(const [index,name] of [[1,'02-open'],[2,'03-knob'],[3,'04-glass']]){await run(`document.querySelectorAll('button')[${index}].click()`);await delay(800);await shot(name);}
  if(process.argv.includes('--home')){
    const results=[];
    for(const [width,height,dpr] of [[1440,900,1],[1920,1080,2],[390,844,2]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:width<500});
      await send('Page.navigate',{url:'http://localhost:3011/#about'});
      await wait(`document.querySelector('[data-testid="music-deck"]')`);
      await run(`document.fonts.ready`);
      await run(`document.querySelector('[data-testid="music-deck"]').scrollIntoView({block:'center',behavior:'instant'})`);
      await wait(`document.querySelector('[data-deck-renderer="three"]')`);await delay(1000);
      assert.equal(await run(`document.querySelector('[data-deck-renderer]').dataset.deckRenderer`),'three');
      const metrics=await run(`(()=>{const n=document.querySelector('[data-testid="music-deck"]'),r=n.getBoundingClientRect();return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,deckWidth:r.width,status:n.dataset.status,canvasCount:n.querySelectorAll('canvas').length,posterLoaded:n.querySelector('img[data-device-fallback]').naturalWidth>0,buttons:[...n.querySelectorAll('button')].map(b=>({name:b.getAttribute('aria-label'),height:b.getBoundingClientRect().height}))}})()`);
      assert.equal(metrics.overflow,false);assert.equal(metrics.canvasCount,1);assert.equal(metrics.status,'idle');assert.equal(metrics.posterLoaded,true);
      await shot('home-'+width);results.push(metrics);
    }
    async function click(selector){await run(`document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'})`);await delay(150);const p=await run(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
    await click('[data-testid="music-deck"] button[aria-label="播放音乐"]');
    await wait(`document.querySelector('[data-testid="music-deck"]').dataset.status==='playing'`);await delay(1400);
    await click('[data-testid="music-deck"] button[aria-label="暂停音乐"]');
    await wait(`document.querySelector('[data-testid="music-deck"]').dataset.status==='paused'`);
    await click('[data-testid="music-deck"] button[aria-label="下一首"]');
    await wait(`document.querySelector('[data-testid="music-deck"]').dataset.status==='paused' && document.querySelector('[data-testid="music-deck"]').textContent.includes('Voxel Revolution')`);
    await run(`document.querySelector('[data-device-scene="deck"] canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);
    await wait(`document.querySelector('[data-deck-renderer]').dataset.deckRenderer==='fallback'`);await shot('home-webgl-fallback');
    assert.equal(await run(`document.querySelector('[data-testid="music-deck"] button[aria-label="播放音乐"]').disabled`),false);
    await writeFile(resolve(out,'homepage-checks.json'),JSON.stringify({results,audio:'play -> pause -> next while paused passed',webglFallback:true,errors},null,2));
  }
  console.log(JSON.stringify({errors,url:target.url,out},null,2));
}catch(error){await shot('error');console.log(JSON.stringify({errors,body:await run('document.body?.innerText')},null,2));throw error;}
finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id);}
