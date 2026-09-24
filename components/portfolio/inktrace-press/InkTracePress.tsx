'use client';
import {useEffect,useRef,useState} from 'react';
import {motion} from 'framer-motion';
import {useLiveReducedMotion} from '../../studies/inktrace-living-review/use-live-reduced-motion';
import {DUR} from '../motion';
import {INK_RGBA} from './palette';
import {PH,PW,QUESTION_CHARS,RUN_FRAMES,renderPress,waysInOpen} from './press';
import WaysIn from './WaysIn';
import s from './InkTracePress.module.css';

/** Each letter of the question lands this long after the last, the first time it is seen. */
const SET_MS=55;

/** The whole-number enlargement that fits, or a fraction of one where even 1× will not. */
export function fitScale(width:number,height:number){
 if(width<PW)return width/PW;
 return Math.max(1,Math.min(Math.floor(width/PW),Math.floor(height/PH)));
}

/** Scroll progress through a pinned run: 0 as it pins, 1 as it releases. */
export function runProgress(top:number,height:number,viewport:number){
 const travel=height-viewport;
 return travel>0?Math.max(0,Math.min(1,-top/travel)):1;
}

/** The homepage PROJECTS section: InkTrace as a print run the visitor scrolls through. */
export default function InkTracePress({still=false}:{still?:boolean}){
 const reduced=useLiveReducedMotion(),quiet=still||reduced;
 const section=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [scale,setScale]=useState(2),[open,setOpen]=useState(false),[hover,setHover]=useState<'try'|'built'|null>(null);
 const hoverRef=useRef(hover);
 const feedback=quiet?{}:{whileHover:{y:-1},whileTap:{y:1},transition:{duration:DUR.tap}};

 useEffect(()=>{
  const node=stage.current,paper=node?.parentElement,print=canvas.current;if(!node||!paper||!print||typeof ResizeObserver==='undefined')return;
  // Everything on the pinned screen that is not the print: the sheet's margins and
  // wordmark, plus (on phones) the intro above it.
  const measure=()=>{
   const chrome=(window.innerWidth<=700?(section.current?.querySelector('h2')?.parentElement?.offsetHeight??0):0)+paper.offsetHeight-print.offsetHeight;
   setScale(fitScale(node.clientWidth,window.innerHeight-chrome-8));
  };
  const observer=new ResizeObserver(measure);observer.observe(node);measure();
  return()=>observer.disconnect();
 },[]);

 // Hovering a way in reprints the sheet with that button inked.
 const repaint=useRef<()=>void>(()=>{});
 useEffect(()=>{hoverRef.current=hover;repaint.current();},[hover]);

 useEffect(()=>{
  const context=canvas.current?.getContext('2d'),root=section.current,sheet=stage.current;
  if(!context||!root||!sheet)return;
  let shown='',frame=0,set=0,raf=0,timer=0;
  const paint=()=>{
   const live=waysInOpen(frame),hovered=live?hoverRef.current:null;
   setOpen(live);
   const key=`${frame}:${set}:${hovered}`;if(key===shown)return;shown=key;
   const px=renderPress(frame,set,hovered),image=context.createImageData(PW,PH);
   for(let i=0;i<px.length;i++)image.data.set(INK_RGBA[px[i]],i*4);
   context.putImageData(image,0,0);
  };
  if(quiet){frame=RUN_FRAMES;set=QUESTION_CHARS;paint();repaint.current=paint;return;}
  const read=()=>{raf=0;const r=root.getBoundingClientRect();frame=Math.round(runProgress(r.top,r.height,window.innerHeight)*RUN_FRAMES);paint();};
  const onScroll=()=>{if(!raf)raf=requestAnimationFrame(read);};
  // The first time the sheet itself comes into view, the question is set letter by
  // letter. (Watch the sheet, not the run: the run is taller than any screen.)
  const setLetters=(start:number)=>(now:number)=>{set=Math.min(QUESTION_CHARS,Math.floor((now-start)/SET_MS)+1);paint();if(set<QUESTION_CHARS)timer=requestAnimationFrame(setLetters(start));};
  const seen=new IntersectionObserver(entries=>{
   if(!entries.some(e=>e.isIntersecting))return;
   seen.disconnect();timer=requestAnimationFrame(now=>setLetters(now)(now));
  },{threshold:.35});
  seen.observe(sheet);
  read();
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);
  repaint.current=paint;
  return()=>{seen.disconnect();cancelAnimationFrame(raf);cancelAnimationFrame(timer);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);};
 },[quiet]);

 return <section ref={section} id="work" aria-labelledby="work-title" data-inktrace-poster data-quiet={quiet} className={s.run}>
  <div className={s.pin}>
   <div className={s.intro}>
    <h2 id="work-title" className={s.title}>PROJECTS</h2>
    <div className={s.copy}><p>An independent<br/> space for creation.</p><motion.a {...feedback} className={s.visit} href="https://inktrace.app" target="_blank" rel="noopener noreferrer" aria-label="Visit Inktrace — opens in a new tab">VISIT INKTRACE.APP <span aria-hidden="true">↗</span></motion.a></div>
   </div>
   <div className={s.paper} data-poster-paper>
    <span className={s.registration} aria-hidden="true">+</span>
    <span className={s.brand} aria-hidden="true">inktrace</span>
    <div ref={stage} className={s.stage} data-print-stage data-playing={!quiet}>
     {/* The picture is the canvas; the two ways in sit beside it, not inside it, so they stay links. */}
     <div className={s.frame}>
      <canvas ref={canvas} width={PW} height={PH} className={s.canvas} style={{width:Math.round(PW*scale),height:Math.round(PH*scale)}} data-scale={scale} role="img" aria-label="A printed zine asks: what world is in your head? It cuts out the word WORLD and pastes a world together around it — a character, a place, a date on a timeline, the links between them, and a line written with AI — then answers: all of it, one sheet. The sheet folds into a book, and the InkTrace mark blooms out of it."/>
      <WaysIn open={quiet||open} onHover={setHover}/>
     </div>
    </div>
   </div>
  </div>
 </section>;
}
