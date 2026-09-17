"use client";

import { useId, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './InkArchive.module.css';

const drawers = [
  { id: 'why', tab: 'WHY', title: 'Why I built it', caption: '01 / THE REASON' },
  { id: 'workspace', tab: 'WORKSPACE', title: 'Inside the workspace', caption: '02 / THE PIECES' },
  { id: 'connections', tab: 'CONNECTIONS', title: 'How things connect', caption: '03 / THE THREAD' },
] as const;
type DrawerId = typeof drawers[number]['id'];
const ease = [.22, .72, .2, 1] as const;
const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const readMotion = () => window.matchMedia(motionQuery).matches;
const serverMotion = () => false;

export default function InkArchive() {
  const [active, setActive] = useState<DrawerId | null>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, serverMotion);
  const still = paused || !!reduced;
  const prefix = useId();
  const tabs = useRef<Partial<Record<DrawerId, HTMLButtonElement | null>>>({});
  const selected = drawers.find(drawer => drawer.id === active);

  function closeDrawer() {
    if (active) tabs.current[active]?.focus({ preventScroll: true });
    setActive(null);
  }

  return <main className={styles.archive} data-motion={still ? 'still' : 'animated'} data-open={active ?? 'none'}
    onKeyDown={event => {
      if (event.key === 'Escape' && active) { event.preventDefault(); closeDrawer(); }
    }}>
    <header className={styles.reviewBar}>
      <motion.a href="/" whileHover={still ? undefined : { x: -2 }}>← JACKIE</motion.a>
      <span>INKTRACE / INTERACTION STUDY</span>
      <motion.button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}
        whileTap={still ? undefined : { y: 1 }} aria-label={paused ? 'Resume motion' : 'Pause motion'}>
        {paused ? 'RESUME MOTION' : 'PAUSE MOTION'} <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span>
      </motion.button>
    </header>

    <div className={styles.layout}>
      <aside className={styles.identity}>
        <span className={styles.eyebrow}>01 / INDEPENDENT WORK</span>
        <h1 className={styles.wordmark}>INKTRACE</h1>
        <span className={styles.shortRule} aria-hidden="true" />
        <p className={styles.lead}>A writing workspace for connected stories.</p>
        <p className={styles.disciplines}>Chapters, characters,<br />worlds and timelines.</p>
        <motion.a className={styles.visit} href="https://inktrace.app" target="_blank" rel="noopener noreferrer"
          aria-label="Explore InkTrace — opens in a new tab" whileHover={still ? undefined : { x: 2, y: -1 }}
          whileTap={still ? undefined : { y: 0 }} transition={{ duration: .15 }}>
          EXPLORE INKTRACE <span aria-hidden="true">↗</span>
        </motion.a>
        <p className={styles.invitation}><span aria-hidden="true">↳</span> There is more beneath the surface.<br /><span>Open a red tab to look inside.</span></p>
        <div className={styles.colophon}><span>DESIGN & CODE</span><span>A project by Yuchao Wang.</span></div>
      </aside>

      <div className={styles.paperStage}>
        <div className={styles.assembly}>
          <div className={styles.backLeaf} aria-hidden="true" />
          <div className={styles.frontShadow}>
            <article className={styles.frontPaper} aria-label="Connected stories — editorial illustration">
              <div className={styles.paperMeta}><span>SAME PEOPLE.<br />NEW CONNECTIONS.</span><span>STORIES LEAVE TRACES.</span></div>
              <div className={styles.blackPrint} aria-hidden="true">More<br />to be<br /><em>written.</em></div>
              <div className={styles.chapter}>A chapter.<sup>(1)</sup></div>
              <div className={styles.character}>A character.<sup>(2)</sup></div>
              <div className={styles.world}>A world.<sup>(3)</sup></div>
              <svg className={styles.proofLine} viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 188 251 L 274 248 L 278 376 L 612 371 L 615 470 L 831 466" />
                <motion.path className={styles.activeLine} d="M 188 251 L 274 248 L 278 376 L 612 371 L 615 470 L 831 466"
                  initial={false} animate={{ pathLength: active ? 1 : 0 }} transition={{ duration: still ? 0 : .34, ease }} />
              </svg>
              <span className={styles.registration} aria-hidden="true">+</span>
              <p className={styles.handwritten}>Different paths.<br />Same story.</p>
              <span className={styles.printNumber}>AN EXERCISE IN CONNECTION / 01</span>
            </article>
          </div>
          {drawers.map(drawer => <motion.button key={drawer.id} type="button"
            ref={node => { tabs.current[drawer.id] = node; }}
            className={`${styles.tab} ${styles[drawer.id]}`} id={`${prefix}-tab-${drawer.id}`}
            aria-label={drawer.title} aria-expanded={active === drawer.id} aria-controls={`${prefix}-panel-${drawer.id}`}
            onClick={() => setActive(current => current === drawer.id ? null : drawer.id)}
            whileHover={still ? undefined : drawer.id !== 'why' ? { x: 4 } : { y: 4 }}
            whileTap={still ? undefined : { scale: .98 }} transition={{ duration: .14, ease }}>
            <span>{drawer.tab}</span><i aria-hidden="true">{active === drawer.id ? '−' : '+'}</i>
          </motion.button>)}
        </div>

        <div className={styles.drawerArea}>
          <AnimatePresence initial={false} mode="wait">
            {selected && <motion.div key={selected.id} className={styles.drawerWell}
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              transition={{ duration: still ? 0 : .32, ease }}>
              <motion.section role="region" id={`${prefix}-panel-${selected.id}`} aria-labelledby={`${prefix}-tab-${selected.id}`}
                className={`${styles.insert} ${styles[`insert_${selected.id}`]}`}
                initial={still ? false : { y: '-75%', opacity: .45 }} animate={{ y: 0, opacity: 1 }}
                exit={{ y: still ? 0 : '-80%', opacity: 0 }} transition={{ duration: still ? 0 : .32, ease }}>
                <div className={styles.insertHeader}><span>{selected.caption}</span>
                  <motion.button type="button" onClick={closeDrawer} aria-label={`Close ${selected.title}`}
                    whileHover={still ? undefined : { x: -2 }}>CLOSE <span aria-hidden="true">↥</span></motion.button>
                </div>
                <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 1 }, show: { opacity: 1, transition: { delayChildren: still ? 0 : .09, staggerChildren: still ? 0 : .05 } } }}>
                  {selected.id === 'why' && <>
                    <motion.p className={styles.reason} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>Creative work shouldn’t be scattered across disconnected tools.</motion.p>
                    <motion.p className={styles.afterword} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>I built InkTrace to bring the pieces together.</motion.p>
                    <svg className={styles.insertUnderline} viewBox="0 0 600 32" preserveAspectRatio="none" aria-hidden="true"><motion.path d="M 5 25 Q 160 6 310 16 T 595 8" initial={{ pathLength: still ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: still ? 0 : .3, delay: still ? 0 : .12 }} /></svg>
                  </>}
                  {selected.id === 'workspace' && <>
                    <h2 className={styles.insertTitle}>Room for the whole story.</h2>
                    <dl className={styles.workspaceList}>
                      {[['CHAPTERS', 'The writing itself.'], ['CHARACTERS', 'The people within it.'], ['WORLD NOTES', 'The world around them.'], ['TIMELINES', 'The order things unfold.']].map(([title, text]) =>
                        <motion.div key={title} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}><dt>{title}</dt><dd>{text}</dd></motion.div>)}
                    </dl>
                  </>}
                  {selected.id === 'connections' && <>
                    <h2 className={styles.insertTitle}>The pieces belong together.</h2>
                    <p className={styles.connectionCopy}>A character belongs to a world. An event changes their story. The idea is to keep that context close to the writing.</p>
                    <motion.div className={styles.connectionThread} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}><span>CHARACTER</span><i aria-hidden="true" /><span>WORLD</span><i aria-hidden="true" /><span>STORY</span></motion.div>
                  </>}
                </motion.div>
                <p className={styles.insertFooter}>INKTRACE / NOTES FROM THE MAKER</p>
              </motion.section>
            </motion.div>}
          </AnimatePresence>
          {!active && <p className={styles.closedNote}>Three notes, tucked away.<span>Pull a thread.</span></p>}
        </div>
      </div>
    </div>
    <footer className={styles.footer}><span>INKTRACE — STORIES CONNECT HERE.</span><span>LOCAL STUDY / COPY IN PROGRESS</span><a href="https://inktrace.app" target="_blank" rel="noopener noreferrer">INKTRACE.APP ↗</a></footer>
  </main>;
}
