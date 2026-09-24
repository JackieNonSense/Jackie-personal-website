'use client';
import {useEffect,useRef,useState} from 'react';
import {INK_RGBA} from '@/components/portfolio/inktrace-press/palette';
import {PW,PH,PRESS_FRAMES,RUN_FRAMES,drawPress,renderPress,waysInOpen} from '@/components/portfolio/inktrace-press/press';
import WaysIn from '@/components/portfolio/inktrace-press/WaysIn';
import press from '@/components/portfolio/inktrace-press/InkTracePress.module.css';
import s from './PressFrames.module.css';

function Sheet({px,scale}:{px:Uint8Array;scale:number}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const context=canvas.current?.getContext('2d');if(!context)return;
  const image=context.createImageData(PW,PH);
  for(let i=0;i<px.length;i++)image.data.set(INK_RGBA[px[i]],i*4);
  context.putImageData(image,0,0);
 },[px]);
 return <canvas ref={canvas} width={PW} height={PH} className={s.canvas} style={{width:PW*scale,height:PH*scale}} aria-hidden="true"/>;
}

const FRAMES:{key:keyof typeof PRESS_FRAMES;title:string}[]=[
 {key:'ask',title:'01 / The question'},{key:'cut',title:'02 / The cut'},{key:'answer',title:'03 / The answer'},
 {key:'fold',title:'04 / The fold'},{key:'bloom',title:'05 / The bloom'},{key:'end',title:'06 / The mark'},
];

export default function PressFrames(){
 const [frame,setFrame]=useState(0),[hover,setHover]=useState<'try'|'built'|null>(null);
 const open=waysInOpen(frame);
 return <main className={s.page}>
  <header className={s.header}>
   <p>STUDY / INKTRACE / PRESS RUN</p>
   <h1>Writing, as a print run.</h1>
   <p className={s.note}>400 × 250 grid at 2×. Scrub the run exactly as scrolling drives it on the homepage. At the end the two buttons are live: hover, focus or click them.</p>
  </header>
  <section className={s.sheet} aria-label="The run">
   <p className={s.frameTitle}>THE RUN — {Math.round(frame/RUN_FRAMES*100)}%</p>
   <div className={s.canvasBox}><div className={press.frame}><Sheet px={renderPress(frame,undefined,open?hover:null)} scale={2}/><WaysIn open={open} onHover={setHover}/></div></div>
   <input className={s.scrub} type="range" min={0} max={RUN_FRAMES} value={frame} aria-label="Scroll progress" onChange={e=>setFrame(+e.target.value)}/>
  </section>
  {FRAMES.map(f=><section key={f.key} className={s.sheet} aria-label={f.title}>
   <p className={s.frameTitle}>{f.title}</p>
   <div className={s.canvasBox}><Sheet px={drawPress(PRESS_FRAMES[f.key])} scale={2}/></div>
  </section>)}
 </main>;
}
