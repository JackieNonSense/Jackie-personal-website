'use client';

import {motion} from 'framer-motion';
import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import {useLiveReducedMotion} from '../inktrace-living-review/use-live-reduced-motion';
import {advanceClock,glyphAt,streamHead,streams} from './signal-runtime';
import s from './HeroInkSignal.module.css';

const WIDTH=1586,HEIGHT=992;
const artwork='/studies/hero-ink-signal/approved-hero.png';
const faultPoints=Array.from({length:166},(_,i)=>`${1395+((i*17)%11)-5},${i*7}`).join(' ');

export default function HeroInkSignal({still=false,clean=false,embedded=false}:{still?:boolean;clean?:boolean;embedded?:boolean}){
 const id=useId();
 const headingId=`${id}-hero-title`;
 const reduced=useLiveReducedMotion();
 const quiet=still||reduced;
 const [paused,setPaused]=useState(false);
 const [ready,setReady]=useState(false);
 const [artworkFailed,setArtworkFailed]=useState(false);
 const stage=useRef<HTMLDivElement>(null);
 const canvas=useRef<HTMLCanvasElement>(null);
 const image=useRef<HTMLImageElement>(null);
 const clock=useRef({elapsed:0});
 const wake=useRef<()=>void>(()=>{});
 const interaction=useRef({near:false,paused:false,quiet:false});
 useEffect(()=>{
  interaction.current.paused=paused;
  interaction.current.quiet=quiet;
  wake.current();
 },[paused,quiet]);

 useEffect(()=>{
  let mounted=true;
  // A cached SSR image may finish before React attaches its load handler.
  if(image.current?.complete&&image.current.naturalWidth>0)
   queueMicrotask(()=>{if(mounted)setReady(true);});
  return()=>{mounted=false;};
 },[]);

 useEffect(()=>{
  if(!ready||!canvas.current||!stage.current||!image.current)return;
  const output=canvas.current,host=stage.current;
  const ctx=output.getContext('2d');
  if(!ctx)return;
  // The image only supplies a luminance mask. The approved artwork is not edited.
  const mask=document.createElement('canvas');mask.width=WIDTH;mask.height=HEIGHT;
  const maskContext=mask.getContext('2d',{willReadFrequently:true});
  if(!maskContext)return;
  maskContext.drawImage(image.current,0,0,WIDTH,HEIGHT);
  const pixels=maskContext.getImageData(0,0,WIDTH,HEIGHT);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   const i=(y*WIDTH+x)*4;
   const dark=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2])<79;
   const fade=Math.max(0,Math.min(1,(y-419)/24,(619-y)/26,(x-520)/28,(1140-x)/35));
   pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
   pixels.data[i+3]=dark?Math.round(fade*255):0;
  }
  maskContext.putImageData(pixels,0,0);
  let inView=true,visible=!document.hidden,previous:number|null=null,frame=0;
  let scaleX=1,scaleY=1;
  const resize=()=>{
   const ratio=Math.min(2,window.devicePixelRatio||1);
   output.width=Math.max(1,Math.round(host.clientWidth*ratio));
   output.height=Math.max(1,Math.round(host.clientHeight*ratio));
   scaleX=output.width/WIDTH;scaleY=output.height/HEIGHT;
  };
  const paint=()=>{
   const near=interaction.current.near;
   host.dataset.time=String(Math.round(clock.current.elapsed));
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,output.width,output.height);
   ctx.setTransform(scaleX,0,0,scaleY,0,0);
   ctx.font='15px "Courier New", monospace';ctx.textAlign='center';
   ctx.textBaseline='middle';
   for(const stream of streams){
    const head=streamHead(stream,clock.current.elapsed);
    for(let index=0;index<stream.length;index++){
     const raw=head-index*15*stream.direction;
     const y=416+((raw-416)%208+208)%208;
     const alpha=(index===0?.9:.65-index*.075)*(near?1:.72);
     ctx.fillStyle=index===0?`rgba(233,229,209,${alpha})`:`rgba(65,101,220,${alpha})`;
     ctx.fillText(glyphAt(stream.id,Math.floor(raw/15)),stream.x,y);
    }
   }
   ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);
   ctx.globalCompositeOperation='source-over';
  };
  const tick=(now:number)=>{
   frame=0;
   const dt=previous===null?0:now-previous;previous=now;
   const state=interaction.current;
   const active=visible&&inView&&!state.paused&&!state.quiet;
   if(!active){previous=null;return;}
   clock.current.elapsed=advanceClock(clock.current.elapsed,dt,active);
   paint();frame=requestAnimationFrame(tick);
  };
  const sync=()=>{
   const active=visible&&inView&&!interaction.current.paused&&!interaction.current.quiet;
   if(active&&!frame){previous=null;frame=requestAnimationFrame(tick);}
   else if(!active&&frame){cancelAnimationFrame(frame);frame=0;previous=null;}
  };
  wake.current=sync;
  const visibility=()=>{visible=!document.hidden;sync();};
  const observer=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true;sync();},{threshold:.02});
  observer.observe(host);
  const redraw=()=>{resize();if(visible&&inView)paint();};
  const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;
  resizeObserver?.observe(host);window.addEventListener('resize',redraw);
  document.addEventListener('visibilitychange',visibility);
  resize();paint();sync();
  return()=>{
   wake.current=()=>{};
   cancelAnimationFrame(frame);observer.disconnect();resizeObserver?.disconnect();
   window.removeEventListener('resize',redraw);document.removeEventListener('visibilitychange',visibility);
  };
 },[ready]);

 const feedback=quiet?{}:{whileHover:{y:-1},whileTap:{y:1},transition:{duration:.1}};
 const Wrapper=embedded?'section':'main';
 return <Wrapper id={embedded?'signal':undefined} className={embedded?s.embedded:s.study} aria-labelledby={headingId}>
  <div ref={stage} className={s.stage} data-hero-proof data-paused={paused||quiet} data-artwork-failed={artworkFailed}>
   <h1 id={headingId} className={artworkFailed?s.fallbackTitle:s.visuallyHidden} data-artwork-fallback={artworkFailed}><span>Yuchao</span>{' '}<span>Wang</span></h1>
   {/* The reviewed lettering is raster art, not replacement web typography. */}
   {/* eslint-disable-next-line @next/next/no-img-element */}
   {!artworkFailed&&<img ref={image} src={artwork} width={WIDTH} height={HEIGHT} alt={embedded?'':'Yuchao Wang — approved Hero artwork'} className={s.artwork} onLoad={()=>setReady(true)} onError={()=>{setArtworkFailed(true);setReady(false);}} draggable={false}/>}
   {!embedded&&<svg className={s.fault} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={faultPoints}/></svg>}
   <canvas ref={canvas} className={s.signal} aria-hidden="true"/>
   <div className={s.signalArea} aria-hidden="true" onPointerEnter={()=>{interaction.current.near=true;}} onPointerLeave={()=>{interaction.current.near=false;}}/>
   <nav aria-label="Portfolio" className={s.navigation}>{['Work','About','Contact'].map(name=><Link key={name} href={`${embedded?'':'/'}#${name.toLowerCase()}`} aria-label={name} prefetch={false}><span className={s.visuallyHidden}>{name}</span></Link>)}</nav>
  </div>
  {!clean&&!embedded&&<motion.div className={s.controls} initial={quiet?false:'hidden'} animate="shown" variants={{hidden:{opacity:0},shown:{opacity:1,transition:{staggerChildren:quiet?0:.06}}}}>
   <motion.button {...feedback} variants={{hidden:{opacity:0},shown:{opacity:1}}} aria-label={paused?'Resume motion':'Pause motion'} onClick={()=>setPaused(v=>!v)}>{paused?'▶ Resume':'Ⅱ Pause'}</motion.button>
  </motion.div>}
 </Wrapper>;
}
