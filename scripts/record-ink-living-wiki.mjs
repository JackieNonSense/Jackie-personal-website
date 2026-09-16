import {browser} from './refresh-browser.mjs';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/visual/ink-living-archive/wiki-v01';await mkdir(out,{recursive:true});
const b=await browser(),frames=[],delays=[],actions=[];
const click=label=>b.run(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1600,height:1600,deviceScaleFactor:1,mobile:false});
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});
 await b.until(`!!document.querySelector('[data-wiki-stage]')?.dataset.actorFrames`);
 await b.run(`document.fonts.ready.then(()=>{window.scrollTo({top:0,behavior:'instant'});return true})`);
 await click('Pause demo');await b.shot(`${out}/wiki-in-context.png`);
 await click('Replay demonstration');
 const clip=await b.run(`(()=>{const r=document.querySelector('[data-wiki-window]').getBoundingClientRect();return{x:Math.floor(r.x+scrollX),y:Math.floor(r.y+scrollY),width:Math.ceil(r.right+scrollX)-Math.floor(r.x+scrollX),height:Math.ceil(r.bottom+scrollY)-Math.floor(r.y+scrollY),scale:1}})()`);
 const width=768,height=Math.round(clip.height*width/clip.width),started=Date.now();let endAt=0,manual=0,mid=false,result=false;
 while(Date.now()-started<50000){
  const begin=Date.now();
  const state=await b.run(`(()=>{const s=document.querySelector('[data-wiki-stage]');return{time:+s.dataset.demoMs,mode:document.querySelector('[data-wiki-window]').dataset.mode}})()`);
  if(!mid&&state.time>=8000){mid=true;await b.shot(`${out}/wiki-mid-animation.png`,clip);}
  if(state.mode==='ended'&&!endAt){endAt=Date.now();await b.shot(`${out}/wiki-auto-result.png`,clip);}
  if(endAt&&Date.now()-endAt>1200&&manual===0){await b.run(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('Wrap left')).click()`);actions.push({at:Date.now()-started,action:'Manual wrap left'});manual++;}
  if(endAt&&Date.now()-endAt>2300&&manual===1){await click('Move quotation earlier');actions.push({at:Date.now()-started,action:'Move quotation earlier'});manual++;}
  if(endAt&&Date.now()-endAt>3500&&manual===2){await click('Outer Coast, open Wiki record');actions.push({at:Date.now()-started,action:'Open linked region in the reading slot'});manual++;}
  if(endAt&&Date.now()-endAt>5000){await b.shot(`${out}/wiki-manual-result.png`,clip);result=true;break;}
  const shot=await b.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});
  frames.push(await sharp(Buffer.from(shot.data,'base64')).resize(width,height,{kernel:'nearest'}).ensureAlpha().raw().toBuffer());
  await b.delay(Math.max(0,150-(Date.now()-begin)));delays.push(Date.now()-begin);
 }
 await sharp(Buffer.concat(frames),{raw:{width,height:height*frames.length,channels:4,pageHeight:height}}).gif({loop:0,delay:delays,colours:128,effort:2,dither:0}).toFile(`${out}/wiki-live-demo.gif`);
 await writeFile(`${out}/recording.json`,JSON.stringify({source:'Actual localhost browser frames; normal speed, no generated transitions',silent:true,width,height,frames:frames.length,duration:delays.reduce((a,b)=>a+b,0),complete:result,actions},null,2));
 console.log(JSON.stringify({frames:frames.length,complete:result,output:`${out}/wiki-live-demo.gif`}));
}finally{await b.close();}
