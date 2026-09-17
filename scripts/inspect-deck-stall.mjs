import {browser} from './refresh-browser.mjs';
const list=await fetch('http://127.0.0.1:9333/json/list').then(r=>r.json());
const t=list.find(t=>t.url==='http://localhost:3011/#about');
const b=await browser(t.id);try{
 console.log(await b.run(`({hidden:document.hidden,text:document.querySelector('[data-testid="music-deck"]').innerText,canvas:{...document.querySelector('[data-mechanism="deploy"] canvas').dataset}})`));
 await b.shot('.cache/stalled-deck.png');
}finally{b.close();}
