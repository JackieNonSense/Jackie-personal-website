import {browser} from './refresh-browser.mjs';
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const b=await browser(),shots=[],actions=[];
const out='docs/visual/ink-living-archive/wiki-v01';
const click=label=>b.run(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1600,height:1450,deviceScaleFactor:1,mobile:false});
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/living-archive'});
 await b.until(`!!document.querySelector('[data-wiki-stage]')?.dataset.actorFrames`);
 await click('Pause demo');await b.run(`document.fonts.ready.then(()=>{document.querySelector('[data-wiki-window]').scrollIntoView({block:'start',behavior:'instant'});return true})`);
 await b.delay(300);
 const rect=await b.run(`(()=>{const r=document.querySelector('[data-wiki-window]').getBoundingClientRect();return{left:Math.floor(r.x),top:Math.max(0,Math.floor(r.y)),width:Math.ceil(r.width),height:Math.ceil(r.height)}})()`);
 let last=0;
 const off=b.onEvent(message=>{
  if(message.method!=='Page.screencastFrame')return;
  const {data,metadata,sessionId}=message.params;
  b.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
  const time=metadata.timestamp*1000;
  if(time-last<110)return;last=time;shots.push({data,time});
 });
 await b.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:1600,maxHeight:1450,everyNthFrame:2});
 await click('Replay demonstration');const begin=Date.now();let ended=0,phase=0;
 while(Date.now()-begin<38000){
  const result=await b.run(`document.querySelector('[data-wiki-window]').dataset.mode`);
  if(result==='ended'&&!ended)ended=Date.now();
  if(ended&&Date.now()-ended>1000&&phase===0){await b.run(`Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('Wrap left')).click()`);actions.push({time:Date.now()-begin,action:'Wrap left'});phase++;}
  if(ended&&Date.now()-ended>2100&&phase===1){await click('Move quotation earlier');actions.push({time:Date.now()-begin,action:'Move quotation earlier'});phase++;}
  if(ended&&Date.now()-ended>3100&&phase===2){await click('Outer Coast, open Wiki record');actions.push({time:Date.now()-begin,action:'Open linked region'});phase++;}
  if(ended&&Date.now()-ended>4600)break;
  await b.delay(180);
 }
 await b.send('Page.stopScreencast');off();
 const frames=[],delay=[],width=768,height=Math.round(rect.height*768/rect.width);
 for(let i=0;i<shots.length;i++){
  frames.push(await sharp(Buffer.from(shots[i].data,'base64')).extract(rect).resize(width,height,{kernel:'nearest'}).ensureAlpha().raw().toBuffer());
  delay.push(Math.max(20,Math.round((shots[i+1]?.time??shots[i].time+500)-shots[i].time)));
 }
 await sharp(Buffer.concat(frames),{raw:{width,height:height*frames.length,channels:4,pageHeight:height}}).gif({loop:0,delay,colours:128,effort:2,dither:0}).toFile(`${out}/wiki-native-demo.gif`);
 await writeFile(`${out}/native-recording.json`,JSON.stringify({source:'Chrome screencast; actual browser frames, original timing',silent:true,complete:phase===3,frames:frames.length,duration:delay.reduce((a,b)=>a+b,0),demoEndedAt:ended?ended-begin:null,actions,width,height},null,2));
 console.log(JSON.stringify({saved:true,frames:frames.length,duration:delay.reduce((a,b)=>a+b,0)}));
}finally{await b.close();}
