import {browser} from './refresh-browser.mjs';
import sharp from 'sharp';
const b=await browser(),frames=[],delays=[];
const click=label=>b.run(`document.querySelector('[aria-label="${label}"]').click()`);
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://localhost:3011/studies/inktrace/pixel-window'});
 await b.until('!!document.querySelector("[aria-label=\"Open InkTrace demo\"]")'.replace('[aria-label="Open InkTrace demo"]',"[aria-label='Open InkTrace demo']"));
 await b.delay(1100);await b.shot('docs/visual/ink-pixel-window/08-final-rest.png');
 for(let i=0;i<55;i++){
  const start=Date.now();
  if(i===5)await click('Open InkTrace demo');
  if(i===20)await click('Read event: The archive opens');
  if(i===32){await b.shot('docs/visual/ink-pixel-window/09-final-drawer.png');await b.run('document.querySelectorAll("[role=tab]")[1].click()');}
  if(i===45)await click('Close InkTrace demo');
  const shot=await b.send('Page.captureScreenshot',{format:'png',clip:{x:430,y:170,width:950,height:750,scale:1}});
  frames.push(await sharp(Buffer.from(shot.data,'base64')).resize(760,600).ensureAlpha().raw().toBuffer());
  await b.delay(Math.max(0,130-(Date.now()-start)));delays.push(Date.now()-start);
 }
 await sharp(Buffer.concat(frames),{raw:{width:760,height:600*frames.length,channels:4,pageHeight:600}}).gif({loop:0,delay:delays,effort:4,colours:128}).toFile('docs/visual/ink-pixel-window/archive-interaction.gif');
 console.log('Recorded a silent browser interaction GIF: 55 frames, '+Math.round(delays.reduce((a,b)=>a+b,0)/1000)+' s.');
}finally{await b.close();}
