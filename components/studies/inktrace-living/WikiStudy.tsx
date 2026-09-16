'use client';
/* eslint-disable @next/next/no-img-element -- Local pixel assets must preserve nearest-neighbour dimensions and the live resize handle. */

import {useEffect,useRef,useState,useSyncExternalStore,type PointerEvent,type KeyboardEvent} from 'react';
import {motion} from 'framer-motion';
import {useLiveReducedMotion} from '../inktrace-living-review/use-live-reduced-motion';
import {WikiRuntime,type ImageLayout,type QuotePosition} from './wiki-runtime';
import WikiCanvas from './WikiCanvas';
import s from './WikiStudy.module.css';

const labels=['A page to begin with','Bring the map','Make room for the story','Let the words wrap','A voice in the margin','Put the voice in context','Follow a name','The page is yours'];
const instructions=['A quiet page, before the pieces come together.','Ivo brings a map from the workshop.','The illustration becomes smaller; the text finds its way around it.','One image, a different rhythm. Nothing is flattened.','Mara adds a line from her journal.','The quotation moves into the passage it belongs to.','A name leads to its record, without leaving the page.','Try the handles, rearrange the page, or follow another link.'];

export default function WikiStudy({still=false,embedded=false,controller}:{still?:boolean;embedded?:boolean;controller?:WikiRuntime}){
 const [localRuntime]=useState(()=>new WikiRuntime());
 const runtime=controller??localRuntime;
 const state=useSyncExternalStore(runtime.subscribe,runtime.getSnapshot,runtime.getSnapshot);
 const shownWidth=Math.round(runtime.getFrame().width);
 const reduced=useLiveReducedMotion(),quiet=still||reduced;
 const stage=useRef<HTMLDivElement>(null),paper=useRef<HTMLElement>(null),figure=useRef<HTMLElement>(null);
 const opener=useRef<HTMLButtonElement>(null),windowRef=useRef<HTMLDivElement>(null);
 const wasOpen=useRef(true),recordSource=useRef<HTMLButtonElement|null>(null);
 const [artFailed,setArtFailed]=useState(false);
 const drag=useRef<{id:number;x:number;width:number;container:number;direction:number}|null>(null);
 const motionOff=quiet||state.paused;
 const feedback=motionOff?{}:{whileHover:{y:-1},whileTap:{y:1},transition:{duration:.1}};
 useEffect(()=>{
  if(!state.open)opener.current?.focus({preventScroll:true});
  else if(!wasOpen.current)windowRef.current?.querySelector<HTMLButtonElement>('[aria-label="Close Wiki workshop"]')?.focus({preventScroll:true});
  wasOpen.current=state.open;
 },[state.open]);
 useEffect(()=>{if(figure.current)figure.current.style.width=`${state.width}%`;},[state.width]);
 const selectLayout=(layout:ImageLayout)=>runtime.layout(layout);
 const beginResize=(event:PointerEvent<HTMLButtonElement>)=>{
  if(!paper.current)return;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  const width=runtime.getFrame().width;runtime.resize(width);
  drag.current={id:event.pointerId,x:event.clientX,width,container:figure.current?.parentElement?.clientWidth??paper.current.clientWidth,direction:state.layout==='right'?-1:1};
 };
 const resizeMove=(event:PointerEvent<HTMLButtonElement>)=>{
  const d=drag.current;if(!d||d.id!==event.pointerId)return;
  runtime.resize(d.width+100*(event.clientX-d.x)*d.direction/d.container);
 };
 const keyResize=(event:KeyboardEvent<HTMLButtonElement>)=>{
  const current=Math.round(runtime.getFrame().width);
  const values:Record<string,number>={ArrowRight:current+5,ArrowUp:current+5,ArrowLeft:current-5,ArrowDown:current-5,Home:28,End:100};
  if(event.key in values){event.preventDefault();runtime.resize(values[event.key]);}
 };
 const moveQuote=(earlier:boolean)=>{
  const order:QuotePosition[]=['before','between','after'];
  const current=state.quote==='hidden'?2:order.indexOf(state.quote);
  runtime.quote(order[Math.max(0,Math.min(2,current+(earlier?-1:1)))]);
 };
 const quote=<blockquote key="quote" data-wiki-quote className={s.quote}><p>“We keep what the tide forgets.”</p><cite>— Mara, field journal</cite></blockquote>;
 const prose=[
  <p key="first" data-paragraph="first">A road follows the northern cliffs. The sea has kept its own names for this place.</p>,
  <p key="second" data-paragraph="second">Some arrive to leave things behind. Others come to find what was lost.</p>,
  <p key="third" data-paragraph="third"><button aria-label="Mara, open character record" className={s.inlineLink} onClick={event=>{recordSource.current=event.currentTarget;runtime.reference('mara');}}>Mara’s journal</button> links the journey to the <button aria-label="Outer Coast, open Wiki record" className={s.inlineLink} onClick={event=>{recordSource.current=event.currentTarget;runtime.reference('coast');}}>Outer Coast</button>.</p>,
 ];
 if(state.quote!=='hidden')prose.splice(state.quote==='before'?0:state.quote==='between'?1:3,0,quote);

 const Container=embedded?'div':'main';
 return <Container className={embedded?s.embedded:s.study}>
  {!embedded&&<aside className={s.intro}>
   <a className={s.back} href="/studies/inktrace/living-archive/review">← Art direction</a>
   <h1>INKTRACE</h1>
   <div className={s.introCopy}><span className={s.kicker}>04 / THE TYPESETTING WORKSHOP</span><h2>A world,<br/>one page<br/>at a time.</h2>
    <p>I build complex worlds. Their chapters, people, timelines and notes shouldn’t live in disconnected tools.</p>
    <p>InkTrace brings those pieces into one writing workspace.</p>
    <a className={s.visit} href="https://inktrace.app" target="_blank" rel="noreferrer">EXPLORE INKTRACE <span>↗</span></a>
   </div>
   <p className={s.note}>A playable interpretation.<br/>Sample world. No live AI.<br/>Entirely silent.</p>
  </aside>}
  <section className={s.paperColumn} aria-label="InkTrace interactive Wiki study">
   {!embedded&&<header className={s.brandRow}><span className={s.brand}>inktrace</span><span className={s.edition}>LIVING ARCHIVE<br/>LOCAL STUDY / 02</span></header>}
   <div className={s.content}>
    {!embedded&&<p className={s.lead}>Watch the page take shape. Or start editing it yourself.</p>}
    {!state.open?<div className={s.closed}><motion.button ref={opener} {...feedback} className={s.bookButton} aria-label="Open Wiki workshop" onClick={()=>runtime.open()}><img src="/studies/inktrace/pixel-world/book-rest-v04.png" width="192" height="168" alt=""/><span>Open the workshop ↗</span></motion.button></div>:
     <motion.div ref={windowRef} className={s.window} data-wiki-window data-mode={state.mode} data-paused={state.paused} initial={quiet||embedded?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:motionOff?0:.24,ease:[.22,.72,.2,1]}} onKeyDown={event=>{if(event.key==='Escape'&&!embedded){event.stopPropagation();runtime.close();}}}>
      {!embedded&&<><header className={s.titlebar}><span className={s.windowIcon} aria-hidden="true">▣</span><h2>InkTrace — Wiki</h2><motion.button {...feedback} className={s.close} aria-label="Close Wiki workshop" onClick={()=>runtime.close()}>×</motion.button></header>
      <div className={s.demoLabel}><span>FEATURE DEMO / SAMPLE CONTENT</span><span>04 / WIKI</span></div></>}
      <div ref={stage} className={s.stage} data-wiki-stage>
       <WikiCanvas runtime={runtime} quiet={quiet} stage={stage} paper={paper} figure={figure}/>
       <article ref={paper} className={s.manuscript} aria-label="The Northern Coast">
        <div className={s.pageNumber}><span>FIELD NOTES</span><span>IV / 313</span></div>
        <h3>The Northern Coast</h3>
        <div className={s.composition}>
         <figure ref={figure} data-wiki-image data-layout={state.layout} style={{float:state.layout==='wide'?'none':state.layout,width:`${state.width}%`}} className={s.illustration}>
          {artFailed?<div className={s.mapFallback}>Northern Coast — illustration unavailable</div>:<img ref={image=>{if(image?.complete&&image.naturalWidth===0)setArtFailed(true);}} src="/studies/inktrace/living-archive/wiki/coast-v01.webp" width="960" height="400" alt="Cobalt map of the fictional Northern Coast" draggable="false" onError={()=>setArtFailed(true)}/>}
          <figcaption>IVO / 312</figcaption>
          <button className={s.resize} role="slider" aria-label="Resize illustration" aria-valuemin={28} aria-valuemax={100} aria-valuenow={shownWidth} aria-valuetext={`${shownWidth} percent wide`} onPointerDown={beginResize} onPointerMove={resizeMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={keyResize}><span aria-hidden="true">◢</span></button>
         </figure>
         {prose}
        </div>
        <footer className={s.pageFooter}><span>THE OPEN ARCHIVE</span><span>— 04 —</span></footer>
       </article>
      </div>
      <section className={s.readingSlot} aria-label="Linked record" data-reading-slot>
       <div className={s.slotNumber}>↳<span>INDEX</span></div>
       <div className={s.record} aria-live="polite">
        {state.reference?<><span className={s.recordType}>{state.reference==='mara'?'CHARACTER FILE / 001':'WIKI / GEOGRAPHY'}</span><h3>{state.reference==='mara'?'Mara / The archivist':'Outer Coast / Region'}</h3><p>{state.reference==='mara'?'Keeps the records. Wants to know what the archive has left out.':'A northern shoreline, mapped by Ivo. Mara’s journal records the journey through it.'}</p></>:<><span className={s.recordType}>LINKED RECORDS LIVE HERE</span><h3>A name is a doorway.</h3><p>Select a linked name in the page.</p></>}
       </div>
       {state.reference&&<button aria-label="Close linked record" className={s.recordClose} onClick={()=>{runtime.reference(null);recordSource.current?.focus({preventScroll:true});}}>×</button>}
      </section>
      <div className={s.toolBar} role="group" aria-label="Page layout tools">
       <div className={s.toolGroup}><span>ILLUSTRATION</span><div>{(['wide','left','right'] as ImageLayout[]).map((layout,index)=><motion.button key={layout} {...feedback} aria-pressed={state.layout===layout} onClick={()=>selectLayout(layout)}><span key="glyph" aria-hidden="true" className={s.toolGlyph}>{['▤','▥','▥'][index]}</span><span key="label">{['Wide image','Wrap left','Wrap right'][index]}</span></motion.button>)}</div></div>
       <div className={s.toolGroup}><span>QUOTATION</span><div><motion.button {...feedback} aria-label="Move quotation earlier" onClick={()=>moveQuote(true)}>↑ Earlier</motion.button><motion.button {...feedback} aria-label="Move quotation later" onClick={()=>moveQuote(false)}>↓ Later</motion.button></div></div>
      </div>
      {!embedded&&<><div className={s.playback}>
       <div className={s.stepInfo} aria-live="polite"><p>{String(state.step+1).padStart(2,'0')} / {labels[state.step]}</p><span>{state.mode==='manual'?'Your edit / replay to watch again':quiet?'Motion is still / explore the key steps':state.paused?'Paused / your place is kept':instructions[state.step]}</span></div>
       <div className={s.transport}>
        {quiet?<><button aria-label="Previous key step" disabled={state.step===0} onClick={()=>runtime.step(state.step-1)}>← Step</button><button aria-label="Next key step" disabled={state.step===7} onClick={()=>runtime.step(state.step+1)}>Step →</button></>:<button aria-label={state.paused?'Continue demo':'Pause demo'} onClick={()=>runtime.pause(!state.paused)}>{state.paused?'▶ Continue':'Ⅱ Pause'}</button>}
        <button aria-label="Replay demonstration" onClick={()=>runtime.replay()}>↶ Replay</button>
       </div>
      </div>
      <div className={s.progress} aria-label={`Demonstration step ${state.step+1} of 8`}>{labels.map((label,index)=><span key={label} data-complete={index<=state.step}/>)}</div></>}
     </motion.div>}
    {!embedded&&<footer className={s.studyFooter}><p>One working scene first. The timeline, character courtyard and AI desk follow after this review.</p><a href="/studies/inktrace/living-archive/review">See the four concept boards ↗</a></footer>}
   </div>
  </section>
 </Container>;
}
