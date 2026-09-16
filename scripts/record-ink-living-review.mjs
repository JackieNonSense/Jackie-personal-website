import { browser } from './refresh-browser.mjs';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const b = await browser();
const output = 'docs/visual/ink-living-archive/phase-01';
try {
  await mkdir(output, { recursive: true });
  await b.send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await b.send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await b.send('Page.navigate', {url:'http://localhost:3011/studies/inktrace/living-archive/review'});
  await b.until(`!!document.querySelector('canvas')?.dataset.frames`);
  await b.run(`document.fonts.ready.then(()=>{document.querySelector('canvas').scrollIntoView({block:'center',behavior:'instant'});return true})`);
  await b.delay(250);
  const clip=await b.run(`(()=>{const r=document.querySelector('[aria-labelledby="sprite-proof-title"]').getBoundingClientRect();return{x:Math.floor(r.x+scrollX),y:Math.floor(r.y+scrollY),width:Math.ceil(r.width),height:Math.ceil(r.height),scale:1}})()`);
  const frames=[], delays=[];
  const actions=[[0,'Walk'],[1700,'Work'],[3200,'Turn'],[4100,'Walk'],[5500,'Pause motion']];
  const started=Date.now();let next=0;
  while(Date.now()-started<6300){
    const start=Date.now();
    if(next<actions.length&&start-started>=actions[next][0]){
      await b.run(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent===${JSON.stringify(actions[next][1])}).click()`);next++;
    }
    const shot=await b.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});
    frames.push(await sharp(Buffer.from(shot.data,'base64')).ensureAlpha().raw().toBuffer());
    await b.delay(Math.max(0,85-(Date.now()-start)));
    delays.push(Date.now()-start);
  }
  await sharp(Buffer.concat(frames),{raw:{width:clip.width,height:clip.height*frames.length,channels:4,pageHeight:clip.height}})
    .gif({loop:0,delay:delays,colours:128,effort:3}).toFile(`${output}/browser-sprite-proof.gif`);
  await writeFile(`${output}/recording.json`,JSON.stringify({source:'Actual localhost browser captures',frames:frames.length,duration:delays.reduce((a,b)=>a+b,0),silent:true,scope:'Sprite asset proof; not the four production scene demos',actions},null,2));
  console.log(`Saved ${frames.length} real browser frames, silent.`);
}finally{await b.close();}
