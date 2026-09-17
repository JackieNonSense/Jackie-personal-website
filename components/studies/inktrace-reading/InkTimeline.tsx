'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import styles from './InkTimeline.module.css';

// Selected fiction from the user-supplied timeline screenshot, not live product data.
const events = [
  { id: 'palace', title: 'Infiltration of the Palace', year: '1042', date: '26 NOV', type: 'Event', kaelen: false,
    summary: 'Managing to bypass the outer guards…', context: 'An entry preceding the discovery of the Grimoire. Only the visible excerpt is reproduced here.' },
  { id: 'grimoire', title: 'Discovery of the Grimoire', year: '1042', date: '27 NOV', type: 'Discovery', kaelen: true,
    summary: 'Kaelen enters the inner sanctum and locates the pedestal. The containment field is weaker than expected. He retrieves the Grimoire of Aethelgard.',
    context: 'Upon touching the leather cover, he realizes the book is warm. It pulses with a heartbeat. This contradicts the Council’s records which stated the artifact was dormant.',
    note: 'This moment must mirror the prologue scene. The “Whisper” he hears is not external, but internal.' },
  { id: 'purge', title: 'The Great Purge Begins', year: '1043', date: '14 FEB', type: 'Conflict', kaelen: false,
    summary: 'The Iron Council declares all unregistered scribes as enemies of the state…', context: 'A conflict entry in the supplied timeline.' },
  { id: 'star-map', title: 'Decoding the Star-Map', year: '1043', date: '20 DEC', type: 'Milestone', kaelen: false,
    summary: 'A milestone on the same day as Arrival at Black Harbor.', context: 'The source screenshot shows the title and date, but no event summary. No further story details are invented here.' },
  { id: 'harbor', title: 'Arrival at Black Harbor', year: '1043', date: '20 DEC', type: 'Event', kaelen: true,
    summary: 'Kaelen secures passage on a smuggler’s ship bound for the Outer Rim…', context: 'A separate event on the same date as Decoding the Star-Map.' },
] as const;
type EventId = typeof events[number]['id'];
const ease = [.22, .72, .2, 1] as const;

export default function InkTimeline({ still }: { still: boolean }) {
  const [selected, setSelected] = useState<EventId | null>('grimoire');
  const [follow, setFollow] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const buttons = useRef<Partial<Record<EventId, HTMLButtonElement | null>>>({});
  const uid = useId();
  const visible = events.filter(event => !follow || event.kaelen);
  const active = visible.find(event => event.id === selected);
  const duration = still ? 0 : .3;

  function select(id: EventId) { setSelected(id); setNoteOpen(false); }
  function close() {
    if (selected) buttons.current[selected]?.focus();
    setSelected(null); setNoteOpen(false);
  }
  function filter(kaelen: boolean) {
    setFollow(kaelen); setNoteOpen(false);
    if (kaelen && !events.find(event => event.id === selected)?.kaelen) setSelected('grimoire');
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = Math.min(index + 1, visible.length - 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = visible.length - 1;
    else return;
    event.preventDefault();
    select(visible[next].id);
    buttons.current[visible[next].id]?.focus();
    buttons.current[visible[next].id]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: still ? 'instant' : 'smooth' });
  }

  return <section className={styles.timeline} aria-label="Story timeline" onKeyDown={event => {
    if (event.key === 'Escape' && active) { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <div className={styles.heading}>
      <div><span className={styles.kicker}>The main timeline / AC 1042–1043</span><h2>Follow the thread.</h2></div>
      <div className={styles.filters} role="group" aria-label="Timeline focus">
        <motion.button type="button" aria-pressed={!follow} onClick={() => filter(false)} whileHover={still ? undefined : { y: -2 }}>All events</motion.button>
        <motion.button type="button" aria-label="Follow Kaelen" aria-pressed={follow} onClick={() => filter(true)} whileHover={still ? undefined : { y: -2 }}>Kaelen <span aria-hidden="true">↗</span></motion.button>
      </div>
    </div>

    <div className={styles.railViewport}>
      <motion.ol className={styles.rail} aria-label="Events in story order" key={follow ? 'kaelen' : 'all'}
        initial="rest" animate="show" variants={{ rest: {}, show: { transition: { staggerChildren: still ? 0 : .035 } } }}>
        {visible.map((event, index) => <motion.li key={event.id} variants={{ rest: { opacity: still ? 1 : 0, y: still ? 0 : 7 }, show: { opacity: 1, y: 0 } }} transition={{ duration, ease }}>
          <motion.button type="button" ref={node => { buttons.current[event.id] = node; }} aria-label={`Open event: ${event.title}`}
            aria-expanded={selected === event.id} aria-controls={selected === event.id ? `${uid}-event` : undefined}
            onClick={() => select(event.id)} onKeyDown={key => navigate(key, index)} whileHover={still ? undefined : { y: -3 }}
            whileTap={still ? undefined : { y: 0 }} transition={{ duration: still ? 0 : .12 }}>
            <span className={styles.date}>{event.date}<span> / {event.year}</span></span>
            <span className={styles.node} aria-hidden="true"><i /></span>
            <span className={styles.eventName}>{event.title}</span>
            <span className={styles.eventType}>{event.type}</span>
          </motion.button>
        </motion.li>)}
      </motion.ol>
    </div>
    <div className={styles.sequenceNote}><span>Story order · spacing is not elapsed time</span><span>{visible.length} selected events <span aria-hidden="true">→</span></span></div>

    {active ? <motion.section className={styles.detail} role="region" aria-label="Event details" id={`${uid}-event`}
      key={active.id} initial={still ? false : { opacity: .4, y: -9, clipPath: 'inset(0 0 20% 0)' }}
      animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }} transition={{ duration, ease }}>
      <div className={styles.datePrint} aria-hidden="true"><span>AC</span><strong>{active.year}</strong><span>{active.date}</span></div>
      <div className={styles.detailBody}>
        <div className={styles.detailTop}><span>{active.type} / event excerpt</span>
          <motion.button type="button" aria-label="Close event" onClick={close} whileHover={still ? undefined : { x: -2 }}>Close <span aria-hidden="true">↑</span></motion.button>
        </div>
        <h3>{active.title}</h3>
        <p className={styles.summary}>{active.summary}</p>
        <p className={styles.context}>{active.context}</p>
        {'note' in active && <>
          <motion.button type="button" className={styles.noteButton} aria-label="Read writing note" aria-expanded={noteOpen}
            aria-controls={`${uid}-note`} onClick={() => setNoteOpen(value => !value)} whileHover={still ? undefined : { x: 3 }}>
            <span aria-hidden="true">{noteOpen ? '−' : '+'}</span> Read writing note
          </motion.button>
          {noteOpen && <motion.div className={styles.writingNote} role="region" aria-label="Writing note" id={`${uid}-note`}
            initial={still ? false : { opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, ease }}>
            <span>From the writer’s notes</span><p>{active.note}</p>
          </motion.div>}
        </>}
      </div>
    </motion.section> : <p className={styles.closed}>Choose a moment to unfold its story. <span aria-hidden="true">↑</span></p>}
    <p className={styles.provenance}>{follow ? 'Events that explicitly mention Kaelen in the supplied excerpts.' : 'Selected from your supplied timeline. Local illustration, not a live workspace.'}</p>
  </section>;
}
