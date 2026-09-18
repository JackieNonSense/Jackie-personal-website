'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {motion} from 'framer-motion';
import {useLiveReducedMotion} from '../inktrace-living-review/use-live-reduced-motion';
import {ArchiveRuntime,type SceneId} from './archive-runtime';
import {WikiRuntime} from './wiki-runtime';
import {SCENES} from './archive-data';
import ArchiveScene from './ArchiveScene';
import WikiStudy from './WikiStudy';
import {SceneSelection,prepareScene} from './scene-assets';
import s from './LivingArchive.module.css';
import w from './WikiStudy.module.css';
import p from './InkTracePoster.module.css';
import {DUR, EASE} from '../../portfolio/motion';

export default function LivingArchive({still=false,embedded=false}:{still?:boolean;embedded?:boolean}){
 const [runtime]=useState(()=>{const r=new ArchiveRuntime();r.close();return r;}),[wiki]=useState(()=>new WikiRuntime());
 const state=useSyncExternalStore(runtime.subscribe,runtime.getSnapshot,runtime.getSnapshot),wikiState=useSyncExternalStore(wiki.subscribe,wiki.getSnapshot,wiki.getSnapshot);
 const reduced=useLiveReducedMotion(),quiet=still||reduced;
 const current=state.scene==='wiki'?wikiState:state,def=SCENES.find(d=>d.id===state.scene)!;
 const [held,setHeld]=useState(false),[tabFocus,setTabFocus]=useState<SceneId>('timeline');
 const book=useRef<HTMLButtonElement>(null),bookArt=useRef<HTMLSpanElement>(null),closeButton=useRef<HTMLButtonElement>(null),tabs=useRef<(HTMLButtonElement|null)[]>([]);
 const previousOpen=useRef(false);
 const [selection]=useState(()=>new SceneSelection());
 const [pending,setPending]=useState(false);
 useEffect(()=>{SCENES.forEach(scene=>prepareScene(scene.id));return()=>selection.cancel();},[selection]);
 const feedback=quiet||held?{}:{whileHover:{y:-1},whileTap:{y:1},transition:{duration:DUR.tap}};
 useEffect(()=>{
  if(previousOpen.current===state.open)return;
  previousOpen.current=state.open;
  if(state.open)closeButton.current?.focus({preventScroll:true});else book.current?.focus({preventScroll:true});
 },[state.open]);
 useEffect(()=>{
  if(state.open||quiet||held||!bookArt.current)return;
  let raf=0,previous=0,time=0,visible=false,disposed=false;
  const draw=(now:number)=>{raf=0;if(disposed||document.hidden||!visible)return;if(previous&&now-previous<100)time+=now-previous;previous=now;const cycle=time%8000,frame=cycle<1300?Math.min(7,Math.floor(cycle/163)):0;bookArt.current!.style.backgroundPosition=`${-frame*192}px 0`;raf=requestAnimationFrame(draw);};
  const sync=()=>{cancelAnimationFrame(raf);raf=0;previous=0;if(!document.hidden&&visible)raf=requestAnimationFrame(draw);};
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;sync();});observer.observe(bookArt.current);document.addEventListener('visibilitychange',sync);
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',sync);};
 },[state.open,quiet,held]);
 const select=(id:SceneId)=>{setTabFocus(id);setPending(true);selection.request(id,prepareScene(id),chosen=>{const paused=runtime.getSnapshot().paused;runtime.select(chosen);wiki.replay();wiki.pause(paused);setPending(false);});};
 const open=()=>select('timeline');
 const close=()=>{selection.cancel();setPending(false);runtime.close();wiki.close();};
 const pause=()=>{const next=!held;setHeld(next);runtime.pause(next);wiki.pause(next);};
 const replay=()=>{if(state.scene==='wiki'){wiki.replay();wiki.pause(held);}else runtime.replay();};
 const step=(delta:number)=>{if(state.scene==='wiki')wiki.step(current.step+delta);else runtime.step(current.step+delta);};
 const tabKey=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{const keys:Record<string,number>={ArrowRight:(index+1)%4,ArrowLeft:(index+3)%4,Home:0,End:3};if(event.key in keys){event.preventDefault();const next=keys[event.key];setTabFocus(SCENES[next].id);tabs.current[next]?.focus();}};
 const sceneName=def.name;
 const archiveWindow=state.open?<motion.div role={embedded?'dialog':undefined} aria-modal={embedded?false:undefined} aria-label={embedded?`InkTrace — ${sceneName}`:undefined} aria-description={embedded?'An interactive feature demonstration using independent sample content.':undefined} className={`${w.window} ${s.window} ${embedded?p.dialog:''}`} data-living-window data-scene={state.scene} data-mode={current.mode} data-paused={held} initial={quiet?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:quiet?0:DUR.base,ease:EASE}} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();close();}}}>
  <header className={w.titlebar}><span className={w.windowIcon} aria-hidden="true">▣</span><h2>InkTrace — {sceneName}</h2><motion.button {...feedback} ref={closeButton} className={w.close} aria-label="Close Living Archive" onClick={close}>×</motion.button></header>
  {!embedded&&<div className={w.demoLabel}><span>FEATURE DEMO / SAMPLE CONTENT</span><span>{pending?'Loading scene…':`${String(SCENES.findIndex(d=>d.id===state.scene)+1).padStart(2,'0')} / ${sceneName.toUpperCase()}`}</span></div>}
  <motion.div key={state.scene} role="tabpanel" id={`panel-${state.scene}`} aria-labelledby={`tab-${state.scene}`} className={`${s.scenePanel} ${embedded?p.sceneViewport:''}`} initial={quiet||held?false:{opacity:.4,x:6}} animate={{opacity:1,x:0}} transition={{duration:quiet||held?0:DUR.slow,ease:EASE}}>
   {state.scene==='wiki'?<WikiStudy embedded controller={wiki} still={quiet}/>:<ArchiveScene runtime={runtime} quiet={quiet}/>}
  </motion.div>
  <div role="tablist" aria-label="Archive scenes" className={s.tabs}>{SCENES.map((d,i)=><motion.button {...feedback} key={d.id} ref={element=>{tabs.current[i]=element;}} id={`tab-${d.id}`} role="tab" aria-selected={state.scene===d.id} aria-controls={`panel-${d.id}`} tabIndex={tabFocus===d.id?0:-1} onKeyDown={event=>tabKey(event,i)} onClick={()=>select(d.id)}><span key="number">{String(i+1).padStart(2,'0')}</span><span key="name" className={s.tabName}>{d.name}</span></motion.button>)}</div>
  <div className={w.playback}>
   <div className={w.stepInfo} aria-live="polite"><p>{String(current.step+1).padStart(2,'0')} / {def.steps[current.step]}</p><span>{current.mode==='manual'?'Your edit / replay to watch again':quiet?'Motion is still / explore the key steps':held?'Paused / your place is kept':current.mode==='ended'?'Take your time. The scene is yours.':'Watch the scene unfold, or choose something to take over.'}</span></div>
   <div className={w.transport}>{quiet?<><motion.button {...feedback} aria-label="Previous key step" disabled={current.step===0} onClick={()=>step(-1)}>← Step</motion.button><motion.button {...feedback} aria-label="Next key step" disabled={current.step===def.steps.length-1} onClick={()=>step(1)}>Step →</motion.button></>:<motion.button {...feedback} aria-label={held?'Continue demo':'Pause demo'} onClick={pause}>{held?'▶ Continue':'Ⅱ Pause'}</motion.button>}<motion.button {...feedback} aria-label="Replay demonstration" onClick={replay}>↶ Replay</motion.button></div>
  </div>
  <div className={w.progress} style={{gridTemplateColumns:`repeat(${def.steps.length},1fr)`}} aria-label={`Demonstration step ${current.step+1} of ${def.steps.length}`}>{def.steps.map((label,i)=><span key={label} data-complete={i<=current.step}/>)}</div>
 </motion.div>:null;
 if(embedded)return <>
  <section id="work" aria-labelledby="work-title" data-embedded data-inktrace-poster className={p.poster}>
   <div className={p.intro}>
    <h2 id="work-title" className={p.title}>PROJECTS</h2>
    <div className={p.copy}><p>An independent<br/> space for creation.</p><motion.a {...feedback} className={p.visit} href="https://inktrace.app" target="_blank" rel="noopener noreferrer" aria-label="Visit Inktrace — opens in a new tab">VISIT INKTRACE.APP <span aria-hidden="true">↗</span></motion.a></div>
   </div>
   <div className={p.paper} data-poster-paper>
    <span className={p.registration} aria-hidden="true">+</span>
    <span className={p.brand} aria-hidden="true">inktrace</span>
    <div className={p.bookStage}><motion.button {...feedback} ref={book} className={p.bookButton} aria-label="Open the Living Archive" aria-expanded={state.open} aria-busy={pending} onClick={open}><span ref={bookArt} className={s.bookArt} aria-hidden="true"/><span className={p.bookRule} aria-hidden="true"/></motion.button></div>
   </div>
  </section>
  {archiveWindow&&createPortal(<div className={`${w.study} ${s.archive} ${p.overlay}`}>{archiveWindow}</div>,document.body)}
 </>;
 const Container=embedded?'section':'main',Title=embedded?'h2':'h1';
 return <Container id={embedded?'work':undefined} aria-labelledby={embedded?'work-title':undefined} data-embedded={embedded||undefined} className={`${w.study} ${s.archive}`}>
  <aside className={w.intro}>
   {embedded?<span className={w.back}>01 / SELECTED WORK</span>:<a className={w.back} href="/studies/inktrace/living-archive/review">← Art direction</a>}<Title id={embedded?'work-title':undefined} data-archive-title>INKTRACE</Title>
   <div className={w.introCopy}><span className={w.kicker}>THE LIVING ARCHIVE</span><h2>A world,<br/>in the<br/>making.</h2><p>I build complex worlds. Their chapters, people, timelines and notes shouldn’t live in disconnected tools.</p><p>InkTrace brings those pieces into one writing workspace.</p><motion.a {...feedback} className={w.visit} href="https://inktrace.app" target="_blank" rel="noopener noreferrer" aria-label={embedded?'Visit Inktrace — opens in a new tab':undefined}>EXPLORE INKTRACE <span>↗</span></motion.a></div>
   <p className={w.note}>A playable interpretation.<br/>Sample world. No live AI.<br/>Entirely silent.</p>
  </aside>
  <section className={w.paperColumn} aria-label="InkTrace Living Archive">
   <header className={w.brandRow}><span className={w.brand}>inktrace</span><span className={w.edition}>FOUR SCENES<br/>ONE CONNECTED WORLD</span></header>
   <div className={w.content}>
    <p className={w.lead}>A small archive, waiting to be opened.</p>
    {!state.open?<div className={s.bookStage}><motion.button {...feedback} ref={book} className={w.bookButton} aria-label="Open the Living Archive" aria-busy={pending} onClick={open}><span key="book" ref={bookArt} className={s.bookArt} aria-hidden="true"/><span key="label">{pending?'Opening…':'Open the Living Archive ↗'}</span></motion.button><p>Time. People. Connections. Places.</p><button className={s.bookPause} onClick={pause}>{held?'Resume book animation':'Pause book animation'}</button></div>:
     archiveWindow}
    <footer className={w.studyFooter}><p>Four little worlds. Every record stays connected.<br/>Independent example content — not a product recording.</p>{embedded?<motion.a {...feedback} href="#about">THE PERSON BEHIND IT ↓</motion.a>:<a href="/studies/inktrace/living-archive/wiki">Original Wiki study ↗</a>}</footer>
   </div>
  </section>
 </Container>;
}
