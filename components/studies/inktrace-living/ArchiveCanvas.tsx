'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {ArchiveRuntime} from './archive-runtime';
import {actorPoses,aiNode,ease} from './scene-geometry';
import {safeCanvasContext} from './WikiCanvas';
import s from './LivingArchive.module.css';
const base='/studies/inktrace/living-archive/';
export default function ArchiveCanvas({runtime,quiet,stage}:{runtime:ArchiveRuntime;quiet:boolean;stage:RefObject<HTMLDivElement|null>}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,area=stage.current;if(!canvas||!area)return;
  let disposed=false,raf=0,inFrame=false,previous=0,visible=false,w=0,h=0;
  const ctx=safeCanvasContext(canvas);canvas.dataset.renderMode=ctx?'canvas':'static';
  const scene=runtime.getSnapshot().scene;
  const environment=new Image(),sprites=new Image(),paper=new Image();
  environment.src=base+`scenes/${scene}-v01.webp`;sprites.src=base+'review/sprite-sheet.png';
  paper.src=base+'wiki/workshop-v01.webp';
  const ready=Promise.all([environment,sprites,paper].map(img=>new Promise<void>(resolve=>{if(img.complete)resolve();else{img.onload=()=>resolve();img.onerror=()=>resolve();}})));
  const running=()=>visible&&!document.hidden&&!quiet&&!runtime.getSnapshot().paused&&runtime.getSnapshot().open;
  const stop=()=>{cancelAnimationFrame(raf);raf=0;previous=0;};
  const schedule=()=>{if(!disposed&&!raf&&!inFrame&&running())raf=requestAnimationFrame(loop);};
  function loop(now:number){raf=0;if(disposed||!running())return;inFrame=true;if(previous)runtime.tick(now-previous);previous=now;draw();inFrame=false;schedule();}
  function measure(){if(disposed)return;w=Math.round(area!.clientWidth);h=Math.round(area!.clientHeight);canvas!.width=Math.ceil(w/2);canvas!.height=Math.ceil(h/2);draw();}
  function draw(){
   if(disposed)return;const state=runtime.getSnapshot(),f=runtime.getFrame();
   area!.dataset.demoMs=String(Math.round(f.time));area!.dataset.ambientMs=String(Math.round(f.ambient));
   const poses=actorPoses(scene,f.time,f.ambient,w,h,state);area!.dataset.actorFrames=poses.map(p=>`${p.x}:${p.y}:${p.frame}`).join(',');
   if(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas!.width,canvas!.height);ctx.imageSmoothingEnabled=false;ctx.scale(.5,.5);if(environment.naturalWidth)ctx.drawImage(environment,0,0,w,h);}
   if(scene==='timeline'&&ctx){
    const spread=quiet||state.mode==='manual'?1:ease(f.time/3200),paperW=w*(.65+.20*spread),left=(w-paperW)/2,top=h*(w<500?.24:.29),height=h*(w<500?.49:.39);
    ctx.fillStyle='#211e1866';ctx.fillRect(left+4,top+height+5,paperW,9);
    for(let i=0;i<6;i++){
     const x=Math.round(left+i*paperW/6),next=Math.round(left+(i+1)*paperW/6),fold=i%2===0?-7:7;
     ctx.fillStyle=i%2?'#d7ceb5':'#eee5ce';ctx.beginPath();ctx.moveTo(x,top+fold);ctx.lineTo(next,top-fold);ctx.lineTo(next,top+height-fold);ctx.lineTo(x,top+height+fold);ctx.closePath();ctx.fill();
     if(paper.naturalWidth){ctx.save();ctx.clip();ctx.globalAlpha=.55;ctx.drawImage(paper,112+i*72,65,72,300,x,top-7,next-x,height+14);ctx.restore();}
     ctx.fillStyle='#74664b40';ctx.fillRect(x,top+Math.abs(fold),2,height-14);
     // Restrained engraved landscape at the foot of the scroll, away from text.
     ctx.fillStyle='#a29c813d';for(let j=0;j<5;j++){const tx=x+10+j*(next-x)/5;ctx.fillRect(tx,top+height-28-j%2*8,2,24);ctx.fillRect(tx-3,top+height-24-j%2*8,8,3);}
    }
    const delivery=ease((f.time-14500)/1000);if(f.time>=14500&&f.time<15500){ctx.fillStyle='#e9dfc4';ctx.fillRect(w*.64,h*.75+delivery*h*.15,24,34);ctx.fillStyle='#244cb3';ctx.fillRect(w*.64+4,h*.75+delivery*h*.15+8,14,2);}
   }
   if(scene==='characters'){
    const line=state.mode==='manual'&&state.person?1:ease((f.time-9000)/2000);
    if(ctx&&state.person&&line>0){ctx.lineWidth=3;for(const index of [1,2]){const direct=state.person==='mara'||state.person===['mara','ivo','sen'][index];ctx.strokeStyle=direct?'#244cb3':'#929a8980';ctx.fillStyle=ctx.strokeStyle;const a=poses[0],b=poses[index],x=a.x+32,y=a.y+94,bx=b.x+32,by=b.y+94;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(bx-x)*line,y+20);if(line>.5)ctx.lineTo(bx,by);ctx.stroke();ctx.fillRect(x-3,y-3,6,6);}}
    poses.forEach((pose,index)=>{const target=area!.querySelector<HTMLElement>(`[data-person="${index}"]`);if(target){target.style.left=`${pose.x+32}px`;target.style.top=`${pose.y}px`;}});
   }
   if(scene==='ai'){
    const nodes=[0,1,2].map(i=>aiNode(i,f.time,w,h));
    const request=area!.querySelector<HTMLElement>('[data-request]');if(request)request.textContent='Organise people and connections.'.slice(0,quiet?99:Math.floor(f.time/65));
    if(ctx&&f.time>=10000){const progress=ease((f.time-10000)/2500);ctx.strokeStyle='#244cb3';ctx.lineWidth=3;nodes.slice(1).forEach(b=>{const a=nodes[0];ctx.beginPath();ctx.moveTo(a.x+34,a.y+22);ctx.lineTo(a.x+(b.x-a.x)*progress,a.y+22);if(progress>.6)ctx.lineTo(b.x,b.y+22);ctx.stroke();});}
    nodes.forEach((node,index)=>{
     const target=area!.querySelector<HTMLElement>(`[data-ai-node="${index}"]`);if(target){target.style.left=`${node.x}px`;target.style.top=`${node.y}px`;target.style.opacity=node.visible?'1':'0';target.style.visibility=node.visible?'visible':'hidden';}
     if(ctx&&node.visible){ctx.fillStyle='#615a4533';ctx.fillRect(node.x-40+4,node.y+6,80,62);ctx.fillStyle='#eee5cb';ctx.fillRect(node.x-40,node.y,80,62);ctx.fillStyle='#b0a388';ctx.fillRect(node.x-40,node.y+60,80,2);ctx.fillStyle=['#845830','#244cb3','#646352'][index];ctx.fillRect(node.x-28,node.y+33,16,16);ctx.fillStyle='#9e9b81';ctx.fillRect(node.x-6,node.y+35,29,2);ctx.fillRect(node.x-6,node.y+41,22,2);ctx.fillRect(node.x-6,node.y+47,17,2);}
    });
    if(ctx&&f.archive>0){const p=ease(f.archive/2400),x=w*.57,y=h*(.80+.12*p);ctx.fillStyle='#62584066';ctx.fillRect(x+4,y+4,66,42);ctx.fillStyle='#d8cba8';ctx.fillRect(x,y,66,40);ctx.fillRect(x,y-5,26,8);ctx.fillStyle='#244cb3';ctx.fillRect(x+7,y+11,48,3);ctx.fillRect(x+7,y+20,30,3);}
   }
   if(ctx)for(const actor of poses){
    const {x,y}=actor;ctx.fillStyle='#302d2845';ctx.fillRect(x+12,y+86,44,6);
    if(sprites.naturalWidth){ctx.save();ctx.translate(actor.facing<0?x+64:x,y);ctx.scale(actor.facing,1);ctx.drawImage(sprites,actor.frame*32,actor.row*48,32,48,0,0,64,96);ctx.restore();}
    if(actor.carrying){ctx.fillStyle='#eee3c6';ctx.fillRect(x+36,y+42,24,28);ctx.fillStyle='#244cb3';ctx.fillRect(x+40,y+48,14,2);ctx.fillRect(x+40,y+54,12,2);}
   }
  }
  const sync=()=>{draw();if(!running())stop();else schedule();};
  const unsubscribe=runtime.subscribe(sync),observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;sync();});observer.observe(area);
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;resize?.observe(area);
  document.addEventListener('visibilitychange',sync);measure();ready.then(()=>{if(!disposed){draw();schedule();}});
  return()=>{disposed=true;stop();unsubscribe();observer.disconnect();resize?.disconnect();document.removeEventListener('visibilitychange',sync);};
 },[runtime,quiet,stage]);
 return <canvas ref={ref} aria-hidden="true" className={s.sceneCanvas}/>;
}
