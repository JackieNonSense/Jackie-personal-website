import {browser} from './refresh-browser.mjs';
const b=await browser();
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 await b.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace'});
 await b.until(`!!document.querySelector('button[aria-label="Why I built it"]')`);
 await b.delay(1000);
 const pos=await b.run(`(()=>{const e=document.querySelector('button[aria-label="Why I built it"]');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await b.delay(300);
 console.log(await b.run(`({pos:${JSON.stringify(pos)},scroll:scrollY,hit:document.elementFromPoint(${pos.x},${pos.y})?.outerHTML,fonts:document.fonts.status,main:document.querySelector('main').dataset})`));
 await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...pos,radiusX:2,radiusY:2}]});
 await b.delay(80);
 await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await b.delay(800);
 console.log(await b.run(`({state:document.querySelector('main').dataset,focus:document.activeElement?.outerHTML})`));
}finally{await b.close();}
