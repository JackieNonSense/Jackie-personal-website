"use client";
/* eslint-disable @next/next/no-img-element */
import {useState} from 'react';
import {motion} from 'framer-motion';
import styles from './Inktrace.module.css';
import shared from './Portfolio.module.css';
import {portfolioContent} from './content';

export default function InktraceShowcase({still}:{still:boolean}){
 const [highlight,setHighlight]=useState(''),[failed,setFailed]=useState(false);
 const notes=[{id:'ideas',title:'Keep ideas together',text:'Characters and world notes share the same canvas.'},{id:'connections',title:'Connect the story',text:'Relationships become part of the workspace.'}];
 return <section id="work" className={`${shared.section} ${styles.work}`} aria-labelledby="work-title">
  <div className={shared.sectionTop}><span><b>01</b> / SELECTED WORK</span><span>THE SIGNAL HAS A SOURCE</span></div>
  <div className={styles.layout}>
   <motion.h2 id="work-title" className={`${shared.display} ${styles.title}`} initial={false} whileInView={{opacity:1}}>INKTRACE</motion.h2>
   <motion.div className={styles.copy} initial={still?false:{opacity:.8,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.35}}>
    <p className={styles.lead}>A writing workspace for connected stories.</p>
    <p>Creative work shouldn’t be scattered across disconnected tools.</p>
    <p>I built InkTrace to bring chapters, characters, world notes, and timelines into one connected writing workspace.</p>
    <span className={styles.role}>INDEPENDENT PRODUCT / DESIGN & CODE</span>
   </motion.div>
   <figure className={styles.exhibit} data-testid="inktrace-exhibit" data-highlight={highlight}>
    <img src="/portfolio/torn-stock-v01.png" className={styles.stock} alt="" draggable={false}/>
    <div className={styles.print}>
     <div className={styles.printTop}><span>ONE WORKSPACE. EVERY THREAD.</span><span>+ 01</span></div>
     <div className={styles.brand}>inktrace</div>
     <div className={styles.imageFrame}>
      {!failed?<img ref={node=>{if(node?.complete&&node.naturalWidth===0)setFailed(true);}} className={styles.productImage} src="/portfolio/inktrace-public-mindmap-v01.png" width={1024} height={1015} alt="Inktrace’s public mind-map demonstration, showing character and world-note cards connected by relationship lines." loading="lazy" onError={()=>setFailed(true)}/>:<div className={styles.structure}><span>WORKSPACE STRUCTURE</span><strong>STORY</strong><div>Chapters · Characters<br/>World notes · Timeline</div><p>One connected workspace.</p></div>}
      {!failed&&<><span className={`${styles.annotation} ${styles.ideas}`} aria-hidden="true">01</span><span className={`${styles.annotation} ${styles.connections}`} aria-hidden="true">02</span></>}
     </div>
     <figcaption>{failed?'WORKSPACE STRUCTURE / NOT A PRODUCT SCREENSHOT':'PUBLIC WEBSITE / MIND MAP DEMO'}</figcaption>
     <motion.div className={styles.notes} initial="rest" whileInView="show" viewport={{once:true}} variants={{show:{transition:{staggerChildren:still?0:.07}}}}>
      {notes.map((note,i)=><motion.button type="button" key={note.id} onPointerEnter={()=>setHighlight(note.id)} onPointerLeave={()=>setHighlight('')} onFocus={()=>setHighlight(note.id)} onBlur={()=>setHighlight('')} onClick={()=>setHighlight(highlight===note.id?'':note.id)} variants={{rest:{opacity:.8},show:{opacity:1}}} whileHover={still?undefined:{y:-2}} transition={{duration:.18}}><span>0{i+1}</span><div><strong>{note.title}</strong><p>{note.text}</p></div></motion.button>)}
     </motion.div>
    </div>
   </figure>
   <div className={styles.actions}><motion.a className={styles.visit} href={portfolioContent.inktrace.href} target="_blank" rel="noopener noreferrer" aria-label="Visit Inktrace — opens in a new tab" whileHover={still?undefined:{x:2,y:-2}} whileTap={still?undefined:{y:0}} transition={{duration:.15}}>EXPLORE INKTRACE <span aria-hidden="true">↗</span></motion.a><a href="#about" className={shared.smallLink}>THE PERSON BEHIND IT ↓</a></div>
  </div>
  <div className={styles.bleed} aria-hidden="true">ce</div>
 </section>;
}
