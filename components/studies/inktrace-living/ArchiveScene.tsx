'use client';
import {useRef,useSyncExternalStore} from 'react';
import {motion} from 'framer-motion';
import {ArchiveRuntime} from './archive-runtime';
import {EVENTS,PEOPLE,RELATIONS} from './archive-data';
import ArchiveCanvas from './ArchiveCanvas';
import s from './LivingArchive.module.css';
import w from './WikiStudy.module.css';
export default function ArchiveScene({runtime,quiet}:{runtime:ArchiveRuntime;quiet:boolean}){
 const state=useSyncExternalStore(runtime.subscribe,runtime.getSnapshot,runtime.getSnapshot),stage=useRef<HTMLDivElement>(null);
 const feedback=quiet||state.paused?{}:{whileHover:{y:-1},whileTap:{y:1},transition:{duration:.1}};
 const event=EVENTS.find(e=>e.id===state.event),person=PEOPLE.find(p=>p.id===state.person);
 const activeEvents=EVENTS.filter(e=>e.year===state.year);
 const timeline=state.scene==='timeline',people=state.scene==='characters';
 return <>
  <div ref={stage} className={`${s.scene} ${s[state.scene]}`} data-archive-stage data-scene={state.scene} data-step={state.step}>
   <ArchiveCanvas runtime={runtime} quiet={quiet} stage={stage}/>
   {timeline?<div className={s.scrollControls} data-safe-area="timeline">
    <div className={s.years}>{[312,313].map(year=><motion.button {...feedback} key={year} aria-label={`Year ${year}`} aria-expanded={state.year===year} className={state.year===year?s.selected:''} onClick={()=>runtime.year(year)}><span key="year">{year}</span><small key="count">3 records {state.year===year?'−':'+'}</small></motion.button>)}</div>
    {state.year!==null&&<div className={s.months} role="group" aria-label={`Months in ${state.year}`}>{activeEvents.map(e=><motion.button {...feedback} key={e.month} aria-pressed={state.month===e.month} onClick={()=>runtime.month(e.month)}>{e.monthName}</motion.button>)}</div>}
    {state.month&&<div className={s.eventList} role="group" aria-label="Dated events">{activeEvents.filter(e=>e.month===state.month).map(e=><motion.button {...feedback} key={e.id} aria-pressed={state.event===e.id} onClick={()=>runtime.event(e.id)}><span key="date" className={s.date}>{e.day} / {e.month} / {e.year}</span><span key="title">{e.title}</span><span key="arrow" aria-hidden="true">↳</span></motion.button>)}</div>}
   </div>:people?<>
    <div className={s.doorLabels} aria-hidden="true"><span>RECORDS</span><span>MAPS</span><span>JOURNEYS</span></div>
    {PEOPLE.map((p,i)=><button key={p.id} data-person={i} className={s.personTarget} aria-label={`${p.name}, view character`} aria-pressed={state.person===p.id} onClick={()=>runtime.person(p.id)} style={{left:`${24+i*26}%`,top:'50%'}}><span>{p.name}</span></button>)}
    {state.person&&<div className={s.relationshipLabels} aria-label="Existing relationships"><span>Mara — Ivo / collaborator</span><span>Mara — Sen / guide</span></div>}
   </>:<>
    <p className={s.request}><span data-request>Organise people and connections.</span><span aria-hidden="true" className={s.caret}>_</span></p>
    {PEOPLE.map((p,i)=><button key={p.id} className={s.aiNode} data-ai-node={i} aria-label={`${p.name}, view source record`} style={{left:`${28+i*22}%`,top:'29%',visibility:state.step>=i+1?'visible':'hidden'}} onClick={()=>runtime.person(p.id)}>{p.name}</button>)}
    {state.step>=4&&<div className={s.aiRelations}><span>collaborator</span><span>guide</span></div>}
   </>}
  </div>
  <section className={`${w.readingSlot} ${s.slot}`} aria-label="Archive reading slot" data-reading-slot>
   <div className={w.slotNumber}>↳<span>{timeline?'RECORD':people?'INDEX':'PREVIEW'}</span></div>
   <div className={w.record} aria-live="polite">
    {timeline?(event?<><span className={w.recordType}>{event.day} / {event.month} / {event.year} · CHAPTER {event.chapter}</span><h3>{event.title}</h3><p>{event.text}</p><p className={s.connections}>{event.people.map(id=>PEOPLE.find(p=>p.id===id)!.name).join(' + ')} / connected people</p></>:<><span className={w.recordType}>TWO YEARS / SIX RECORDS</span><h3>{state.month?'Choose the dated record':state.year?`Inside year ${state.year}`:'A whole world. A single moment.'}</h3><p>{state.year?'Open a month, then choose an event. Its people and chapter arrive here.':'Unfold a year to move from the world’s history into a particular story.'}</p></>):people?(person?<><span className={w.recordType}>{person.role}</span><h3>{person.name}</h3><p>{person.note}</p><p className={s.connections}>{RELATIONS.filter(r=>r.from===person.id||r.to===person.id).map(r=>`${PEOPLE.find(p=>p.id===(r.from===person.id?r.to:r.from))!.name} / ${r.label}`).join(' · ')}</p><p>CHAPTERS {person.chapters}</p></>:<><span className={w.recordType}>THREE LIVES / ONE STORY</span><h3>People make a world.</h3><p>Select a person. Their connections stay on the floor; their record lives here.</p></>):<>
     <span className={w.recordType}>3 PEOPLE / 2 EXISTING CONNECTIONS</span>
     <h3>{state.ai==='created'?'Canvas created':state.ai==='archiving'?'Filing your canvas…':state.ai==='waiting'?'Waiting for confirmation':person?`${person.name} / source record`:'Preview first. You decide.'}</h3>
     <p>{state.ai==='created'?'The sample canvas is filed. Nothing was sent to an account or a live AI.':state.ai==='waiting'?'Review the existing connections. Nothing is written until you confirm.':person?person.note:'Reading the example character notes and arranging their existing relationships.'}</p>
     <div className={s.confirmation}>{(state.ai==='gathering'||state.ai==='preview')&&<motion.button {...feedback} onClick={()=>runtime.step(5)}>Preview connections</motion.button>}{state.ai==='waiting'&&<motion.button {...feedback} className={s.confirm} onClick={()=>runtime.confirm(quiet)} aria-label="Confirm and create canvas">Confirm →</motion.button>}{state.ai!=='gathering'&&<motion.button {...feedback} onClick={()=>runtime.replay()} aria-label="Preview again">Preview again</motion.button>}</div>
    </>}
   </div>
  </section>
  <div className={s.sceneTools}>
   <span>{timeline?'UNFOLD / CHOOSE / FOLLOW':people?'SELECT / CONNECT / READ':'REQUEST / PREVIEW / CONFIRM'}</span>
   <p>{timeline?'The courier brings a moment into focus. You can take over at any time.':people?'These relationships already exist in the notes. No links are invented.':'An art-directed feature demonstration, not a live AI request.'}</p>
  </div>
 </>;
}
