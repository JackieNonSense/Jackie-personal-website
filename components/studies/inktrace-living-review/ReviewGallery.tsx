'use client';

import {useRef,useState,type KeyboardEvent} from 'react';
import {motion} from 'framer-motion';
import SpriteProof from './SpriteProof';
import {reviewScenes} from './data';
import {useLiveReducedMotion} from './use-live-reduced-motion';
import styles from './ReviewGallery.module.css';

export default function ReviewGallery({still=false}:{still?:boolean}) {
 const reduced=useLiveReducedMotion();
 const quiet=still||Boolean(reduced);
 const [selected,setSelected]=useState(0);
 const [focused,setFocused]=useState(0);
 const [failed,setFailed]=useState<string[]>([]);
 const tabRefs=useRef<(HTMLButtonElement|null)[]>([]);
 const scene=reviewScenes[selected];
 const imageSrc=`/studies/inktrace/living-archive/review/${scene.id}-board.png`;
 const feedback={whileHover:quiet?{}:{y:-1},whileTap:quiet?{}:{y:1},transition:{duration:.1}};
 const enter={opacity:1,y:0};
 const entrance=quiet?false:{opacity:0,y:4};

 function select(index:number){setSelected(index);setFocused(index);}
 function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
  let target=index;
  if(event.key==='ArrowRight')target=(index+1)%reviewScenes.length;
  else if(event.key==='ArrowLeft')target=(index+reviewScenes.length-1)%reviewScenes.length;
  else if(event.key==='Home')target=0;
  else if(event.key==='End')target=reviewScenes.length-1;
  else if(event.key==='Enter'||event.key===' '){event.preventDefault();select(index);return;}
  else return;
  event.preventDefault();setFocused(target);tabRefs.current[target]?.focus();
 }

 return <main className={styles.review} data-review-phase="art-direction">
  <aside className={styles.intro}>
   <motion.a {...feedback} className={styles.back} href="/studies/inktrace/pixel-window">← Compare the previous study</motion.a>
   <h1>INKTRACE</h1>
   <div className={styles.introCopy}>
    <p className={styles.kicker}>PHASE 01 / ART DIRECTION</p>
    <h2>The living <br/>archive.</h2>
    <p>Four places to understand one connected writing world.</p>
    <p className={styles.chinese}>这里保留已确认的四种空间、动作分镜与像素字体。四场景可交互样张已另行接好，可从下方入口打开。</p>
    <motion.a {...feedback} className={styles.visit} href="/studies/inktrace/living-archive">Open playable archive ↗</motion.a>
    <motion.a {...feedback} className={styles.visit} href="https://inktrace.app" target="_blank" rel="noreferrer">Visit InkTrace <span aria-hidden="true">↗</span></motion.a>
   </div>
   <div className={styles.marginNote}><span>01 / SCENES</span><span>02 / TYPE</span><span>03 / MOTION PROOF</span></div>
   <p className={styles.boundary}>This study does not replace the homepage.<br/>The music and terminal are unchanged.</p>
  </aside>

  <section className={styles.paper} aria-label="Living archive art review">
   <header className={styles.brandRow}><p className={styles.brand}>inktrace</p><span className={styles.edition}>A WORLD IN<br/>FOUR SCENES</span></header>
   <div className={styles.content}>
    <div className={styles.reviewNotice}><p>CONCEPT BOARDS / NOT AN INTERACTIVE PRODUCT DEMO</p><span>These boards preserve the approved art direction. The playable four-scene study has its own entry; the sprite test below remains the separate motion proof.</span></div>
    <section className={styles.window} aria-label="Scene concept gallery">
     <header className={styles.titlebar}><span aria-hidden="true" className={styles.windowIcon}>▣</span><h2>InkTrace — {scene.subtitle}</h2><span className={styles.phaseMark}>REVIEW</span></header>
     <div role="tablist" aria-label="Choose a scene concept" className={styles.tabs}>
      {reviewScenes.map((item,index)=><motion.button {...feedback} key={item.id} ref={node=>{tabRefs.current[index]=node;}} id={`review-tab-${item.id}`} type="button" role="tab" aria-selected={selected===index} aria-controls={`review-panel-${item.id}`} tabIndex={focused===index?0:-1} onKeyDown={event=>navigate(event,index)} onFocus={()=>setFocused(index)} onClick={()=>select(index)}><span key="number" className={styles.tabNumber}>{`0${index+1}`}</span><span key="title">{item.title}</span></motion.button>)}
     </div>
     <div role="tabpanel" id={`review-panel-${scene.id}`} aria-labelledby={`review-tab-${scene.id}`} tabIndex={0} className={styles.panel}>
      <div className={styles.boardHeading}><span>Default / information expanded</span><motion.a {...feedback} href={imageSrc} target="_blank" rel="noreferrer">Open full-size board ↗</motion.a></div>
      <motion.figure key={scene.id} initial={entrance} animate={enter} transition={{duration:quiet?0:.18}} className={styles.board}>
       {failed.includes(scene.id)?<div className={styles.imageFallback}><p>Concept image unavailable. The action plan remains readable below.</p><motion.button {...feedback} type="button" onClick={()=>setFailed(current=>current.filter(id=>id!==scene.id))}>Retry concept image</motion.button></div>:
        /* Concept art is intentionally a single untransformed bitmap, not a fake interactive scene. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={`${scene.title}: paired default and information-expanded concept states`} onError={()=>setFailed(current=>[...new Set([...current,scene.id])])}/>
       }
      </motion.figure>
      <div className={styles.readingSlot}>
       <div className={styles.sceneSummary}><div><p className={styles.mono}>0{selected+1} / {scene.duration}</p><h3>{scene.subtitle}</h3></div><p>{scene.premise}</p></div>
       <div className={styles.stateNotes}><p><span>BEFORE</span>{scene.defaultState}</p><p><span>AFTER</span>{scene.expandedState}</p></div>
      </div>
      <section className={styles.storyboard} aria-label="Action storyboard">
       <div className={styles.sectionHeading}><h3>Action score</h3><span>One sequence. Then you take over.</span></div>
       <motion.ol key={scene.id} initial={quiet?false:'hidden'} animate="visible" variants={{hidden:{},visible:{transition:{staggerChildren:quiet?0:.04}}}}>
        {scene.steps.map(step=><motion.li key={step.time} variants={{hidden:{opacity:0,y:3},visible:{opacity:1,y:0,transition:{duration:quiet?0:.18}}}}><span className={styles.time}>{step.time}</span><h4>{step.title}</h4><p>{step.description}</p></motion.li>)}
       </motion.ol>
       <p className={styles.takeover}><span>YOUR CONTROL</span>{scene.takeover}</p>
      </section>
     </div>
    </section>

    <section className={styles.typeSpecimen} aria-label="Fusion Pixel live type specimen">
     <header className={styles.sectionHeading}><h2>02 / Type, actually set</h2><span>Real HTML. Locally loaded fonts.</span></header>
     <div className={styles.specimenPage}>
      <p className={styles.specimenLabel}>8px proportional × 4 / 32px</p><p className={styles.type32} data-type-size="32">The archive remembers.</p>
      <p className={styles.specimenLabel}>12px proportional × 2 / 24px</p><p className={styles.type24} data-type-size="24">A record, not a popup.</p>
      <div className={styles.specimenColumns}><div><p className={styles.specimenLabel}>8px proportional × 2 / 16px</p><p data-type-size="16">Mara keeps the records. Ivo draws the coast.<br/>Their paths meet at the archive.</p></div><div><p className={styles.specimenLabel}>8px monospaced × 2 / 16px</p><p className={styles.mono} data-type-size="16">312 / 09 / 21 — 01 : 06</p><p className={styles.mono}>YEAR → MONTH → RECORD</p></div></div>
      <p className={styles.fontFootnote}>Fusion Pixel / OFL 1.1. The generated boards may contain illustrative lettering; this specimen is the actual browser font.</p>
      <div className={styles.fontLinks}><motion.a {...feedback} href="https://github.com/TakWolf/fusion-pixel-font" target="_blank" rel="noreferrer">Font source ↗</motion.a><motion.a {...feedback} href="/fonts/fusion-pixel/licenses/8px-proportional/OFL.txt" target="_blank" rel="noreferrer">Read the license ↗</motion.a></div>
     </div>
    </section>

    <section className={styles.spriteSection} aria-label="Independent character motion proof"><header className={styles.sectionHeading}><h2>03 / Motion, not a still image</h2><span>Independent sprite test</span></header><SpriteProof still={quiet}/></section>
    <footer className={styles.footer}><p>ART DIRECTION / Retained for comparison with the playable study.</p><motion.a {...feedback} href="/studies/inktrace/living-archive">Try the four scenes ↗</motion.a></footer>
   </div>
  </section>
 </main>;
}
