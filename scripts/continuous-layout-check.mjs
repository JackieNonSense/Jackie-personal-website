import assert from 'node:assert/strict';
const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(m.error); else p.resolve(m.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id:n, method, params })); });
const read = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true }); if(r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
try {
 await send('Page.enable');
 await send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] });
 await send('Page.navigate', { url:'http://localhost:3011/' });
 await read(`new Promise(r=>{const poll=()=>document.querySelector('#work figure')?r(true):setTimeout(poll,100);poll()})`);
 await read('document.fonts.ready.then(()=>true)');
 for (const width of [390, 768, 1440, 1920]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height:900, deviceScaleFactor:1, mobile:false });
  await new Promise(r=>setTimeout(r,300));
  const result = await read(`(()=>{
   const title=document.querySelector('#work h2'), range=document.createRange();range.selectNodeContents(title);
   const a=range.getBoundingClientRect(), b=document.querySelector('#work figure').getBoundingClientRect();
   const headings=[...document.querySelectorAll('h2')].map(h=>{const r=document.createRange();r.selectNodeContents(h);const b=r.getBoundingClientRect();return {text:h.textContent,left:b.left,right:b.right,maskRight:h.getBoundingClientRect().right}});
   return {titleRight:a.right,paperLeft:b.left,titleBottom:a.bottom,paperTop:b.top,headings,
    sections:[...document.querySelectorAll('section')].map(s=>({id:s.id,bg:getComputedStyle(s).backgroundColor})),
    stockMask:getComputedStyle(document.querySelector('#work figure img')).maskImage,
    faultPointer:getComputedStyle(document.querySelector('[data-testid="paper-fault"]')).pointerEvents};
  })()`);
  assert.ok(result.titleRight <= result.paperLeft + 15 || result.titleBottom <= result.paperTop, 'INKTRACE title is not obscured by the paper at '+width+': '+JSON.stringify(result));
  for(const h of result.headings) {
   assert.ok(h.right <= width && h.left >= 0, 'Readable heading stays within viewport: '+JSON.stringify({width,...h}));
   assert.ok(h.right <= h.maskRight + 1, 'Toner mask must not crop the last letter: '+JSON.stringify({width,...h}));
  }
  for(const s of result.sections) assert.equal(s.bg,'rgba(0, 0, 0, 0)','Continuous substrate, no opaque section: '+s.id);
  assert.equal(result.faultPointer,'none','Decorative fault never intercepts links');
  assert.ok(result.stockMask.includes('torn-stock-v01.png'),'The black material plate is masked, never exposed as a rectangle');
  console.log('PASS continuous layout',width);
 }
} finally { ws.close(); await fetch('http://127.0.0.1:9333/json/close/'+target.id); }
