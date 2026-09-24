"use client";

/* These are separate art layers, not a flattened screenshot of a website. */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, MotionConfig } from "framer-motion";
import HeroInkSignal from "../studies/hero-ink-signal/HeroInkSignal";
import InkTracePress from "./inktrace-press/InkTracePress";
import MusicDeck from "./MusicDeck";
import MonitorEntry from "./MonitorEntry";
import { useHomeMusic } from "./use-home-music";
import { musicTracks } from "./music-tracks";
import deviceStyles from "./Devices.module.css";
import { portfolioContent as content } from "./content";
import styles from "./Portfolio.module.css";
import { DUR, EASE, STAGGER } from "./motion";

/** One crack, drawn twice: the base stroke, and a brighter copy masked to a soft
 * band. The crack never moves — only the light travelling across it does, the way
 * a lamp moves over a tilted sheet. It is the one element that crosses every
 * section boundary, so it is what carries the eye between them. */
const FAULT_PATH = "M1280 0 1274 160 1284 340 1280 460 1264 670 1241 819 1250 980 1220 1160 1232 1355 1190 1560 1178 1780 1144 1960 1160 2170 1118 2370 1109 2570 1075 2760 1093 2940 1058 3160 1064 3350 1026 3540 1043 3720 1005 3960 1017 4210 985 4400";
/** Where the highlight parks when motion is reduced. */
const FAULT_REST = .42;

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
  const [deckVisible, setDeckVisible] = useState(false);
  const { player, state: music } = useHomeMusic();
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, serverMotion);
  const still = reduced || paused;
  const mainRef = useRef<HTMLElement>(null);
  const lightRef = useRef<SVGPathElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);

  // The crack never moves; the light across it does. Sliding the gradient that
  // paints the stroke keeps this in SVG, where percentages behave predictably —
  // a CSS custom property inside mask-position does not survive the CSS pipeline.
  useEffect(() => {
    const gradient = gradientRef.current; if (!gradient) return;
    const park = (fraction: number) => gradient.setAttribute("gradientTransform", `translate(0 ${(fraction - .5).toFixed(4)})`);
    if (still) { park(FAULT_REST); return; }
    let frame = 0;
    const write = () => {
      frame = 0;
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      park(travel > 0 ? window.scrollY / travel : 0);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(write); };
    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [still]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = still ? "auto" : "smooth";
    return () => { root.style.scrollBehavior = previous; };
  }, [still]);

  // The one entrance in the page. Everything that appears uses this, so sections
  // share a rhythm instead of each fading in on its own timing.
  const reveal = { initial: still ? false as const : { opacity: .8, y: 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .12 }, transition: { duration: still ? 0 : DUR.slow, ease: EASE } };
  const hover = still ? undefined : { x: 3 };

  return <MotionConfig reducedMotion={still ? "always" : "user"}>
    <main ref={mainRef} className={styles.portfolio} data-testid="portfolio" data-motion={still ? "static" : "running"}>
      <svg className={styles.paperFault} data-testid="paper-fault" viewBox="0 0 1440 4400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs><linearGradient ref={gradientRef} id="fault-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2efe2" stopOpacity="0" /><stop offset="43%" stopColor="#f2efe2" stopOpacity="0" /><stop offset="50%" stopColor="#f2efe2" stopOpacity="1" /><stop offset="57%" stopColor="#f2efe2" stopOpacity="0" /><stop offset="100%" stopColor="#f2efe2" stopOpacity="0" /></linearGradient><filter id="fault-fiber"><feTurbulence baseFrequency=".035 .24" numOctaves="2" seed="17" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="7" /></filter></defs>
        <path className={styles.faultBase} d={FAULT_PATH} fill="none" stroke="#b4b5aa" strokeWidth="1.2" filter="url(#fault-fiber)" />
        <path ref={lightRef} className={styles.faultLight} d={FAULT_PATH} fill="none" stroke="url(#fault-light)" strokeWidth="1.2" filter="url(#fault-fiber)" />
      </svg>
      <a href="#about" className={styles.skip}>Skip to content</a>
      <HeroInkSignal embedded still={still}/>
      <section id="about" className={`${styles.section} ${styles.aboutSection}`} aria-labelledby="about-title">
        <motion.h2 id="about-title" className={`${styles.display} ${styles.aboutTitle}`} {...reveal}>ABOUT ME</motion.h2>
        <p className={styles.signature}>Yuchao Wang</p>
        <div className={styles.aboutLayout}>
        <motion.div className={styles.aboutCopy} {...reveal}>
          <p className={styles.aboutLead}>The first internet felt <br />like another world.</p>
          <p>The world is turning over fast, <br />and little feels certain now. <br />I’m bringing back some of what did.</p>
          <p className={styles.aboutDetail}>Based in Sydney; computer science at UNSW. Still looking for my own meaning in a world moving this fast — and making my own interactions, my own aesthetic, is the closest I’ve come to finding it. Nothing has felt more worth doing. I’m not going to stop.</p>
          <motion.div className={styles.practice} initial="rest" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: still ? 0 : STAGGER } } }}>
            {content.practice.map(([label, first, second]) => <motion.div key={label} variants={{ rest: { opacity: .8 }, show: { opacity: 1 } }}><span>{label}</span><p>{first}<br />{second}</p></motion.div>)}
          </motion.div>
          <motion.a href="#experiments" className={styles.textLink} whileHover={hover}>Explore experiments ↓</motion.a>
        </motion.div>
        <div className={styles.aboutDevice}><MusicDeck player={player} state={music} still={still} onVisibility={setDeckVisible} /></div>
        </div>
      </section>
      <InkTracePress still={still}/>
      <section id="experiments" className={`${styles.section} ${styles.experiments}`} aria-labelledby="experiments-title">
        <motion.h2 id="experiments-title" className={`${styles.display} ${styles.experimentsHeading}`} {...reveal}>STILL EXPLORING</motion.h2>
        <div className={styles.experimentGrid}>
          <motion.div className={styles.experimentIntro} {...reveal}><p>A small experiment.<br />Find the password<br />on this page first.</p><span>A SMALL TERMINAL.<br />A DIFFERENT WAY IN.</span></motion.div>
          <MonitorEntry still={still} />
        </div>
      </section>
      <section id="contact" className={`${styles.section} ${styles.contact}`} aria-labelledby="contact-title">
        <motion.h2 id="contact-title" className={`${styles.display} ${styles.contactTitle}`} {...reveal}>LET’S CONNECT</motion.h2>
        <nav className={styles.contactLinks} aria-label="Elsewhere">
          <motion.a className={styles.textLink} href={`mailto:${content.email}`} whileHover={hover}>EMAIL ↗</motion.a>
          <motion.a className={styles.textLink} href={content.github} target="_blank" rel="noopener noreferrer" whileHover={hover}>GITHUB ↗</motion.a>
          <motion.a className={styles.textLink} href={content.linkedin} target="_blank" rel="noopener noreferrer" whileHover={hover}>LINKEDIN ↗</motion.a>
        </nav>
        <a className={styles.email} href={`mailto:${content.email}`}>{content.email}</a>
        <div className={styles.contactBottom}><motion.a href="#signal" whileHover={hover}>BACK TO TOP ↑</motion.a><span>YUCHAO WANG</span></div>
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
