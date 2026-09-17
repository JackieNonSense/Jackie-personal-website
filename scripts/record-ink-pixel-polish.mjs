import {browser} from './refresh-browser.mjs';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const b=await browser();
const dir='docs/visual/ink-pixel-window/type-motion-v02';
const frames=[],delays=[],stages=[];
const click=label=>b.run(`document.querySelector('[aria-label="${label}"]').click()`);
try {
 await mkdir(dir,{recursive:true});
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1024,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/pixel-window'});
 await b.until('!!document.querySelector("[aria-label=\"Open InkTrace demo\"]")'.replace('[aria-label="Open InkTrace demo"]',"[aria-label='Open InkTrace demo']"));
 await b.delay(1000);
 const actions=[
  [600,()=>click('Open InkTrace demo')],
  [2000,()=>click('Read event: The archive opens')],
  [3400,()=>b.run('document.querySelectorAll("[role=tab]")[1].click()')],
  [4650,()=>b.run('document.querySelectorAll("[role=tab]")[3].click()')],
  [5950,()=>click('Close InkTrace demo')],
 ];
 const start=Date.now();let next=0;
 while(Date.now()-start<6800){
  const frameStart=Date.now();
  if(next<actions.length&&frameStart-start>=actions[next][0]){await actions[next][1]();next++;}
  const shot=await b.send('Page.captureScreenshot',{format:'jpeg',quality:90,clip:{x:520,y:155,width:820,height:800,scale:1}});
  const buffer=Buffer.from(shot.data,'base64');
  frames.push(await sharp(buffer).ensureAlpha().raw().toBuffer());
  if(frameStart-start>=620&&frameStart-start<1400){
   const file=`open-${frameStart-start}.jpg`;
   await writeFile(`${dir}/${file}`,buffer);stages.push(file);
  }
  await b.delay(Math.max(0,55-(Date.now()-frameStart)));delays.push(Date.now()-frameStart);
 }
 await sharp(Buffer.concat(frames),{raw:{width:820,height:800*frames.length,channels:4,pageHeight:800}})
  .gif({loop:0,delay:delays,effort:4,colours:256}).toFile(`${dir}/interaction-polish.gif`);
 await writeFile(`${dir}/recording.json`,JSON.stringify({frames:frames.length,durationMs:delays.reduce((a,b)=>a+b,0),silent:true,openingFrames:stages},null,2));
 console.log(`Recorded ${frames.length} actual browser frames, no sound.`);
}finally{await b.close();}
