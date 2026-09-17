'use client';

import {Fragment,useEffect,useId,useReducer,useRef,useState,type KeyboardEvent} from 'react';
import {AnimatePresence,motion,MotionConfig} from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {beat,durations,initialPlayback,playback,windowPose,type SceneIndex} from './playback';
import {captions,events,features,people} from './sample';
import ArchiveReveal from './ArchiveReveal';
import s from './PixelShowcase.module.css';

const asset='/studies/inktrace/pixel-world';
const ease=[.22,.72,.2,1] as const;
export default function PixelShowcase({still=false}:{still?:boolean}) {
 const [reduced,setReduced]=useState(false);
 const [motionPaused,setMotionPaused]=useState(false);
 const quiet=still||!!reduced||motionPaused;
 const [state,dispatch]=useReducer(playback,{...initialPlayback,still:quiet});
 const root=useRef<HTMLDivElement>(null),launcher=useRef<HTMLButtonElement>(null);
 const tabs=useRef<(HTMLButtonElement|null)[]>([]),closeButton=useRef<HTMLButtonElement>(null);
 const [onScreen,setOnScreen]=useState(true),[foreground,setForeground]=useState(true);
 const [failed,setFailed]=useState(false),[artFailed,setArtFailed]=useState(false);
 const [tabFocus,setTabFocus]=useState(0),[chosen,setChosen]=useState<number|null>(null);
 const [drawerDismissed,setDrawerDismissed]=useState(false),[person,setPerson]=useState(0);
 const [year,setYear]=useState(0),[scale,setScale]=useState<number|null>(null);
 const [confirmed,setConfirmed]=useState(false);
 const id=useId(),active=onScreen&&foreground;
 const frame=beat(state),open=state.phase!=='closed';
 const finished=state.elapsed>=durations[state.scene];
 const eventIndex=chosen??(state.scene===0&&frame===3&&!drawerDismissed?year*3+2:null);
 const transition={duration:quiet?0:.35,ease};
 const Presence=quiet?Fragment:AnimatePresence;
 useEffect(()=>{dispatch({type:'still',value:quiet});},[quiet]);
 useEffect(()=>{
  const query=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(query.matches);update();
  query.addEventListener('change',update);
  return()=>query.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  const observer=new IntersectionObserver(([entry])=>setOnScreen(entry.isIntersecting),{threshold:.08});
  if(root.current)observer.observe(root.current);
  const visibility=()=>setForeground(!document.hidden);visibility();
  document.addEventListener('visibilitychange',visibility);
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  if(!active||quiet||state.phase==='closed'||(state.phase==='open'&&(state.paused||finished)))return;
  let last=performance.now(),raf=0;
  const tick=(now:number)=>{const dt=now-last;if(dt>=(state.phase==='open'?32:0)){dispatch({type:'tick',dt:Math.min(dt,50),active:true});last=now;}raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[active,quiet,state.phase,state.paused,finished]);
 const previousPhase=useRef(state.phase);
 useEffect(()=>{
  if(state.phase==='closed'&&previousPhase.current!=='closed')launcher.current?.focus({preventScroll:true});
  if(state.phase==='open'&&previousPhase.current!=='open')closeButton.current?.focus({preventScroll:true});
  previousPhase.current=state.phase;
 },[state.phase]);
 function resetObjects(){setChosen(null);setDrawerDismissed(false);setScale(null);setConfirmed(false);setYear(0);setPerson(0);}
 function select(scene:SceneIndex){if(scene===state.scene)return;resetObjects();setTabFocus(scene);dispatch({type:'select',scene});}
 function close(){dispatch({type:'close'});}
 function tabKey(e:KeyboardEvent<HTMLButtonElement>,i:number){
  let n=i;
  if(e.key==='ArrowRight')n=(i+1)%4;else if(e.key==='ArrowLeft')n=(i+3)%4;else if(e.key==='Home')n=0;else if(e.key==='End')n=3;
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i as SceneIndex);return;}else return;
  e.preventDefault();setTabFocus(n);tabs.current[n]?.focus();
 }
 function readEvent(i:number){setChosen(i);setDrawerDismissed(false);if(!state.paused)dispatch({type:'pause'});}
 const pose=windowPose(state);
 const dateScale=scale??Math.min(frame,2);
 return <MotionConfig reducedMotion={quiet?'always':'user'} transition={transition}>
  <main className={s.study} data-still={quiet} data-active={active}>
   <aside className={s.intro}>
    <Link className={s.back} href="/#work" prefetch={false}>← JACKIE / WORK</Link><h1>INKTRACE</h1>
    <div className={s.copy}><p className={s.positioning}>A writing workspace<br/>for connected stories.</p><p>I build worlds before I write their stories. InkTrace brings the chapters, characters, timelines and world notes into one connected place.</p>
     <motion.a className={s.visit} aria-label="Visit InkTrace" href="https://inktrace.app" target="_blank" rel="noopener noreferrer" whileHover={{x:quiet?0:3}}>EXPLORE INKTRACE <span>↗</span></motion.a>
    </div><p className={s.marginNote}>A small world to open.<br/>A larger one to write.</p><span className={s.studyNote}>INTERACTIVE ART STUDY / B</span>
   </aside>
   <section className={s.paper} aria-label="InkTrace interactive archive">
    <div className={s.brand} aria-hidden="true">inktrace</div>
    <div ref={root} className={s.stage} data-phase={state.phase} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();close();}}}>
     <div className={s.rest} hidden={state.phase==='open'} aria-hidden={open} style={{opacity:pose.bookOpacity,transform:`scale(${pose.bookScale})`,pointerEvents:open?'none':undefined}}>
      <span className={s.registration} aria-hidden="true">+</span>
      <motion.button ref={launcher} className={s.launcher} tabIndex={open?-1:0} aria-label="Open InkTrace demo" aria-expanded={open} onClick={()=>{resetObjects();setTabFocus(0);dispatch({type:'open'});}} whileTap={{y:quiet?0:2}}>
       {failed?<span className={s.bookFallback} aria-hidden="true">▱│▱</span>:<span className={s.sprite}><Image unoptimized width={768} height={84} src={`${asset}/book-sheet-v04.png`} alt="" onError={()=>setFailed(true)}/></span>}
       <span className={s.launchText}>OPEN THE ARCHIVE <span aria-hidden="true">↗</span></span>
      </motion.button><p>Stories are made of connections.</p><span className={s.restFoot}>CHAPTERS / PEOPLE / WORLDS / TIME</span>
     </div>
     {open&&<section className={s.window} role="region" aria-label="InkTrace feature demo" data-phase={state.phase} style={{clipPath:state.phase==='open'?undefined:`inset(${(1-pose.height)*50}% ${(1-pose.width)*50}%)`,opacity:pose.frameOpacity}}>
      {state.phase!=='open'&&<div aria-hidden="true" className={s.tracingFrame} style={{inset:`${(1-pose.height)*50}% ${(1-pose.width)*50}%`}}/>}
      <div inert={state.phase!=='open'} style={{opacity:pose.contentOpacity}}>
      <header className={s.titlebar}><span aria-hidden="true">▣</span><h2>InkTrace — {features[state.scene]}</h2><button ref={closeButton} aria-label="Close InkTrace demo" onClick={close}>×</button></header>
      <div className={s.world} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${state.scene}`}>
       {!artFailed?<Image unoptimized width={1536} height={1024} className={s.worldArt} src={`${asset}/archive-world-v01.png`} alt="A miniature archive built from books and paper drawers, with three people standing on an open book." onError={()=>setArtFailed(true)}/>:<div className={s.artFallback}>The archive illustration could not load.<br/>The story records below still work.</div>}
        <ArchiveReveal key={state.scene} kind="scene" className={s.scene} quiet={quiet} active={active&&state.phase==='open'}>
         {state.scene===0&&<>
          <div className={s.worldLabel}>THE OPEN ARCHIVE <span>/{312+year}</span></div>
          <svg className={s.route} viewBox="0 0 1500 1000" aria-hidden="true"><path d="M 310 570 H 350 V 535 H 385 V 505 H 415 V 530 H 560 V 590 H 740 V 545 H 850 V 475 H 1010"/><path className={s.routeLive} style={{strokeDashoffset:quiet?0:1050*(1-Math.min(1,state.elapsed/5000)),transition:quiet||!active||state.paused?'none':'stroke-dashoffset 45ms linear'}} d="M 310 570 H 350 V 535 H 385 V 505 H 415 V 530 H 560 V 590 H 740 V 545 H 850 V 475 H 1010"/></svg>
          <div className={s.eventObjects}>{events.slice(year*3,year*3+3).map((event,i)=><motion.button key={event.id} className={`${s.eventPin} ${s[`pin${i}`]}`} data-selected={eventIndex===year*3+i} aria-label={`Read event: ${event.title}`} aria-expanded={eventIndex===year*3+i} onClick={()=>readEvent(year*3+i)} style={{opacity:quiet||state.paused?1:Math.min(1,Math.max(0,(state.elapsed-i*85)/260))}} whileHover={{y:quiet?0:-2}} whileTap={{y:quiet?0:1}} transition={{duration:.12}}><ArchiveReveal inline key={dateScale} className={s.eventDate} quiet={quiet} active={active}>{dateScale===0?event.year:dateScale===1?`${event.year} / ${event.month}`:`${event.day} · ${['MAR','JUN','SEP','JAN','APR','NOV'][year*3+i]} · ${event.year}`}</ArchiveReveal><strong>{event.title}</strong><i aria-hidden="true"/></motion.button>)}</div>
          <div className={s.peopleNames} aria-hidden="true"><span>Mara</span><span>Ivo</span><span>Sen</span></div>
          <Presence>{eventIndex!==null&&<ArchiveReveal key={eventIndex} label="Event archive" className={s.drawer} kind="paper" quiet={quiet} active={active}>
           <div className={s.drawerTab}>EVENT RECORD <button aria-label="Put away event" onClick={()=>{setChosen(null);setDrawerDismissed(true);}}>×</button></div>
           <ArchiveReveal quiet={quiet} active={active}><p className={s.recordDate}>{events[eventIndex].year} / {events[eventIndex].month} / {events[eventIndex].day}</p>
           <h3>{events[eventIndex].title}</h3><p>{events[eventIndex].summary}</p><dl><dt>PEOPLE</dt><dd>{events[eventIndex].people}</dd><dt>CONNECTED WRITING</dt><dd>{events[eventIndex].chapter}</dd></dl></ArchiveReveal><span className={s.drawerHandle} aria-hidden="true"/>
          </ArchiveReveal>}</Presence>
         </>}
         {state.scene===1&&<>
          <div className={s.worldLabel}>PEOPLE IN THIS STORY</div><svg className={s.route} viewBox="0 0 1500 1000" aria-hidden="true"><path className={s.relation} d={person===0?'M 410 615 V 460 H 750 V 640 M 410 460 H 1010 V 640':person===1?'M 750 640 V 460 H 410 V 615 M 750 460 H 1010 V 640':'M 1010 640 V 460 H 410 V 615 M 750 640 V 460 H 1010'}/></svg>
          <div className={s.characterObjects}>{people.map((p,i)=><motion.button key={p.name} className={`${s.character} ${s[`character${i}`]}`} aria-pressed={person===i} onClick={()=>{setPerson(i);if(!state.paused)dispatch({type:'pause'});}} whileHover={{y:quiet?0:-3}}><span>{p.name}</span><small>{p.role}</small></motion.button>)}</div>
          <ArchiveReveal key={person} className={s.drawer} kind="paper" quiet={quiet} active={active}><div className={s.drawerTab}>CHARACTER FILE</div><ArchiveReveal quiet={quiet} active={active}><h3>{people[person].name}</h3><p>{people[person].note}</p><dl><dt>RELATIONSHIPS</dt><dd>{people[person].links}</dd><dt>APPEARANCES</dt><dd>{people[person].chapter}</dd></dl></ArchiveReveal><span className={s.drawerHandle}/></ArchiveReveal>
         </>}
         {state.scene===2&&<ArchiveReveal className={s.folio} kind="paper" quiet={quiet} active={active}>
          <div className={s.folioTab}>AI / A PROPOSAL, NOT AN AUTOPILOT</div><p className={s.request}>“Organise the characters and draw their relationships.”</p>
          {frame>0&&<ArchiveReveal className={s.graph} quiet={quiet} active={active}><svg viewBox="0 0 400 105" aria-hidden="true"><path d="M 55 30 H 200 V 80 H 345 V 30 H 55 M 200 80 V 30"/></svg><span>Mara</span><span>Ivo</span><span>Sen</span><small>collaborator / guide / mentor</small></ArchiveReveal>}
          {frame===0&&<p className={s.folioNote}>A request based on this archive’s existing characters.</p>}{frame===1&&<p className={s.folioNote}>3 characters · 3 existing connections<br/>A board preview, not a saved change.</p>}
          {frame>=2&&!confirmed&&frame<3&&<><p className={s.confirmation}>Waiting for your confirmation</p><button className={s.blueButton} onClick={()=>{setConfirmed(true);if(!state.paused)dispatch({type:'pause'});}}>CREATE THIS BOARD ↗</button></>}
          {(confirmed||frame===3)&&<p className={s.confirmation}>Board created in this demo</p>}
         </ArchiveReveal>}
         {state.scene===3&&<article className={`${s.folio} ${s.wiki}`}>
          <div className={s.folioTab}>WORLD NOTES / THE OPEN ARCHIVE</div><h3>The archive at the edge of the sea.</h3>
          {frame>0&&<motion.div layout className={s.wikiIllustration} style={{float:frame>1?'right':'none',width:frame>1?'38%':'100%',height:frame>1?95:80}} aria-label="Pixel archive illustration"/>}
          <p>Every voyage leaves something behind. Maps, letters and half-finished stories find their way into these drawers.</p>{frame>1&&<ArchiveReveal quiet={quiet} active={active}><blockquote>“A world is larger than the page that holds it.”</blockquote></ArchiveReveal>}
          <p className={s.wikiLink}>Kept by <button onClick={()=>{select(1);setPerson(0);}}>Mara, the archivist ↗</button></p>{frame===3&&<ArchiveReveal className={s.referenceCard} quiet={quiet} active={active}><strong>Mara</strong><span>The archivist · appears in Chapters I, III & VI</span></ArchiveReveal>}
         </article>}
        </ArchiveReveal>
      </div>
      <div className={s.navigation}>
       <div className={s.tabs} role="tablist" aria-label="Archive features">{features.map((name,i)=><button key={name} ref={el=>{tabs.current[i]=el;}} id={`${id}-tab-${i}`} role="tab" aria-controls={`${id}-panel`} aria-selected={state.scene===i} tabIndex={tabFocus===i?0:-1} onKeyDown={e=>tabKey(e,i)} onClick={()=>select(i as SceneIndex)}><span className={s.tabNumber} aria-hidden="true">0{i+1}</span>{name}</button>)}</div>
       {state.scene===0&&<div className={s.timelineTools}><button aria-label="Change archive year" onClick={()=>{setYear(y=>1-y);setChosen(null);setDrawerDismissed(true);if(!state.paused)dispatch({type:'pause'});}}>{312+year} ▾</button>{['Year','Month','Day'].map((name,i)=><button key={name} aria-pressed={(scale??Math.min(frame,2))===i} onClick={()=>{setScale(i);if(!state.paused)dispatch({type:'pause'});}}>{name}</button>)}</div>}
      </div>
      <div className={s.caption}><span aria-hidden="true">↳</span><ArchiveReveal key={`${state.scene}-${frame}`} quiet={quiet} active={active}><p>{captions[state.scene][frame]}</p></ArchiveReveal></div>
      <footer className={s.controls}><div className={s.transport}>
       {quiet?<button aria-label="Next keyframe" disabled={frame===3} onClick={()=>dispatch({type:'step'})}>Step →</button>:<button aria-label={state.paused?'Continue demo':'Pause demo'} disabled={finished} aria-pressed={state.paused} onClick={()=>dispatch({type:'pause'})}>{finished?'✓ Complete':state.paused?'▶ Continue':'Ⅱ Pause'}</button>}
       <button aria-label="Replay feature" onClick={()=>{resetObjects();dispatch({type:'replay'});}}>↺ Replay</button></div><span className={s.demoLabel}>FEATURE DEMO / SAMPLE CONTENT</span>
       <div className={s.pageControls}><button aria-label="Previous feature" disabled={state.scene===0} onClick={()=>select((state.scene-1) as SceneIndex)}>←</button><span>0{state.scene+1} / 04</span><button aria-label="Next feature" disabled={state.scene===3} onClick={()=>select((state.scene+1) as SceneIndex)}>→</button></div><div className={s.progress} aria-hidden="true"><span style={{width:`${state.elapsed/durations[state.scene]*100}%`}}/></div>
      </footer>
      </div>
     </section>}
    </div>
    <div className={s.paperFooter}><span>INKTRACE / STORIES CONNECT HERE.</span><button aria-pressed={motionPaused} onClick={()=>setMotionPaused(x=>!x)}>{quiet?'STATIC / STEP THROUGH':'Ⅱ PAUSE MOTION'}</button></div>
   </section>
  </main>
 </MotionConfig>;
}
