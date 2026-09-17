import {browser} from './refresh-browser.mjs';
import assert from 'node:assert/strict';
const b=await browser();try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await b.send('Page.navigate',{url:'http://localhost:3011/'});await b.until(`document.querySelector('[data-testid="rift-canvas"]')?.dataset.opening!==undefined`);
 await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:400,y:500});await b.delay(500);
 const follow=await b.run(`new Promise(resolve=>{const e=document.querySelector('[aria-label="探索裂隙"]'),timer=setInterval(()=>e.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:1100,clientY:500,pointerType:'mouse'})),4);setTimeout(()=>{clearInterval(timer);resolve(Number(document.querySelector('[data-testid="rift-canvas"]').dataset.center));},500)})`);
 console.log({follow});
 const paper=await b.run(`(()=>{const f=document.querySelector('[data-testid="inktrace-exhibit"]'),r=f.getBoundingClientRect(),buttons=f.querySelectorAll('button'),end=buttons[buttons.length-1].getBoundingClientRect().bottom;return{noteBottom:(end-r.top)/r.height};})()`);
 console.log(paper);assert.ok(follow>.7,'continuous pointer events must not restart and starve RAF');assert.ok(paper.noteBottom<.86,'annotations must stay on the paper, above its sloping torn bottom');
}finally{b.close();}
