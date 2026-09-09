"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createColumns, advanceY, openingPath, upperPaperClip, lowerPaperClip } from "./vertical-signal";
import styles from "./Portfolio.module.css";
type Props = { paused: boolean; reducedMotion: boolean };
export default function SignalRift({ paused, reducedMotion }: Props) {
  const [opened, setOpened] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const upper = useRef<HTMLDivElement>(null), lower = useRef<HTMLDivElement>(null);
  const wake = useRef(() => {});
  const active = opened || hovered || focused;
  const state = useRef({ active, still: paused || reducedMotion });
  useEffect(() => { state.current = { active, still: paused || reducedMotion }; wake.current(); }, [active, paused, reducedMotion]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpened(false); setHovered(false); setFocused(false); } };
    window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = typeof ResizeObserver === "undefined" ? null : canvas.getContext("2d");
    if (!ctx) {
      wake.current = () => {
        const offset = state.current.active ? 12 : 0;
        if (upper.current) upper.current.style.transform = `translateY(${-offset}px)`;
        if (lower.current) lower.current.style.transform = `translateY(${offset}px)`;
      };
      return;
    }
    let width = 1, height = 1, frame = 0, last = 0, gap = 0, visible = true;
    let glyphs = createColumns(1, 1);
    const draw = (now: number) => {
      frame = 0;
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      const { active, still } = state.current;
      const target = active ? 12 : 0;
      gap = still ? target : gap + (target - gap) * Math.min(1, dt * 10);
      if (Math.abs(target - gap) < .02) gap = target;
      if (upper.current) upper.current.style.transform = `translateY(${-gap}px)`;
      if (lower.current) lower.current.style.transform = `translateY(${gap}px)`;
      ctx.clearRect(0, 0, width, height); ctx.save();
      ctx.scale(width / 1586, height / 992); ctx.clip(new Path2D(openingPath(gap, 992 / height))); ctx.scale(1586 / width, 992 / height);
      ctx.font = '13px "Courier New", monospace';
      for (const glyph of glyphs) {
        if (!still) glyph.y = advanceY(glyph.y, glyph.speed, dt, height);
        ctx.globalAlpha = glyph.bright ? .82 : .48;
        ctx.fillStyle = glyph.bright ? "#39a36f" : glyph.speed > 0 ? "#164d92" : "#247e5e";
        ctx.shadowColor = "#2abb70"; ctx.shadowBlur = glyph.bright ? 1.5 : 0;
        ctx.fillText(glyph.char, glyph.x, glyph.y);
      }
      ctx.restore();
      if (!still && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resume = () => { cancelAnimationFrame(frame); frame = 0; last = 0; if (visible && !document.hidden) frame = requestAnimationFrame(draw); };
    wake.current = resume;
    const resize = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glyphs = createColumns(width, height); resume();
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); }); observer.observe(canvas);
    document.addEventListener("visibilitychange", resume);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect(); document.removeEventListener("visibilitychange", resume); wake.current = () => {}; };
  }, []);
  return <>
    <div className={styles.riftBacking} data-rift-backing aria-hidden="true" />
    <div className={styles.riftBed} data-rift-bed aria-hidden="true"><img className={styles.material} src="/portfolio/material-plate-v02.png" alt="" draggable={false} /></div>
    <div ref={upper} className={styles.paperLip} data-paper-lip="upper" style={{ clipPath: upperPaperClip }} aria-hidden="true"><img className={styles.material} src="/portfolio/material-plate-v02.png" alt="" fetchPriority="high" draggable={false} /></div>
    <div ref={lower} className={styles.paperLip} data-paper-lip="lower" style={{ clipPath: lowerPaperClip }} aria-hidden="true"><img className={styles.material} src="/portfolio/material-plate-v02.png" alt="" draggable={false} /></div>
    <canvas ref={canvasRef} className={styles.characters} data-testid="rift-canvas" aria-hidden="true" />
    <motion.button type="button" className={styles.riftHit} aria-label="探索裂隙" aria-pressed={opened}
      onClick={() => setOpened(value => !value)} onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} whileTap={paused || reducedMotion ? undefined : { opacity: .9 }}>
      <span className={styles.srOnly}>FIND THE SIGNAL</span>
    </motion.button>
    <div className={styles.signalCaption}><span className={styles.signalLabel}>FIND THE SIGNAL</span></div>
  </>;
}
