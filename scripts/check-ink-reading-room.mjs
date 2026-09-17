import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browser } from './refresh-browser.mjs';

const output = 'docs/visual/ink-timeline-room';
for (let attempt = 0; attempt < 30; attempt++) {
  try { await fetch('http://127.0.0.1:9333/json/version'); break; }
  catch { await new Promise(resolve => setTimeout(resolve, 250)); }
}
const b = await browser();
const results = [];
const select = label => `Array.from(document.querySelectorAll('button')).find(e => e.getAttribute('aria-label') === ${JSON.stringify(label)})`;
const tab = label => `Array.from(document.querySelectorAll('[role=tab]')).find(e => e.textContent.includes(${JSON.stringify(label)}))`;
async function click(expression) {
  const rect = await b.run(`(() => { const e = ${expression}; e.scrollIntoView({block:'nearest',behavior:'instant'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await b.send('Input.dispatchMouseEvent', {type:'mousePressed', button:'left', clickCount:1, ...rect});
  await b.send('Input.dispatchMouseEvent', {type:'mouseReleased', button:'left', clickCount:1, ...rect});
}
async function checkNoOverflow(label) {
  const measured = await b.run(`({width:innerWidth, documentWidth:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight})`);
  assert.ok(measured.documentWidth <= measured.width, `${label}: horizontal overflow`);
  results.push({label,...measured});
}
try {
  await b.send('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await b.send('Page.navigate', {url:'http://localhost:3011/studies/inktrace/reading-room'});
  await b.until(`document.querySelector('main')?.dataset.motion === 'animated'`);
  await b.run('document.fonts.ready');
  await b.delay(500);
  await b.shot(`${output}/desktop-default.png`);
  await click(select('Read writing note'));
  await b.delay(400);
  await b.run(`document.querySelector('section[aria-label="Event details"]').scrollIntoView({block:'center',behavior:'instant'})`);
  await b.shot(`${output}/desktop-writing-note.png`);
  await click(select('Follow Kaelen'));
  await b.delay(400);
  assert.equal(await b.run(`document.querySelector('ol[aria-label="Events in story order"]').children.length`),2);
  await b.shot(`${output}/desktop-character-thread.png`);
  await click(select('Open event: Arrival at Black Harbor'));
  await b.delay(400);
  assert.equal(await b.run(`document.querySelector('section[aria-label="Event details"] h3').textContent`),'Arrival at Black Harbor');
  await click(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent==='All events')`);
  await click(select('Open event: Discovery of the Grimoire'));
  await b.delay(400);
  await b.run(`${select('Read about Archivists of Old')}.scrollIntoView({block:'center',behavior:'instant'})`);
  await b.delay(100);
  const sourceBefore = await b.run(`document.querySelector('article').getBoundingClientRect().toJSON()`);
  await click(select('Read about Archivists of Old'));
  await b.delay(430);
  assert.equal(await b.run(`document.querySelector('section[aria-label="Linked record"] h3')?.textContent`), 'Archivists of Old');
  const sourceAfter = await b.run(`document.querySelector('article').getBoundingClientRect().toJSON()`);
  assert.deepEqual(sourceAfter,sourceBefore,'opening the record moves the source');
  await b.shot(`${output}/desktop-record.png`);
  await b.run(`${select('Close record')}.focus()`);
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await b.run(`document.activeElement.getAttribute('aria-label')`),'Read about Archivists of Old');
  await click(tab('Connections'));
  await b.delay(430);
  await b.shot(`${output}/desktop-connections.png`);
  await click(select('Open Second Era record'));
  await b.delay(400);
  assert.equal(await b.run(`document.querySelector('section[aria-label="Linked record"] h3')?.textContent`),'Second Era');
  await click(tab('AI workflow'));
  await b.delay(500);
  await b.shot(`${output}/desktop-ai-workflow.png`);
  await checkNoOverflow('1440 x 900');
  assert.equal(await b.run(`document.querySelectorAll('audio,video,iframe,canvas').length`),0);
  // Do the beyond-viewport capture only after geometry checks: CDP temporarily
  // removes the vertical scrollbar during a full capture, changing layout width.
  await click(tab('Writing'));
  await b.delay(400);
  await b.run(`window.scrollTo({top:0,behavior:'instant'})`);
  await b.delay(100);
  const desktopHeight = await b.run('document.documentElement.scrollHeight');
  const desktopWidth = await b.run('document.documentElement.clientWidth');
  await b.shot(`${output}/desktop-full.png`,{x:0,y:0,width:desktopWidth,height:desktopHeight,scale:1});

  await b.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:2,mobile:false});
  await click(tab('Writing'));
  await click(select('Read about Archivists of Old'));
  await b.delay(450);
  await b.shot(`${output}/large-record.png`);
  await checkNoOverflow('1920 x 1080 / DPR 2');

  await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await b.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  await click(select('Close record'));
  await b.run(`window.scrollTo({top:0,behavior:'instant'})`);
  await b.delay(450);
  await b.shot(`${output}/mobile-top.png`);
  await b.run(`document.querySelector('section[aria-label="Story timeline"]').scrollIntoView({block:'start',behavior:'instant'})`);
  await b.shot(`${output}/mobile-timeline.png`);
  await click(select('Open event: Arrival at Black Harbor'));
  await b.delay(400);
  assert.equal(await b.run(`document.querySelector('section[aria-label="Event details"] h3').textContent`),'Arrival at Black Harbor');
  await click(select('Open event: Discovery of the Grimoire'));
  await b.delay(400);
  const height = await b.run('document.documentElement.scrollHeight');
  await b.shot(`${output}/mobile-full.png`,{x:0,y:0,width:390,height,scale:1});
  await b.run(`${select('Read about Archivists of Old')}.scrollIntoView({block:'center',behavior:'instant'})`);
  const touch = await b.run(`(() => {const r=${select('Read about Archivists of Old')}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
  await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await b.delay(650);
  assert.equal(await b.run(`document.querySelector('section[aria-label="Linked record"] h3')?.textContent`),'Archivists of Old');
  await b.shot(`${output}/mobile-touch-result.png`);
  assert.ok(await b.run(`(() => {const r=document.querySelector('section[aria-label="Linked record"] h3').getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight;})()`),'touch opens a record outside the visible viewport');
  await b.run(`document.querySelector('section[aria-label="Linked record"]').scrollIntoView({block:'center',behavior:'instant'})`);
  await b.shot(`${output}/mobile-record.png`);
  await checkNoOverflow('390 x 844 / touch / DPR 2');
  await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await b.until(`document.querySelector('main').dataset.motion === 'still'`);
  await click(select('Close record'));
  await click(select('Read about Second Era'));
  assert.equal(await b.run(`document.querySelector('section[aria-label="Linked record"] h3')?.textContent`),'Second Era');
  await click(select('Pause motion'));
  assert.equal(await b.run(`${select('Resume motion')}.getAttribute('aria-pressed')`),'true');
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  results.push({timeline:true,characterFilter:true,eventSwitch:true,sourceStable:true,escapeFocus:true,linkedRecords:true,connectionNavigation:true,touch:true,reducedMotion:true,pause:true,audioElements:0,runtimeErrors:0});
  await mkdir(output,{recursive:true});
  await writeFile(`${output}/browser-checks.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally { await b.close(); }
