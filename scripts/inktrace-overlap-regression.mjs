import { browser } from './refresh-browser.mjs';
import assert from 'node:assert/strict';
const b=await browser();
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace'});
 await b.until(`!!document.querySelector('button[aria-label="Why I built it"]')`);
 await b.run('document.fonts.ready'); await b.delay(300);
 await b.run(`document.querySelector('button[aria-label="Why I built it"]').click()`); await b.delay(700);
 const overlap=await b.run(`document.querySelector('article[aria-label]').getBoundingClientRect().bottom-document.querySelector('[role=region]').getBoundingClientRect().top`);
 assert.ok(overlap>=60,`Insert must originate under the main sheet, not across a black gap. Overlap ${overlap.toFixed(1)}px < 60px`);
 console.log({overlap});
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 const point=await b.run(`(()=>{const e=document.querySelector('button[aria-label="Inside the workspace"]');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point}); await b.delay(250);
 const right=await b.run(`document.querySelector('button[aria-label="Inside the workspace"]').getBoundingClientRect().right`);
 assert.ok(right<=390,`Even a hovered tab must stay inside the viewport: ${right}`);
 console.log({right});
}finally{await b.close();}
