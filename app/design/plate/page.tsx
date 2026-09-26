"use client";
/* Review page for the misregistration plate. Local only: the entrance lasts under
 * a second on the real page, which is too short to judge, so this replays it. */
import { useState } from "react";
import { motion } from "framer-motion";
import styles from "../../../components/portfolio/Portfolio.module.css";
import { EASE } from "../../../components/portfolio/motion";

const OFFSETS = [2, 4, 6, 10];

export default function PlateReview() {
  const [run, setRun] = useState(0);
  const [slow, setSlow] = useState(true);
  const duration = slow ? 2.4 : .66;
  const button: React.CSSProperties = { minHeight: 44, padding: "0 16px", background: "transparent", border: "1px solid #6b7268", color: "#d4d2c7", font: "12px/1 'Courier New',monospace", letterSpacing: ".08em", cursor: "pointer" };
  return <main style={{ minHeight: "100vh", background: "#0b0c0a url('/portfolio/black-stock-v01.png')", color: "#d4d2c7", padding: "40px clamp(18px,4vw,70px) 120px", font: "13px/1.7 'Courier New',monospace" }}>
    <h1 style={{ font: "400 22px/1.3 'Courier New',monospace", letterSpacing: "-.01em", margin: 0 }}>Misregistration plate — review</h1>
    <p style={{ color: "#9ca396", maxWidth: 640, marginTop: 10 }}>
      The cyan plate lands out of register and is pulled in. On the real page this runs once,
      for {(.66).toFixed(2)}s, the first time a title scrolls into view. Slow motion is on by
      default here so the movement can actually be seen.
    </p>
    <div style={{ display: "flex", gap: 12, margin: "26px 0 50px", flexWrap: "wrap" }}>
      <button type="button" style={button} onClick={() => setRun(n => n + 1)}>▶ REPLAY</button>
      <button type="button" style={button} aria-pressed={slow} onClick={() => setSlow(s => !s)}>
        {slow ? "SLOW 2.40s — click for real speed" : "REAL SPEED 0.66s — click for slow"}
      </button>
    </div>
    {OFFSETS.map(px => <section key={px} style={{ marginBottom: 54 }}>
      <span style={{ color: "#879ac0", fontSize: 11, letterSpacing: ".1em" }}>OFFSET {px}px</span>
      <h2 className={styles.display} style={{ position: "relative", fontSize: "clamp(80px,13vw,190px)", margin: "6px 0 0", whiteSpace: "nowrap" }}>
        ABOUT ME
        <motion.span key={`${px}-${run}-${slow}`} aria-hidden="true" className={styles.plate}
          initial={{ x: px, y: -Math.round(px * .72), opacity: .55 }}
          animate={{ x: 0, y: 0, opacity: 0 }}
          transition={{ duration, ease: EASE }}>ABOUT ME</motion.span>
      </h2>
    </section>)}
    <p style={{ color: "#79806f", marginTop: 40 }}>4px is what is wired into ABOUT ME on the homepage right now.</p>
  </main>;
}
