'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import InkTimeline from './InkTimeline';
import styles from './InkReadingRoom.module.css';

const views = ['Writing', 'Connections', 'AI workflow'] as const;
type View = typeof views[number];
type RecordId = 'archivists' | 'era';
const records = {
  archivists: {
    name: 'Archivists of Old', category: 'Group', relation: 'Built by',
    excerpt: 'They are not a single individual, but an ancient group…',
    context: 'Named in the passage as the builders of The Dungeon.',
  },
  era: {
    name: 'Second Era', category: 'Period', relation: 'Built during',
    excerpt: 'The period in which The Dungeon was constructed.',
    context: 'The excerpt links this period to the archive’s history. No further record details are reproduced in this study.',
  },
} as const;
const recordIds: RecordId[] = ['archivists', 'era'];
const ease = [.22, .72, .2, 1] as const;
const query = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const readMotion = () => window.matchMedia(query).matches;
const serverMotion = () => true;

export default function InkReadingRoom() {
  const [view, setView] = useState<View>('Writing');
  const [record, setRecord] = useState<RecordId | null>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, serverMotion);
  const still = paused || reduced;
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sourceRefs = useRef<Partial<Record<RecordId, HTMLButtonElement | null>>>({});
  const contextRef = useRef<HTMLDivElement | null>(null);
  const duration = still ? 0 : .32;
  const hover = still ? undefined : { x: 3 };

  useEffect(() => {
    if (!record || window.innerWidth > 570) return;
    const frame = requestAnimationFrame(() => {
      contextRef.current?.scrollIntoView({ block: 'nearest', behavior: still ? 'instant' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [record, still]);

  function openRecord(id: RecordId) { setView('Writing'); setRecord(id); }
  function closeRecord() {
    if (record) sourceRefs.current[record]?.focus({ preventScroll: window.innerWidth > 570 });
    setRecord(null);
  }
  function selectView(next: View) { setRecord(null); setView(next); }
  function tabKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % views.length;
    else if (event.key === 'ArrowLeft') next = (index + views.length - 1) % views.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = views.length - 1;
    else return;
    event.preventDefault(); selectView(views[next]); tabRefs.current[next]?.focus();
  }
  function reference(id: RecordId) {
    return <motion.button type="button" className={styles.reference}
      ref={node => { sourceRefs.current[id] = node; }}
      aria-label={`Read about ${records[id].name}`} aria-expanded={record === id}
      aria-controls={`${uid}-record`} onClick={() => openRecord(id)}
      whileTap={still ? undefined : { y: 1 }}>
      {records[id].name}<span className={styles.refMark} aria-hidden="true">↗</span>
    </motion.button>;
  }

  return <main className={styles.room} data-motion={still ? 'still' : 'animated'} onKeyDown={event => {
    if (event.key === 'Escape' && record) { event.preventDefault(); closeRecord(); }
  }}>
    <header className={styles.masthead}>
      <motion.a href="/" whileHover={still ? undefined : { x: -3 }}>← JACKIE</motion.a>
      <span>01 / SELECTED WORK</span><span>LOCAL DESIGN STUDY</span>
    </header>
    <aside className={styles.identity} aria-label="About the project">
      <div className={styles.identityTop}>
        <span className={styles.projectType}>A world of my own.</span>
      </div>
      <div className={styles.projectIntro}>
        <p className={styles.wordmark}>INKTRACE</p>
        <p className={styles.positioning}>For the world<br />you’re writing.</p>
        <p className={styles.productCopy}>Chapters, characters, wiki pages and timelines. One connected writing workspace.</p>
        <motion.a className={styles.visit} href="https://inktrace.app" target="_blank" rel="noopener noreferrer"
          aria-label="Visit InkTrace, opens in a new tab" whileHover={hover} whileTap={still ? undefined : { y: 1 }}>
          Visit InkTrace <span aria-hidden="true">↗</span>
        </motion.a>
      </div>
      <div className={styles.makerNote}>
        <span className={styles.label}>A note from the maker</span>
        <p>I build sprawling fictional worlds. Keeping the writing, people and timelines together became a project of its own.</p>
        <p>So I designed and built InkTrace.</p>
        <span className={styles.signature}>Yuchao Wang <span>/ design + code</span></span>
      </div>
      <div className={styles.identityFoot}><span>WORDS / PEOPLE / TIME</span><span>CONNECTED.</span></div>
    </aside>

    <div className={styles.content}>
      <div className={styles.editionTop}>
      <header className={styles.topbar}>
        <span className={styles.studyLabel}>A working world / selected excerpts</span>
        <motion.button type="button" className={styles.motionToggle} onClick={() => setPaused(value => !value)}
          aria-label={paused ? 'Resume motion' : 'Pause motion'} aria-pressed={paused}
          whileTap={still ? undefined : { y: 1 }}>
          <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span> {paused ? 'Resume motion' : 'Pause motion'}
        </motion.button>
      </header>

      <div className={styles.headingBlock}>
        <h1>A world beyond the page.</h1>
        <p className={styles.headnote}>Events unfold. People return.<br />The story stays connected.</p>
      </div>

      <InkTimeline still={still} />
      </div>

      <div className={styles.editionLower}>
      <div className={styles.readingDivider}><span>THE WORLD BETWEEN EVENTS</span><span>↓ OPEN A REFERENCE</span></div>

      <nav className={styles.tabs} role="tablist" aria-label="Explore InkTrace">
        {views.map((item, index) => <motion.button key={item} type="button" role="tab"
          ref={node => { tabRefs.current[index] = node; }}
          id={`${uid}-tab-${index}`} aria-controls={`${uid}-panel`} aria-selected={view === item}
          tabIndex={view === item ? 0 : -1} onClick={() => selectView(item)} onKeyDown={event => tabKeys(event, index)}
          whileTap={still ? undefined : { y: 1 }}>
          <span className={styles.tabIndex} aria-hidden="true">0{index + 1}</span>{item}
          {view === item && <motion.span className={styles.tabLine} layoutId={`${uid}-tab-line`}
            transition={{ duration: still ? 0 : .2, ease }} aria-hidden="true" />}
        </motion.button>)}
      </nav>

      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${views.indexOf(view)}`} className={styles.panel}>
        {view !== 'AI workflow' ? <div className={styles.readingLayout}>
          <article className={styles.source} aria-label="The Dungeon — source excerpt">
            <div className={styles.sourceMeta}><span>World wiki</span><span>Excerpt</span></div>
            <h2>The Dungeon</h2>
            <p className={styles.dek}>The sealed archives beneath the Capital.</p>
            <p className={styles.passage}>It was constructed during the {reference('era')} by the {reference('archivists')}. It was designed not just as a library, but as a prison for ideas.</p>
            <blockquote>“We do not guard these books to keep them from you, but to keep you from them.”</blockquote>
            <p className={styles.readingHint}><span aria-hidden="true">↗</span> Select a name. Keep your place.</p>
            <div className={styles.sourceFoot}><span>THE SHROUDED ISLE: BOOK III</span><span>2 linked records</span></div>
          </article>

          <div className={styles.contextWell} ref={contextRef}>
            <motion.div key={view === 'Connections' ? 'connections' : record ?? 'index'} className={styles.contextMotion}
              initial={still ? false : { clipPath: 'inset(0 0 0 100%)', x: 16 }}
              animate={{ clipPath: 'inset(0 0 0 0%)', x: 0 }} transition={{ duration, ease }}>
              {view === 'Connections' ? <section className={styles.connections} aria-label="Connections from The Dungeon">
                <div className={styles.railHeader}><span className={styles.label}>A passage, connected</span><span aria-hidden="true">↙</span></div>
                <h3>The Dungeon</h3>
                <div className={styles.branches}>
                  {recordIds.map(id => <div className={styles.branch} key={id}>
                    <span className={styles.relation}>{records[id].relation}</span>
                    <motion.button type="button" aria-label={`Open ${records[id].name} record`} onClick={() => openRecord(id)} whileHover={hover}>
                      {records[id].name}<span aria-hidden="true">↗</span>
                    </motion.button>
                    <span className={styles.label}>{records[id].category}</span>
                  </div>)}
                </div>
                <p className={styles.railFoot}>Two references in one passage.<br />Each leads to its own record.</p>
              </section> : record ? <section className={styles.record} id={`${uid}-record`} aria-label="Linked record" aria-live="polite">
                <div className={styles.railHeader}><span className={styles.label}>{records[record].category} / linked record</span>
                  <motion.button type="button" aria-label="Close record" onClick={closeRecord} whileHover={still ? undefined : { rotate: 90 }} transition={{ duration: .18 }}>×</motion.button>
                </div>
                <span className={styles.recordMarker} aria-hidden="true">↗</span>
                <h3>{records[record].name}</h3>
                <p className={styles.recordExcerpt}>{records[record].excerpt}</p>
                <p className={styles.recordContext}>{records[record].context}</p>
                <div className={styles.recordSource}><span className={styles.label}>Referenced in</span><span>The Dungeon <span aria-hidden="true">↙</span></span></div>
                <p className={styles.railFoot}>One shared record.<br />Its references stay connected.</p>
              </section> : <section className={styles.index} aria-label="In this passage">
                <div className={styles.railHeader}><span className={styles.label}>In this passage</span><span aria-hidden="true">↙</span></div>
                <p className={styles.indexIntro}>Every name<br />opens a little more.</p>
                {recordIds.map((id, index) => <motion.button key={id} type="button" className={styles.indexEntry}
                  aria-label={`Open ${records[id].name} record`} onClick={() => openRecord(id)} whileHover={hover}>
                  <span className={styles.indexNumber} aria-hidden="true">0{index + 1}</span>
                  <span>{records[id].name}<small>{records[id].category}</small></span><span aria-hidden="true">↗</span>
                </motion.button>)}
                <p className={styles.railFoot}>A reference is a doorway,<br />not a copy to keep up to date.</p>
              </section>}
            </motion.div>
          </div>
        </div> : <motion.section className={styles.aiWorkflow} initial={still ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, ease }}>
          <div className={styles.aiIntro}><span className={styles.label}>An assistant. You remain the author.</span>
            <h2>Review <br />before writing.</h2>
            <p>Ask AI chat to organise characters and map their relationships. See its proposal before anything is written back.</p>
            <p className={styles.disclaimer}>Workflow illustration. No live AI runs here.</p>
          </div>
          <ol className={styles.workflowSteps}>
            {[
              ['Ask', 'One request in AI chat to organise the characters and their relationships.'],
              ['Review', 'The result appears in chat first. You review the proposed organisation.'],
              ['Confirm', 'Only after your confirmation is the result written into the workspace.'],
            ].map(([title, copy], index) => <motion.li key={title} initial={still ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration, delay: still ? 0 : index * .055, ease }}>
              <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div>
            </motion.li>)}
          </ol>
        </motion.section>}
      </div>

        <footer className={styles.footer}><p>Interactive excerpt · not product UI</p><span>Local design study / not published</span></footer>
      </div>
    </div>
    <div className={styles.continuation}>
      <span>02 / THE PERSON BEHIND THE WORK</span>
      <motion.a href="/#about" whileHover={still ? undefined : { x: 4 }} aria-label="About Jackie on the portfolio">JACKIE <span aria-hidden="true">↗</span></motion.a>
      <p>Yuchao Wang / design & code</p>
    </div>
  </main>;
}
