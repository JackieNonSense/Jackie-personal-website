'use client';

import {useEffect,useRef,type RefObject} from 'react';
import {WikiRuntime,wikiActorPoses} from './wiki-runtime';
import s from './WikiStudy.module.css';
import {frameLoop} from './frame-loop';

type Props={runtime:WikiRuntime;quiet:boolean;stage:RefObject<HTMLDivElement|null>;paper:RefObject<HTMLElement|null>;figure:RefObject<HTMLElement|null>};
const root='/studies/inktrace/living-archive/';
export function safeCanvasContext(canvas:HTMLCanvasElement){try{return canvas.getContext('2d');}catch{return null;}}

// Environment, actors and carried objects remain separate. No character is baked into the desk.
export default function WikiCanvas({runtime,quiet,stage,paper,figure}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const element=canvas.current,area=stage.current,manuscript=paper.current;
  if(!element||!area||!manuscript)return;
  let disposed=false,visible=false,ready=false;
  let size={w:0,h:0,left:0,top:0,pw:0,ph:0};
  let context:CanvasRenderingContext2D|null=null;
  let backdrop:HTMLCanvasElement|null=null;
  const images=['wiki/workshop-v01.webp','review/sprite-sheet.png','wiki/coast-v01.webp'].map(src=>{
   const image=new Image();image.src=root+src;return image;
  });
  const load=imageLoad(images);
  const handle=figure.current?.querySelector('[role="slider"]');

  function measure(){
   if(disposed||!area||!manuscript||!element)return;
   const a=area.getBoundingClientRect(),p=manuscript.getBoundingClientRect();
   size={w:Math.round(a.width),h:Math.round(a.height),left:Math.round(p.left-a.left),top:Math.round(p.top-a.top),pw:Math.round(p.width),ph:Math.round(p.height)};
   // One logical pixel is two CSS pixels. DPR never changes sprite alignment.
   element.width=Math.ceil(size.w/2);element.height=Math.ceil(size.h/2);
   if(!ready)return;
   context=safeCanvasContext(element);element.dataset.renderMode=context?'canvas':'static';if(!context)return;
   context.imageSmoothingEnabled=false;
   backdrop=document.createElement('canvas');backdrop.width=element.width;backdrop.height=element.height;
   const b=safeCanvasContext(backdrop);if(b){
    b.imageSmoothingEnabled=false;b.scale(.5,.5);
    if(images[0].naturalWidth){
     const sx=[0,92,684,768],sy=[0,48,390,512];
     const dx=[0,size.left,size.left+size.pw,size.w],dy=[0,size.top,size.top+size.ph,size.h];
     for(let y=0;y<3;y++)for(let x=0;x<3;x++)b.drawImage(images[0],sx[x],sy[y],sx[x+1]-sx[x],sy[y+1]-sy[y],dx[x],dy[y],dx[x+1]-dx[x],dy[y+1]-dy[y]);
    }
   }
   draw();
  }
  function draw(){
   if(disposed||!element||!area)return;
   const frame=runtime.getFrame(),state=runtime.getSnapshot();
   if(figure.current)figure.current.style.width=`${frame.width}%`;
   handle?.setAttribute('aria-valuenow',String(Math.round(frame.width)));
   handle?.setAttribute('aria-valuetext',`${Math.round(frame.width)} percent wide`);
   area.dataset.demoMs=String(Math.round(frame.time));area.dataset.ambientMs=String(Math.round(frame.ambient));
   const poses=wikiActorPoses(frame.time,frame.ambient,size.w,size.top+size.ph,state.mode!=='demo');
   area.dataset.actorFrames=poses.map(p=>`${p.x}:${p.frame}`).join(',');
   if(!context||!backdrop)return;
   context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,element.width,element.height);
   context.drawImage(backdrop,0,0);context.scale(.5,.5);
   for(const actor of poses){
    const x=actor.x,y=actor.y;
    context.fillStyle='#302d284c';context.fillRect(x+12,y+86,44,6);
    if(images[1].naturalWidth){
     context.save();context.translate(actor.facing<0?x+64:x,y);context.scale(actor.facing,1);
     context.drawImage(images[1],actor.frame*32,actor.row*48,32,48,0,0,64,96);context.restore();
    }
    if(actor.carrying){
     const px=x+(actor.facing<0?0:34),py=y+42;
     context.fillStyle='#555347';context.fillRect(px,py,32,22);context.fillStyle='#eee3c6';context.fillRect(px+2,py,28,18);
     if(actor.row===1&&images[2].naturalWidth)context.drawImage(images[2],px+2,py+2,28,12);
     else{context.fillStyle='#244cb3';context.fillRect(px+6,py+4,16,2);context.fillRect(px+6,py+10,12,2);}
    }
   }
  }
  function running(){return visible&&!document.hidden&&!quiet&&!runtime.getSnapshot().paused&&runtime.getSnapshot().open;}
  const loop=frameLoop(()=>!disposed&&running(),delta=>{runtime.tick(delta);draw();});
  function sync(){
   draw();loop.sync();
  }
  const unsubscribe=runtime.subscribe(sync);
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;sync();},{threshold:0});
  observer.observe(area);
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
  resize?.observe(area);resize?.observe(manuscript);
  document.addEventListener('visibilitychange',sync);
  load.then(()=>{if(disposed)return;ready=true;measure();sync();});
  measure();
  return()=>{disposed=true;loop.stop();unsubscribe();observer.disconnect();resize?.disconnect();document.removeEventListener('visibilitychange',sync);images.forEach(i=>{i.onload=null;i.onerror=null;});};
 },[runtime,quiet,stage,paper,figure]);
 return <canvas ref={canvas} className={s.canvas} aria-hidden="true"/>;
}

function imageLoad(images:HTMLImageElement[]){
 return Promise.all(images.map(image=>new Promise<void>(resolve=>{
  if(image.complete){resolve();return;}
  image.onload=()=>resolve();image.onerror=()=>resolve();
 })));
}
