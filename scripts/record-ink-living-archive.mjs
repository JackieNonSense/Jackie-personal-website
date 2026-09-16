import {browser} from './refresh-browser.mjs';
import sharp from 'sharp';
import {writeFile,readFile} from 'node:fs/promises';
const b=await browser(),out='docs/visual/ink-living-archive/four-scenes-v01',records=[];
const requested=process.argv[2];
const sceneIds=requested?['timeline','characters','ai','wiki'].filter(id=>id===requested):['timeline','characters','ai','wiki'];
const click=label=>b.run(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
const waitForScene=id=>b.until(`document.querySelector('[data-living-window]')?.dataset.scene==='${id}'`);
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1600,height:1800,deviceScaleFactor:1,mobile:false});await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});await b.until(`!!document.querySelector('[aria-label="Open the Living Archive"]')`);await b.run('document.fonts.ready.then(()=>true)');
 await b.shot(`${out}/book-in-context.png`);await click('Open the Living Archive');await waitForScene('timeline');await click('Pause demo');
 for(const id of sceneIds){
  await b.run(`document.querySelector('#tab-${id}').click()`);await waitForScene(id);await b.until(`!!document.querySelector('[data-archive-stage],[data-wiki-stage]')?.dataset.actorFrames`);
  await b.run(`document.fonts.ready.then(()=>{document.querySelector('[data-living-window]').scrollIntoView({block:'start',behavior:'instant'});return true})`);await b.delay(200);
  const rect=await b.run(`(()=>{const r=document.querySelector('[data-living-window]').getBoundingClientRect();return{left:Math.floor(r.x),top:Math.max(0,Math.floor(r.y)),width:Math.ceil(r.width),height:Math.ceil(r.height)}})()`);
  const pageClip={x:rect.left,y:rect.top+await b.run('scrollY'),width:rect.width,height:rect.height,scale:1};
  await b.shot(`${out}/${id}-start.png`,pageClip);
  const shots=[];let last=0;
  const off=b.onEvent(m=>{if(m.method!=='Page.screencastFrame')return;const {data,metadata,sessionId}=m.params;b.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});const time=metadata.timestamp*1000;if(time-last<110)return;last=time;shots.push({data,time});});
  await b.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:1600,maxHeight:1800,everyNthFrame:2});await click('Replay demonstration');await click('Continue demo');
  const start=Date.now();let ended=0,middle=false,manual=false;const actions=[],proofs={};
  while(Date.now()-start<42000){
   const state=await b.run(`(()=>{const w=document.querySelector('[data-living-window]'),s=w.querySelector('[data-archive-stage],[data-wiki-stage]');return{mode:w.dataset.mode,time:Number(s.dataset.demoMs)}})()`);
   if(!middle&&state.time>6500){middle=true;proofs.middle=shots.at(-1)?.time;}
   if(state.mode==='ended'&&!ended){ended=Date.now();proofs['auto-result']=shots.at(-1)?.time;}
   if(ended&&Date.now()-ended>1000&&!manual){
    if(id==='timeline'){await b.run(`document.querySelector('[aria-label="Year 313"]').click()`);await b.delay(100);await b.run(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent==='May').click()`);await b.delay(100);await b.run(`document.querySelector('[aria-label="Dated events"] button').click()`);actions.push('Select year 313, May, A signal received');}
    if(id==='characters'){await click('Sen, view character');actions.push('Select Sen');}
    if(id==='ai'){await click('Confirm and create canvas');actions.push('Confirm preview and create sample canvas');}
    if(id==='wiki'){await b.run(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('Wrap left')).click()`);await click('Move quotation earlier');await click('Outer Coast, open Wiki record');actions.push('Wrap image left, reorder quotation, preview linked region');}
    manual=true;
   }
   if(ended&&Date.now()-ended>5000)break;await b.delay(200);
  }
  await b.send('Page.stopScreencast');off();await click('Pause demo');await b.shot(`${out}/${id}-manual.png`,pageClip);
  const buffers=[],delays=[],valid=[],width=768,height=Math.round(rect.height*768/rect.width);
  for(const shot of shots){const meta=await sharp(Buffer.from(shot.data,'base64')).metadata();if(meta.width>=rect.left+rect.width&&meta.height>=rect.top+rect.height)valid.push(shot);}
  if(valid.length<shots.length*.85)throw Error(`Too many invalid screencast frames: ${shots.length-valid.length}`);
  for(let i=0;i<valid.length;i++){buffers.push(await sharp(Buffer.from(valid[i].data,'base64')).extract(rect).resize(width,height,{kernel:'nearest'}).ensureAlpha().raw().toBuffer());delays.push(Math.max(20,Math.round((valid[i+1]?.time??valid[i].time+600)-valid[i].time)));}
  for(const [label,time] of Object.entries(proofs)){const closest=valid.reduce((best,frame)=>Math.abs(frame.time-time)<Math.abs(best.time-time)?frame:best);await sharp(Buffer.from(closest.data,'base64')).extract(rect).png().toFile(`${out}/${id}-${label}.png`);}
  await sharp(Buffer.concat(buffers),{raw:{width,height:height*buffers.length,channels:4,pageHeight:height}}).gif({loop:0,delay:delays,colours:128,effort:2,dither:0}).toFile(`${out}/${id}-live.gif`);
  const record={id,source:'Actual Chrome screencast, original timing',silent:true,frames:valid.length,discardedIncompleteFrames:shots.length-valid.length,duration:delays.reduce((a,b)=>a+b,0),endedAt:ended-start,complete:!!ended&&manual,actions,width,height};records.push(record);console.log(JSON.stringify(record));
 }
 const prior=requested?JSON.parse(await readFile(`${out}/recordings.json`,'utf8').catch(()=> '[]')):[];
 await writeFile(`${out}/recordings.json`,JSON.stringify([...prior.filter(r=>!sceneIds.includes(r.id)),...records].sort((a,b)=>['timeline','characters','ai','wiki'].indexOf(a.id)-['timeline','characters','ai','wiki'].indexOf(b.id)),null,2));
}finally{await b.close();}
