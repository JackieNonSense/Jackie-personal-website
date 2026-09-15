// Mechanical extraction/registration of the generated frames; no art is redrawn.
import sharp from 'sharp';
import {mkdir,copyFile} from 'node:fs/promises';
const source=process.argv[2];
const version=process.argv[3]??'v03';
if(!source)throw Error('Pass the generated eight-frame sprite sheet.');
const out='public/studies/inktrace/pixel-world';
await mkdir(out,{recursive:true});
await copyFile(source,`app/reference/production/inktrace-pixel-window-v01/book-sheet-master-${version}.png`);
const frames=[];
for(let i=0;i<8;i++){
 const data=await sharp(source).extract({left:i%4*384,top:i<4?96:580,width:384,height:336}).resize(96,84,{kernel:'nearest'}).png().toBuffer();
 frames.push(data);
}
await sharp({create:{width:768,height:84,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames.map((input,i)=>({input,left:i*96,top:0}))).png().toFile(`${out}/book-sheet-${version}.png`);
await sharp(frames[0]).toFile(`${out}/book-rest-${version}.png`);
// libvips multi-page raw data gives GIF frames without a browser or audio.
const rawFrames=await Promise.all(frames.map(f=>sharp(f).resize(288,252,{kernel:'nearest'}).ensureAlpha().raw().toBuffer()));
await sharp(Buffer.concat(rawFrames),{raw:{width:288,height:252*8,channels:4,pageHeight:252}}).gif({loop:0,delay:[1900,170,170,170,170,170,170,170]}).toFile(`docs/visual/ink-pixel-window/book-turn-${version}.gif`);
console.log('Packed eight registered 96×84 frames and exported preview GIF.');
