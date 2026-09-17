import {browser} from './refresh-browser.mjs';
const b=await browser();try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:2,mobile:false});
 await b.send('Page.navigate',{url:'https://inktrace.app/'});await b.until(`document.body.innerText.includes("See your story's DNA")`);await b.run('document.fonts.ready');
 await b.run(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('View Demo')).click()`);await b.delay(3500);
 await b.run(`(()=>{const e=Array.from(document.querySelectorAll('*')).find(e=>e.textContent==='Mind Map — My Novel');e.parentElement.scrollIntoView({block:'center',behavior:'instant'});})()`);await b.delay(2500);
 const clip=await b.run(`(()=>{const e=Array.from(document.querySelectorAll('*')).find(e=>e.textContent==='Mind Map — My Novel').parentElement;const r=e.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()`);
 await b.shot('public/portfolio/inktrace-public-mindmap-v01.png',clip);
 console.log({source:'https://www.inktrace.app/',kind:'Public landing-page mind-map demo, not a private project or full editor screenshot',clip});
}finally{b.close();}
