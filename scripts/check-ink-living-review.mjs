import { browser } from './refresh-browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'docs/visual/ink-living-archive/phase-01';
const b = await browser();
const results = [];
const assert = (condition, label) => { if (!condition) throw Error(label); };
const url = 'http://localhost:3011/studies/inktrace/living-archive/review';
try {
  await mkdir(output, { recursive: true });
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await b.send('Page.navigate', { url });
  await b.until(`!!document.querySelector('[data-review-phase]')`);
  await b.run('document.fonts.ready.then(()=>true)');
  await b.until(`document.querySelector('canvas')?.dataset.frames != null`);
  for (const width of [390, 1024, 1440, 1920]) {
    for (const dpr of [1, 2]) {
      await b.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: dpr, mobile: width === 390 });
      await b.run('scrollTo({top:0,behavior:"instant"})');
      await b.delay(300);
      const geometry = await b.run(`(() => {
        const boxes=Array.from(document.querySelectorAll('[role=tab],button')).map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON()}));
        return { overflow:document.documentElement.scrollWidth-innerWidth, controls:boxes, media:document.querySelectorAll('audio,video,iframe').length,
          fonts:Array.from(document.fonts).filter(f=>f.family.startsWith('Living')).map(f=>({family:f.family,status:f.status})),
          specimens:Array.from(document.querySelectorAll('[data-type-size]')).map(e=>({expected:e.dataset.typeSize,actual:getComputedStyle(e).fontSize,family:getComputedStyle(e).fontFamily})) };
      })()`);
      assert(geometry.overflow <= 1, `overflow ${width}/${dpr}: ${geometry.overflow}`);
      assert(geometry.controls.every(c => c.rect.height >= 44), `small control ${width}/${dpr}`);
      assert(geometry.media === 0, 'No media players or embedded product allowed');
      assert(geometry.fonts.filter(f => f.family.startsWith('LivingFusion')).every(f => f.status === 'loaded'), 'Pixel font failed to load');
      assert(geometry.specimens.every(f => Number.parseInt(f.actual) === Number(f.expected)), 'Wrong actual font size');
      results.push({ width, dpr, ...geometry });
      if (dpr === 1) await b.shot(`${output}/layout-${width}.png`);
      if (width === 390 && dpr === 1) {
        await b.run(`document.querySelector('[role=tablist]').scrollIntoView({block:'start',behavior:'instant'})`);
        await b.shot(`${output}/mobile-scene-review.png`);
      }
    }
  }
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const boards=[];
  for (let scene=0; scene<4; scene++) {
    await b.run(`document.querySelectorAll('[role=tab]')[${scene}].click()`);
    await b.until(`document.querySelector('[role=tabpanel] img')?.complete === true`);
    await b.delay(250);
    const geometry=await b.run(`(() => { const p=document.querySelector('[role=tabpanel]');const i=p.querySelector('img');const r=i.getBoundingClientRect();return {src:i.getAttribute('src'),natural:i.naturalWidth,fit:getComputedStyle(i).objectFit,clip:{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}};})()`);
    assert(geometry.natural>0 && geometry.fit==='contain','Board must be complete and uncropped');
    boards.push(geometry.src);
    await b.shot(`${output}/scene-${scene+1}-paired-states.png`,geometry.clip);
  }
  assert(new Set(boards).size===4,'Scenes cannot reuse the same image');
  await b.run(`document.querySelector('canvas').scrollIntoView({block:'center',behavior:'instant'})`);
  await b.delay(250);
  const sample = () => b.run(`({...document.querySelector('canvas').dataset})`);
  const first=await sample(); await b.delay(205); const next=await sample();
  assert(Number(next.elapsed)>Number(first.elapsed),'Visible sprite clock should run');
  assert(next.frames!==first.frames,'Walking must change its gait frame');
  await b.run(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Pause motion').click()`);
  const paused=await sample(); await b.delay(240);
  assert((await sample()).elapsed===paused.elapsed,'Pause must freeze the exact time');
  await b.shot(`${output}/sprite-and-type-proof.png`);
  await b.run(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Play motion').click()`);
  await b.delay(50); await b.run('scrollTo({top:0,behavior:"instant"})'); await b.delay(200);
  const offscreen=await sample(); await b.delay(240);
  assert((await sample()).elapsed===offscreen.elapsed,'Offscreen visual clock must stop');
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.run(`document.querySelector('canvas').scrollIntoView({block:'center',behavior:'instant'})`); await b.delay(200);
  const quiet=await sample(); await b.delay(240);
  assert((await sample()).elapsed===quiet.elapsed,'Reduced motion must stop automatic sprite updates');
  await b.run(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Next frame →').click()`);
  assert((await sample()).frames!==quiet.frames,'Reduced motion keyframe control must remain usable');
  const resources=await b.run(`performance.getEntriesByType('resource').map(r=>r.name)`);
  // This host injects AdGuard at the OS level, including into our clean Chrome profile.
  // Keep those observed requests in the evidence instead of claiming a clean network log.
  const environmentRequests=resources.filter(r=>new URL(r).hostname==='local.adguard.org');
  assert(resources.every(r=>['localhost','local.adguard.org'].includes(new URL(r).hostname)),'Review unexpectedly requested an external service');
  const devErrors=await b.run(`Array.from(document.querySelectorAll('nextjs-portal')).some(p=>p.shadowRoot?.querySelector('[data-next-badge][data-error=true]'))`);
  assert(!devErrors,'Next development overlay reports an error; inspect it before delivery');
  assert(b.errors.length===0,JSON.stringify(b.errors));
  await writeFile(`${output}/browser-audit.json`, JSON.stringify({results,boards,sprite:{first,next,paused,offscreen,quiet},resources,environmentRequests,errors:b.errors,scope:'Phase-one review only; final scene interaction is not implemented or validated'},null,2));
  console.log('PASS: 8 viewport/DPR combinations; four boards; real fonts; gait, pause, offscreen, reduced-motion; no InkTrace API or media. Host-injected AdGuard requests are recorded separately.');
} finally { await b.close(); }
