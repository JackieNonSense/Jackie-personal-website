'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveReducedMotion } from './use-live-reduced-motion';
import { advanceSpriteClock, sampleSpritePose, SPRITE_ACTIONS, type SpriteAction } from './sprite-runtime';
import styles from './SpriteProof.module.css';

const ASSET = '/studies/inktrace/living-archive/review/sprite-sheet.png';
const cast = ['Mara / archivist', 'Ivo / cartographer', 'Sen / guide'];

export default function SpriteProof({ still = false }: { still?: boolean }) {
  const reduced = useLiveReducedMotion();
  const locked = still || !!reduced;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const elapsed = useRef(0);
  const [action, setAction] = useState<SpriteAction>('walk');
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      setReady(true);
    };
    img.onerror = () => { if (!cancelled) setFailed(true); };
    img.src = ASSET;
    return () => { cancelled = true; img.onload = null; img.onerror = null; };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const resize = () => setScale(Math.max(1, Math.min(3, Math.floor(box.clientWidth / 288))));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sheet = imageRef.current;
    if (!canvas || !sheet || !ready) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let handle = 0;
    let previous = 0;
    let visible = true;
    const draw = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#e6dfcd';
      ctx.fillRect(0, 0, 288, 96);
      const frames: number[] = [];
      for (let row = 0; row < 3; row++) {
        const pose = sampleSpritePose(action, elapsed.current);
        frames.push(pose.frame);
        ctx.fillStyle = '#c5beaa';
        ctx.fillRect(row * 96 + 6, 75, 84, 1);
        ctx.fillRect(row * 96 + 6, 74, 1, 5);
        ctx.fillRect(row * 96 + 89, 74, 1, 5);
        ctx.fillStyle = '#bdb59e';
        const x = row * 96 + 10 + pose.offsetX;
        ctx.fillRect(x + 6, 75, 21, 2);
        ctx.save();
        ctx.translate(x + (pose.facing < 0 ? 32 : 0), 32);
        ctx.scale(pose.facing, 1);
        const cellWidth = sheet.naturalWidth / 8;
        const cellHeight = sheet.naturalHeight / 3;
        ctx.drawImage(sheet, pose.frame * cellWidth, row * cellHeight, cellWidth, cellHeight, 0, 0, 32, 48);
        ctx.restore();
      }
      canvas.dataset.frames = frames.join(',');
      canvas.dataset.elapsed = String(Math.round(elapsed.current));
      canvas.dataset.action = action;
    };
    const held = () => locked || paused || document.hidden || !visible;
    const frame = (now: number) => {
      handle = 0;
      if (held()) { previous = 0; return; }
      elapsed.current = advanceSpriteClock(elapsed.current, previous ? now - previous : 0, false);
      previous = now;
      draw();
      handle = requestAnimationFrame(frame);
    };
    const schedule = () => {
      cancelAnimationFrame(handle);
      previous = 0;
      draw();
      if (!held()) handle = requestAnimationFrame(frame);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }, { threshold: 0.05 });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(handle);
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [action, locked, paused, ready, step]);

  const select = (next: SpriteAction) => { elapsed.current = 0; setAction(next); setStep(value => value + 1); };
  return (
    <section className={styles.proof} aria-labelledby="sprite-proof-title">
      <div className={styles.heading}>
        <h3 id="sprite-proof-title">The cast, frame by frame.</h3>
        <span>ASSET TEST / NOT A FINISHED SCENE</span>
      </div>
      <p>Three separate characters. Walking changes the leg pose and the position. Select an action to inspect its frames.</p>
      <div className={styles.viewport} ref={boxRef}>
        <canvas ref={canvasRef} width={288} height={96} role="img"
          aria-label="Three independent archive characters demonstrating sprite actions"
          style={{ width: 288 * scale, height: 96 * scale }} />
        {!ready && <p role="status">{failed ? 'Sprite asset unavailable. Action controls remain available for review.' : 'Loading the character sheet…'}</p>}
      </div>
      <div className={styles.cast}>{cast.map(name => <span key={name}>{name}</span>)}</div>
      <div className={styles.controls} aria-label="Character action tests">
        {SPRITE_ACTIONS.map(item => <motion.button key={item} type="button" aria-pressed={action === item}
          whileTap={locked ? undefined : { y: 1 }} onClick={() => select(item)}>
          {item[0].toUpperCase() + item.slice(1)}
        </motion.button>)}
        {!locked && <motion.button type="button" whileTap={{ y: 1 }} onClick={() => setPaused(value => !value)}>{paused ? 'Play motion' : 'Pause motion'}</motion.button>}
        <motion.button type="button" whileTap={locked ? undefined : { y: 1 }} onClick={() => {
          setPaused(true);
          elapsed.current += action === 'work' ? 240 : 140;
          setStep(value => value + 1);
        }}>Next frame →</motion.button>
      </div>
      {locked && <p className={styles.note}>Motion is held. Use the action buttons and Next frame to inspect key poses.</p>}
      <p className={styles.note}>Native cells: 32 × 48. Integer display scale: {scale}×. Idle and turn are key poses; walk and work are frame cycles. No sound. This test does not validate final scene interaction.</p>
      <a className={styles.download} href="/studies/inktrace/living-archive/review/sprite-sheet.json">Frame manifest ↗</a>
      {' · '}<a className={styles.download} href="/studies/inktrace/living-archive/review/cast-action-proof.gif" target="_blank" rel="noreferrer">Open silent GIF ↗</a>
    </section>
  );
}
