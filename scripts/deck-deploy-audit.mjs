import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/visual/deck-edgy';await mkdir(out,{recursive:true});
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const requests=new Map(),errors=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data),p=requests.get(m.id);if(p){requests.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method)),60000);requests.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(expression){for(let i=0;i<160;i++){if(await run(expression))return;await delay(250);}throw Error('Timed out: '+expression);}
async function click(label){const p=await run(`(()=>{const r=document.querySelector('[data-testid="music-deck"] button[aria-label="${label}"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
const stats=()=>run(`(()=>{const c=document.querySelector('[data-mechanism="deploy"] canvas'),r=c.getBoundingClientRect(),d=document.querySelector('[data-testid="music-deck"]');return {power:d.dataset.power,status:d.dataset.status,pose:c.dataset.deployment,lit:c.dataset.screenLit,energy:c.dataset.spectrumEnergy,css:[r.width,r.height],buffer:[c.width,c.height],overflow:document.documentElement.scrollWidth>innerWidth}})()`);
async function shot(name){const s=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(out+'/'+name+'.png',Buffer.from(s.data,'base64'));}
async function poster(name){
  await run(`(()=>{const s=document.createElement('style');s.id='poster-capture';s.textContent='html,body{background:transparent!important}body *{visibility:hidden!important} [data-mechanism="deploy"] canvas{visibility:visible!important}';document.head.append(s);})()`);
  await send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
  const clip=await run(`(()=>{const r=document.querySelector('[data-mechanism="deploy"] canvas').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
  const s=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:false});await writeFile('public/portfolio/'+name+'.png',Buffer.from(s.data,'base64'));
  await run(`document.getElementById('poster-capture').remove()`);await send('Emulation.setDefaultBackgroundColorOverride');
}
const results=[];
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:2,mobile:false});
 await send('Page.navigate',{url:'http://localhost:3011/#about'});
 await until(`Boolean(document.querySelector('[data-testid="music-deck"]'))`);await run(`document.fonts.ready`);
 await run(`document.querySelector('[data-testid="music-deck"]').scrollIntoView({block:'center',behavior:'instant'})`);
 await until(`document.querySelector('[data-deck-renderer]')?.dataset.deckRenderer==='three'`);await delay(700);
 results.push({step:'standby',...await stats()});await shot('01-standby');await poster('deploy-standby-v03');
 await run(`(()=>{const c=document.querySelector('[data-mechanism="deploy"] canvas');window.deckChunks=[];window.deckRecorder=new MediaRecorder(c.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:7000000});window.deckRecorder.ondataavailable=e=>window.deckChunks.push(e.data);window.deckRecorder.start();})()`);
 await click('开启音乐台');await delay(500);results.push({step:'extracting',...await stats()});await shot('02-extracting');await delay(900);await shot('03-rising');await delay(2000);
 results.push({step:'powered',...await stats()});await shot('04-playing');await poster('deploy-powered-v03');
 const cadence=await run(`new Promise(resolve=>{const deltas=[];let last;const frame=t=>{if(last!==undefined)deltas.push(t-last);last=t;if(deltas.length===90){const sorted=deltas.slice().sort((a,b)=>a-b);resolve({samples:deltas.length,medianMs:sorted[45],p95Ms:sorted[85],over50ms:deltas.filter(v=>v>50).length,context:'headless Chromium, local dev server'});}else requestAnimationFrame(frame);};requestAnimationFrame(frame);})`);results.push({step:'browser-frame-cadence',...cadence});
 await click('下一首');await click('下一首');await delay(240);await shot('06-track-out');await delay(510);await shot('07-track-in');await delay(750);
 results.push({step:'playing-exchange',...await stats()});assert.equal((await stats()).pose,'1.000');assert.equal((await stats()).status,'playing');
 await click('静音音乐');assert.equal(await run(`document.querySelector('[data-model-key="MuteKey"]').getAttribute('aria-pressed')`),'true');await click('取消静音');
 await click('切换显示模式');assert.equal(await run(`document.querySelector('[data-model-key="DisplayKey"]').getAttribute('aria-pressed')`),'true');await shot('display-mode');await click('切换显示模式');
 await click('暂停音乐');await delay(500);const paused=await stats();results.push({step:'paused-screen-stays-out',...paused});assert.equal(paused.pose,'1.000');assert.equal(Number(paused.energy),0,'paused spectrum must not freeze at a nonzero audio level');
 await click('下一首');await delay(1400);results.push({step:'next-while-paused',...await stats()});
 await click('关闭音乐台');await delay(600);await shot('05-retracting');await delay(1500);results.push({step:'off',...await stats()});
 const recording=await run(`new Promise(resolve=>{window.deckRecorder.onstop=()=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(window.deckChunks,{type:'video/webm'}));};window.deckRecorder.stop();})`);await writeFile(out+'/power-cycle.webm',Buffer.from(recording,'base64'));
 for(const [width,height,mobile] of [[390,844,true],[1920,1080,false]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile});await run(`document.querySelector('[data-testid="music-deck"]').scrollIntoView({block:'center',behavior:'instant'})`);await delay(500);await click('播放音乐');await delay(2300);results.push({step:'viewport-'+width,...await stats()});
  const observed=await run(`new Promise(resolve=>{const d=document.querySelector('[data-testid="music-deck"]'),o=new IntersectionObserver(([e])=>{o.disconnect();resolve({intersects:e.isIntersecting,ratio:e.intersectionRatio,rect:e.boundingClientRect.toJSON(),hidden:document.hidden,buttons:Array.from(d.querySelectorAll('button')).map(b=>({label:b.getAttribute('aria-label'),font:getComputedStyle(b).font,align:getComputedStyle(b).alignItems,translate:getComputedStyle(b).translate}))})});o.observe(d);})`);console.log(JSON.stringify({step:'resize-check',width,observed,state:await stats()}));assert.equal((await stats()).pose,'1.000','visible screen must deploy after viewport resize');
  const targets=await run(`(()=>{const stage=document.querySelector('[data-deck-renderer]').getBoundingClientRect();return Array.from(document.querySelectorAll('[data-deck-controls] button,[data-deck-controls] input')).map(n=>{const r=n.getBoundingClientRect();return{label:n.getAttribute('aria-label'),w:r.width,h:r.height,inside:r.left>=stage.left&&r.right<=stage.right&&r.top>=stage.top&&r.bottom<=stage.bottom};});})()`);for(const t of targets){assert.ok(t.w>=44&&t.h>=44,t.label+' hit area');assert.ok(t.inside,t.label+' must be on the model');}results.push({step:'integrated-targets-'+width,targets});
  await shot('viewport-'+width);await click('关闭音乐台');await delay(1900);
 }
 await run(`document.querySelector('[data-testid="music-deck"] button[aria-label="播放音乐"]').focus()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await delay(2000);
 results.push({step:'keyboard-play',...await stats()});assert.equal((await stats()).power,'on');
 await run(`document.querySelector('[aria-label="音乐音量"]').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 const volume=await run(`Number(document.querySelector('[aria-label="音乐音量"]').value)`);assert.equal(volume,26);results.push({step:'keyboard-volume',volume});
 const fader=await run(`(()=>{const r=document.querySelector('[aria-label="音乐音量"]').getBoundingClientRect(),w=document.querySelector('[data-deck-renderer]').getBoundingClientRect().width*.05;return{x:r.x+w/2+.26*(r.width-w),y:r.y+r.height/2}})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...fader});await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:fader.x+50,y:fader.y});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:fader.x+50,y:fader.y});await delay(100);
 const dragged=await run(`Number(document.querySelector('[aria-label="音乐音量"]').value)`);assert.ok(dragged>volume+15,'3D linear fader must drag horizontally');results.push({step:'physical-fader',before:volume,after:dragged});await click('关闭音乐台');await delay(1900);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true});await run(`document.querySelector('[data-testid="music-deck"]').scrollIntoView({block:'center',behavior:'instant'})`);await delay(500);
 const touch=await run(`(()=>{const r=document.querySelector('[data-testid="music-deck"] button[aria-label="播放音乐"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(2000);results.push({step:'touch-play',...await stats()});assert.equal((await stats()).power,'on');await click('关闭音乐台');await delay(1900);
 await send('Emulation.setTouchEmulationEnabled',{enabled:false});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await click('播放音乐');await delay(400);results.push({step:'reduced-motion',...await stats()});await click('关闭音乐台');
 await run(`document.querySelector('[data-mechanism="deploy"] canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);await delay(400);results.push({step:'webgl-fallback',renderer:await run(`document.querySelector('[data-deck-renderer]').dataset.deckRenderer`)});await shot('fallback');
 await click('开启音乐台');assert.equal((await stats()).power,'on');await click('静音音乐');assert.equal(await run(`document.querySelector('[data-model-key="MuteKey"]').getAttribute('aria-pressed')`),'true');await click('暂停音乐');await click('下一首');await delay(1300);assert.equal(await run(`Boolean(document.querySelector('[data-deck-fallback-display]'))`),true);await shot('fallback-live-screen');await click('关闭音乐台');results.push({step:'fallback-controls',passed:true});
 await writeFile(out+'/checks.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id).catch(()=>{});}
