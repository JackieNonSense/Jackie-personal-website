"use client";

/* These are separate art layers, not a flattened screenshot of a website. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, MotionConfig } from "framer-motion";
import SignalRift from "./SignalRift";
import TonerLettering from "./TonerLettering";
import MusicDeck from "./MusicDeck";
import MonitorEntry from "./MonitorEntry";
import { useHomeMusic } from "./use-home-music";
import { musicTracks } from "./music-tracks";
import deviceStyles from "./Devices.module.css";
import { chapters, portfolioContent as content } from "./content";
import styles from "./Portfolio.module.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const readMotion = () => window.matchMedia(motionQuery).matches;
const serverMotion = () => false;

export default function Portfolio() {
  const [paused, setPaused] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [nameFailed, setNameFailed] = useState(false);
  const [deckVisible, setDeckVisible] = useState(false);
  const { player, state: music } = useHomeMusic();
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, serverMotion);
  const still = reduced || paused;
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = still ? "auto" : "smooth";
    return () => { root.style.scrollBehavior = previous; };
  }, [still]);

  useEffect(() => {
    const update = () => {
      let current = 0;
      chapters.forEach((item, index) => {
        const top = document.getElementById(item.id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= innerHeight * .45) current = index;
      });
      setChapter(current);
    };
    update(); window.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  const reveal = { initial: still ? false as const : { opacity: .8, y: 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .12 }, transition: { duration: still ? 0 : .35 } };
  const hover = still ? undefined : { x: 3 };

  return <MotionConfig reducedMotion={still ? "always" : "user"}>
    <main ref={mainRef} className={styles.portfolio} data-testid="portfolio" data-motion={still ? "static" : "running"}>
      <svg className={styles.paperFault} data-testid="paper-fault" viewBox="0 0 1440 4400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs><filter id="fault-fiber"><feTurbulence baseFrequency=".035 .24" numOctaves="2" seed="17" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="7" /></filter></defs>
        <path d="M1280 460 1264 670 1241 819 1250 980 1220 1160 1232 1355 1190 1560 1178 1780 1144 1960 1160 2170 1118 2370 1109 2570 1075 2760 1093 2940 1058 3160 1064 3350 1026 3540 1043 3720 1005 3960 1017 4210 985 4340" fill="none" stroke="#b4b5aa" strokeWidth="1.2" filter="url(#fault-fiber)" />
      </svg>
      <a href="#work" className={styles.skip}>Skip to work</a>
      <div className={styles.readout} aria-label={`Chapter ${chapters[chapter].index}: ${chapters[chapter].label}`}>
        <span>{chapters[chapter].index} / {chapters[chapter].label}</span><i aria-hidden="true" />
      </div>
      <section id="signal" className={styles.hero} aria-labelledby="name-title">
        <h1 id="name-title" className={styles.srOnly}>Yuchao Wang</h1>
        <SignalRift paused={paused} reducedMotion={reduced} />
        {!nameFailed ? <><img hidden src="/portfolio/name-stencil-v04.png" alt="" fetchPriority="high" onError={() => setNameFailed(true)} /><TonerLettering /></>
          : <div className={styles.fallbackName} data-testid="lettering-fallback" aria-hidden="true"><span>YUCHAO</span><span>WANG</span></div>}
        <header className={styles.heroHeader}><a href="#signal" className={styles.mark}>JACKIE</a></header>
        <nav className={styles.heroNav} aria-label="Primary navigation">
          <motion.a href="#work" whileHover={hover}>WORK</motion.a>
          <motion.a href="#about" whileHover={hover}>ABOUT</motion.a>
          <motion.a href="#contact" whileHover={hover}>CONTACT</motion.a>
        </nav>
        <div className={styles.heroFoot}><span>A SMALL OPENING.<br />ANOTHER WORLD.</span><a href="#work">FOLLOW THE SIGNAL ↓</a></div>
      </section>
      <section id="work" className={`${styles.section} ${styles.workSection}`} aria-labelledby="work-title">
        <div className={styles.sectionTop}><span><b>01</b> / SELECTED WORK</span><span>THE SIGNAL HAS A SOURCE</span></div>
        <motion.h2 id="work-title" className={`${styles.display} ${styles.workTitle}`} {...reveal}>INKTRACE</motion.h2>
        <div className={styles.inkGhost} aria-hidden="true">ce</div>
        <motion.figure className={styles.specimen} initial={false} whileInView={still ? {} : { y: -8 }} viewport={{ once: true }} transition={{ duration: .35 }}>
          <img src="/portfolio/torn-stock-v01.png" alt="" className={styles.stock} draggable={false} />
          <div className={styles.specimenPrint} aria-hidden="true">
            <div className={styles.printTop}><span>INKTRACE / INDEPENDENT WEBSITE</span><span>01</span></div>
            <span className={styles.registration}>+</span>
            <div className={styles.inkWord}>inktrace</div>
            <div className={styles.inkEcho}>inktrace<br />inktrace</div>
            <span className={styles.printRule}>← — — — — — — — →</span>
            <span className={styles.printUrl}>inktrace.app</span>
            <span className={styles.printBleed}>ce</span>
          </div>
          <figcaption>PORTFOLIO PRINT / NOT A PRODUCT SCREENSHOT</figcaption>
        </motion.figure>
        <motion.div className={styles.workCopy} {...reveal}>
          <p>An independent<br />space for creation.</p>
          <motion.a href={content.inktrace.href} target="_blank" rel="noopener noreferrer" className={styles.textLink} whileHover={hover} aria-label="Visit Inktrace — opens in a new tab">VISIT INKTRACE.APP ↗</motion.a>
          <p className={styles.aside}>A different corner<br />of my internet.</p>
          <a href="#about" className={styles.smallLink}>THE PERSON BEHIND IT ↓</a>
        </motion.div>
      </section>
      <section id="about" className={`${styles.section} ${styles.aboutSection}`} aria-labelledby="about-title">
        <div className={styles.sectionTop}><span><b>02</b> / THE PERSON BEHIND THE SIGNAL</span></div>
        <motion.h2 id="about-title" className={`${styles.display} ${styles.jackie}`} {...reveal}>JACKIE</motion.h2>
        <p className={styles.signature}>Yuchao Wang</p>
        <div className={styles.marginCode} aria-hidden="true">01 101<br />00 001<br />10 : 01<br />01 0010<br />00 10<br />01 101<br />10 010</div>
        <motion.div className={styles.aboutCopy} {...reveal}>
          <p className={styles.aboutLead}>The first internet felt<br />like another world.</p>
          <p>I make things that bring<br />a little of that feeling back.</p>
          <p className={styles.aboutDetail}>A mouse, a keyboard, a small discovery. I’m drawn to interfaces that reward curiosity — shaped by millennium-era visuals, underground music, and the joy of making something my own.</p>
          <motion.div className={styles.practice} initial="rest" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: still ? 0 : .07 } } }}>
            {content.practice.map(([label, first, second]) => <motion.div key={label} variants={{ rest: { opacity: .8 }, show: { opacity: 1 } }}><span>{label}</span><p>{first}<br />{second}</p></motion.div>)}
          </motion.div>
          <motion.a href="#experiments" className={styles.textLink} whileHover={hover}>Explore experiments ↓</motion.a>
        </motion.div>
        <MusicDeck player={player} state={music} still={still} onVisibility={setDeckVisible} />
      </section>
      <section id="experiments" className={`${styles.section} ${styles.experiments}`} aria-labelledby="experiments-title">
        <div className={styles.sectionTop}><span><b>03</b> / EXPERIMENTS</span><span>SMALL THINGS. STRANGE REWARDS.</span></div>
        <motion.h2 id="experiments-title" className={`${styles.display} ${styles.experimentsHeading}`} {...reveal}>STILL EXPLORING</motion.h2>
        <div className={styles.experimentGrid}>
          <motion.div className={styles.experimentIntro} {...reveal}><p>There is more<br />behind the glass.</p><span>A SMALL TERMINAL.<br />A DIFFERENT WAY IN.</span></motion.div>
          <MonitorEntry still={still} />
        </div>
      </section>
      <section id="contact" className={`${styles.section} ${styles.contact}`} aria-labelledby="contact-title">
        <div className={styles.sectionTop}><span><b>04</b> / KEEP IN TOUCH</span><span>END OF TRANSMISSION.</span></div>
        <motion.h2 id="contact-title" className={`${styles.display} ${styles.contactTitle}`} {...reveal}>LET’S CONNECT</motion.h2>
        <nav className={styles.contactLinks} aria-label="Elsewhere">
          <motion.a className={styles.textLink} href={`mailto:${content.email}`} whileHover={hover}>EMAIL ↗</motion.a>
          <motion.a className={styles.textLink} href={content.github} target="_blank" rel="noopener noreferrer" whileHover={hover}>GITHUB ↗</motion.a>
          <motion.a className={styles.textLink} href={content.linkedin} target="_blank" rel="noopener noreferrer" whileHover={hover}>LINKEDIN ↗</motion.a>
        </nav>
        <a className={styles.email} href={`mailto:${content.email}`}>{content.email}</a>
        <div className={styles.contactBottom}><motion.a href="#signal" whileHover={hover}>BACK TO TOP ↑</motion.a><span>JACKIE / YUCHAO WANG</span></div>
        <div className={styles.endLine} aria-hidden="true"><span>LIVE <i /></span></div>
      </section>
      <div className={deviceStyles.rack} data-testid="control-rack">
      {!deckVisible && music.status !== "idle" && <div className={deviceStyles.mini} aria-label="Music transport">
        <span>{musicTracks[music.track].title}</span>
        <motion.button type="button" onClick={player.toggle} aria-label={music.wantsPlaying ? "暂停音乐" : "播放音乐"} whileTap={still ? undefined : { scale: .98 }}>{music.wantsPlaying ? "Ⅱ" : "▶"}</motion.button>
        <motion.button type="button" onClick={() => void player.next()} disabled={music.status === "switching"} aria-label="下一首" whileTap={still ? undefined : { scale: .98 }}>▸▸</motion.button>
      </div>}
      <motion.button type="button" aria-label={paused ? "恢复动态效果" : "暂停动态效果"} aria-pressed={paused}
        onClick={() => setPaused(value => !value)} whileTap={still ? undefined : { scale: .98 }}>
        {paused ? "▶ MOTION PAUSED" : reduced ? "Ⅱ REDUCED MOTION" : "Ⅱ PAUSE MOTION"}
      </motion.button>
      </div>
    </main>
  </MotionConfig>;
}
