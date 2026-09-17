import {browser} from './refresh-browser.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const b=await browser(),results=[],out='docs/visual/undercurrent-refresh';
const status=()=>b.run(`(()=>{const d=document.querySelector('[data-testid="music-deck"]'),c=d.querySelector('[data-mechanism] canvas');return{status:d.dataset.status,power:d.dataset.power,pose:c?.dataset.deployment,renderer:d.querySelector('[data-deck-renderer]').dataset.deckRenderer,title:d.innerText}})()`);
const click=async label=>{const r=await b.run(`(()=>{const r=document.querySelector('[data-testid="music-deck"] button[aria-label="${label}"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await b.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});};
const record=async step=>{const data=await status();results.push({step,...data});console.log(step,data.status,data.power,data.pose);};
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:2,mobile:false});await b.send('Page.navigate',{url:'http://localhost:3011/#about'});
 await b.until(`!!document.querySelector('[data-testid="music-deck"]')`);await b.run(`document.querySelector('[data-testid="music-deck"]').scrollIntoView({block:'center',behavior:'instant'})`);await b.until(`document.querySelector('[data-deck-renderer]')?.dataset.deckRenderer==='three'`);await record('standby');
 await click('开启音乐台');await b.until(`document.querySelector('[data-testid="music-deck"]').dataset.status==='playing'&&document.querySelector('[data-mechanism] canvas').dataset.deployment==='1.000'`);await record('play');await b.shot(out+'/deck-playing.png');
 await click('下一首');await click('下一首');await b.until(`document.querySelector('[data-testid="music-deck"]').dataset.status==='playing'&&document.querySelector('[data-testid="music-deck"]').innerText.includes('Voxel Revolution')`);await record('next');
 await click('静音音乐');assert.equal(await b.run(`document.querySelector('[data-model-key="MuteKey"]').getAttribute('aria-pressed')`),'true');await click('取消静音');await click('切换显示模式');await record('mute-and-display');
 await click('下一首');await click('暂停音乐');await b.until(`document.querySelector('[data-testid="music-deck"]').dataset.status==='paused'`);assert.equal((await status()).pose,'1.000');await record('pause-during-exchange');
 await click('下一首');await b.until(`document.querySelector('[data-testid="music-deck"]').dataset.status==='paused'`);await record('paused-next');
 await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await b.run(`document.querySelector('[aria-label="音乐音量"]').focus()`);await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 const focus=await b.run(`(()=>{const e=document.querySelector('[aria-label="音乐音量"]');return{visible:e.matches(':focus-visible'),outline:getComputedStyle(e.parentElement).outlineStyle,rail:getComputedStyle(e.parentElement,'::after').borderBottomWidth,value:e.value};})()`);assert.equal(focus.rail,'1px');assert.equal(focus.outline,'none');results.push({step:'keyboard-volume',...focus});await b.shot(out+'/deck-keyboard.png');
 await click('关闭音乐台');await b.until(`document.querySelector('[data-mechanism] canvas').dataset.deployment==='0.000'`);await record('off');
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await click('播放音乐');await b.until(`document.querySelector('[data-mechanism] canvas').dataset.deployment==='1.000'`);await record('reduced');
 await b.run(`document.querySelector('[data-mechanism] canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);await b.until(`document.querySelector('[data-deck-renderer]').dataset.deckRenderer==='fallback'`);await click('暂停音乐');await click('下一首');await b.until(`document.querySelector('[data-testid="music-deck"]').dataset.status==='paused'`);await record('fallback');await b.shot(out+'/deck-fallback.png');
 await click('关闭音乐台');assert.equal(b.errors.length,0);await writeFile(out+'/transport-checks.json',JSON.stringify({results,errors:b.errors},null,2));
}catch(e){console.error(e);throw e;}finally{await b.close();}
