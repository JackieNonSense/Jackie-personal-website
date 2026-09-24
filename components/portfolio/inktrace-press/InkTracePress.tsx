'use client';
import {useEffect,useRef,useState} from 'react';
import {motion} from 'framer-motion';
import {useLiveReducedMotion} from '../../studies/inktrace-living-review/use-live-reduced-motion';
import {DUR} from '../motion';
import {INK_RGBA} from './palette';
import {PH,PLAY_MS,PW,QUESTION_CHARS,RUN_FRAMES,playhead,renderPress,waysInOpen} from './press';
import WaysIn from './WaysIn';
import s from './InkTracePress.module.css';

/** The whole-number enlargement that fits, or a fraction of one where even 1× will not. */
export function fitScale(width:number,height:number){
 if(width<PW)return width/PW;
 return Math.max(1,Math.min(Math.floor(width/PW),Math.floor(height/PH)));
}

/** The homepage PROJECTS section: InkTrace as a print run that plays itself once the
 *  sheet is in view. The page is never held; the run pauses while it is scrolled away. */
export default function InkTracePress({still=false}:{still?:boolean}){
 const reduced=useLiveReducedMotion(),quiet=still||reduced;
 const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [scale,setScale]=useState(2),[open,setOpen]=useState(false),[done,setDone]=useState(false),[hover,setHover]=useState<'try'|'built'|null>(null);
 const hoverRef=useRef(hover);
 const repaint=useRef<()=>void>(()=>{}),replay=useRef<()=>void>(()=>{});
 const feedback=quiet?{}:{whileHover:{y:-1},whileTap:{y:1},transition:{duration:DUR.tap}};

 useEffect(()=>{
  const node=stage.current,paper=node?.parentElement,print=canvas.current;if(!node||!paper||!print||typeof ResizeObserver==='undefined')return;
  // The print is enlarged as far as the screen allows around the sheet's margins and wordmark.
  const measure=()=>setScale(fitScale(node.clientWidth,window.innerHeight-(paper.offsetHeight-print.offsetHeight)-8));
  const observer=new ResizeObserver(measure);observer.observe(node);measure();
  return()=>observer.disconnect();
 },[]);

 // Hovering a way in reprints the sheet with that button inked.
 useEffect(()=>{hoverRef.current=hover;repaint.current();},[hover]);

 useEffect(()=>{
  const context=canvas.current?.getContext('2d'),sheet=stage.current;
  if(!context||!sheet)return;
  let shown='',frame=0,set=0;
  const paint=()=>{
   const live=waysInOpen(frame),hovered=live?hoverRef.current:null;
   setOpen(live);
   const key=`${frame}:${set}:${hovered}`;if(key===shown)return;shown=key;
   const px=renderPress(frame,set,hovered),image=context.createImageData(PW,PH);
   for(let i=0;i<px.length;i++)image.data.set(INK_RGBA[px[i]],i*4);
   context.putImageData(image,0,0);
  };
  repaint.current=paint;
  if(quiet){frame=RUN_FRAMES;set=QUESTION_CHARS;setDone(true);paint();return;}

  // The performance: time only runs while the sheet is on screen.
  setDone(false);
  let elapsed=0,last=0,raf=0,visible=false,started=false;
  const tick=(now:number)=>{
   elapsed+=now-last;last=now;
   ({set,frame}=playhead(elapsed));paint();
   if(elapsed>=PLAY_MS){raf=0;setDone(true);return;}
   raf=requestAnimationFrame(tick);
  };
  const run=()=>{if(raf||elapsed>=PLAY_MS)return;last=performance.now();raf=requestAnimationFrame(tick);};
  const halt=()=>{cancelAnimationFrame(raf);raf=0;};
  replay.current=()=>{halt();elapsed=0;setDone(false);({set,frame}=playhead(0));paint();if(visible)run();};
  paint();
  const seen=new IntersectionObserver(entries=>{
   const entry=entries[entries.length-1];
   visible=entry.isIntersecting;
   if(entry.intersectionRatio>=.35)started=true;
   if(visible&&started)run();else halt();
  },{threshold:[0,.35]});
  seen.observe(sheet);
  return()=>{seen.disconnect();halt();};
 },[quiet]);

 return <section id="work" aria-labelledby="work-title" data-inktrace-poster data-quiet={quiet} className={s.run}>
  <div className={s.layout}>
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
    {done&&!quiet&&<button type="button" className={s.reprint} onClick={()=>replay.current()}>↻ REPRINT</button>}
   </div>
  </div>
 </section>;
}
