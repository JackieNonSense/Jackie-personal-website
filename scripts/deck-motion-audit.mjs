import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=resolve('docs/visual/deck-a-motion-v02');await mkdir(out,{recursive:true});
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}});
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method)),120000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});}
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(expression){for(let i=0;i<200;i++){if(await run(`Boolean(${expression})`))return;await delay(100);}throw Error(expression);}
async function shot(name){const p=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,name+'.png'),Buffer.from(p.data,'base64'));}
async function mouse(type,p,buttons=0){await send('Input.dispatchMouseEvent',{type,...p,button:type==='mouseMoved'?'none':'left',buttons,clickCount:type==='mouseMoved'?0:1});}
async function point(x,y){return run(`(()=>{const r=document.querySelector('[data-device-scene="deck"] canvas').getBoundingClientRect();return {x:r.x+r.width*${x},y:r.y+r.height*${y}}})()`);}
async function clickPoint(p){await mouse('mouseMoved',p);await mouse('mousePressed',p,1);await delay(100);await mouse('mouseReleased',p);}
async function button(name){const p=await run(`(()=>{const b=[...document.querySelectorAll('button[aria-label="${name}"]')].find(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await clickPoint(p);}
const status=`document.querySelector('[data-testid="music-deck"]').dataset.status`;
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.bringToFront');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:3011/?deck-audit=desktop#about'});await wait(`document.querySelector('[data-testid="music-deck"]')`);
 await wait(`${status}==='idle'`);
 await run(`document.fonts.ready`);await run(`document.querySelector('[data-testid="music-deck"]').scrollIntoView({block:'center',behavior:'instant'})`);
 await wait(`document.querySelector('[data-deck-renderer="three"]')`);await delay(500);
 const knob=await point(.5,.713),play=await point(.276,.611),next=await point(.276,.68),display=await point(.724,.611);
 await mouse('mouseMoved',play);await mouse('mousePressed',play,1);await mouse('mouseMoved',{x:play.x-200,y:play.y},1);await mouse('mouseReleased',{x:play.x-200,y:play.y});
 assert.equal(await run(status),'idle','releasing outside a captured key must not activate it');
 await delay(250);
 await mouse('mouseMoved',knob);await mouse('mousePressed',knob,1);
 for(let i=1;i<=15;i++){await mouse('mouseMoved',{x:knob.x+i*5,y:knob.y},1);await delay(15);}
 await mouse('mouseReleased',{x:knob.x+75,y:knob.y});
 assert.ok(await run(`Number(document.querySelector('input[aria-label="音乐音量"]').value)>=74`),'actual model rotary drag changes gain');
 await clickPoint(knob);assert.equal(await run(`document.querySelector('button[aria-label="取消静音"]').getAttribute('aria-pressed')`),'true');await clickPoint(knob);
 await clickPoint(display);assert.equal(await run(`document.querySelector('button[aria-label="切换显示模式"]').getAttribute('aria-pressed')`),'true');await clickPoint(display);
 await clickPoint(play);await wait(`${status}==='playing'`);await wait(`Number(document.querySelector('[data-device-scene="deck"] canvas').dataset.spectrumEnergy)>2`);await shot('01-real-playback');
 await run(`(()=>{const c=document.querySelector('[data-device-scene="deck"] canvas');window.deckMotionFrames=[];window.deckAuditRecording=true;const start=performance.now();const poll=()=>{if(!window.deckAuditRecording)return;window.deckMotionFrames.push({ms:performance.now()-start,status:document.querySelector('[data-testid="music-deck"]').dataset.status,angle:Number(c.dataset.faceAngle),travel:Number(c.dataset.discTravel),energy:Number(c.dataset.spectrumEnergy),audioPaused:document.querySelector('audio')?.paused});requestAnimationFrame(poll);};poll();const chunks=[];window.deckRecorder=new MediaRecorder(c.captureStream(30),{mimeType:'video/webm'});window.deckRecorder.ondataavailable=e=>chunks.push(e.data);window.deckRecorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>window.deckVideo=reader.result;reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};window.deckRecorder.start();})()`);
 await clickPoint(next);await delay(470);await shot('02-face-open');await button('暂停音乐');
 await wait(`${status}==='paused'`);await delay(500);assert.equal(await run(`document.querySelector('audio').paused`),true);
 assert.equal(await run(`Number(document.querySelector('[data-device-scene="deck"] canvas').dataset.faceAngle)`),0);
 await button('播放音乐');await wait(`${status}==='playing'`);await delay(500);await clickPoint(next);await wait(`${status}==='playing'`);await delay(500);
 await run(`window.deckAuditRecording=false;window.deckRecorder.stop()`);await wait('window.deckVideo');
 const video=await run('window.deckVideo');await writeFile(resolve(out,'exchange.webm'),Buffer.from(video.split(',')[1],'base64'));
 const frames=await run('window.deckMotionFrames');await writeFile(resolve(out,'timing-debug.json'),JSON.stringify({frames,visibility:await run('document.visibilityState')},null,2));assert.ok(frames.some(f=>f.angle>25));assert.ok(frames.some(f=>f.travel>.7));
 assert.ok(frames.filter(f=>f.angle>1).every(f=>f.audioPaused),'new audio never plays through an open face');
 await button('暂停音乐');await wait(`${status}==='paused'`);await shot('03-seated');
 await button('暂停动态效果');await clickPoint(next);await delay(550);assert.equal(await run(`Number(document.querySelector('[data-device-scene="deck"] canvas').dataset.faceAngle)`),0);await wait(`${status}==='paused'`);
 await button('播放音乐');await wait(`${status}==='playing'`);
 await run(`document.querySelector('#contact').scrollIntoView({behavior:'instant'})`);await delay(400);
 assert.equal(await run(`document.querySelector('audio').paused`),false,'scrolling away must keep music playing');
 assert.ok(await run(`Boolean(document.querySelector('[aria-label="Music transport"]'))`),'offscreen transport remains accessible');
 await button('暂停音乐');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await send('Page.navigate',{url:'http://localhost:3011/#about'});await wait(`document.querySelector('[data-testid="music-deck"]')`);
 await wait(`${status}==='idle'`);
 await run(`document.fonts.ready`);await run(`document.querySelector('[data-testid="music-deck"]').scrollIntoView({block:'center',behavior:'instant'})`);await wait(`document.querySelector('[data-deck-renderer="three"]')`);await delay(500);
 const touchKnob=await point(.5,.713);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touchKnob,id:1}]});
 for(let i=1;i<=6;i++)await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchKnob.x+i*5,y:touchKnob.y,id:1}]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.ok(await run(`Number(document.querySelector('input[aria-label="音乐音量"]').value)>=44`),'touch drag changes rotary volume');
 await run(`document.querySelector('input[aria-label="音乐音量"]').focus()`);
 const before=await run(`Number(document.querySelector('input[aria-label="音乐音量"]').value)`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 assert.equal(await run(`Number(document.querySelector('input[aria-label="音乐音量"]').value)`),before+1);
 await button('下一首');await delay(550);assert.equal(await run(`Number(document.querySelector('[data-device-scene="deck"] canvas').dataset.faceAngle)`),0);await wait(`${status}==='paused'`);await shot('04-mobile-reduced-motion');
 assert.equal(await run('document.documentElement.scrollWidth>innerWidth'),false);
 await writeFile(resolve(out,'report.json'),JSON.stringify({frames,errors,rotary:true,display:true,realSpectrum:true,pauseDuringExchange:true,motionPause:true,releaseOutside:true,offscreenAudio:true,touchRotary:true,keyboardVolume:true,reducedMotion:true},null,2));
 console.log(JSON.stringify({out,errors,frames:frames.length,rotary:true,display:true,pauseDuringExchange:true,motionPause:true}));
}catch(error){await shot('error');console.log(JSON.stringify({errors,body:await run('document.body?.innerText')},null,2));throw error;}
finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id);}
