"use client";
/* The shell is the user's cutout; phosphor and glass are a separate curved GPU surface. */
/* eslint-disable @next/next/no-img-element */
import { lazy, Suspense, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useObjectVisibility } from "./use-object-visibility";
import styles from "./MonitorEntry.module.css";
const MotionLink = motion.create(Link);
const MonitorCrtDisplay = lazy(() => import('./MonitorCrtDisplay'));
export default function MonitorEntry({ still }: { still: boolean }) {
  const {ref:objectRef,near,drawing}=useObjectVisibility();
  const pointer=useRef({x:0,y:0});
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [failed, setFailed] = useState(false);
  const touch = useRef(false);
  const awake = hovered || focused || touched || failed;
  const immediate = still || Boolean(reduced);
  return <motion.div ref={objectRef} className={styles.monitor} data-testid="monitor-entry" data-awake={awake} initial={false}>
    <MotionLink href="/terminal" prefetch={false} aria-label="Open monitor" className={styles.monitorLink}
      onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onPointerDown={event => { touch.current = event.pointerType === "touch"; }}
      onPointerMove={event => {const r=event.currentTarget.getBoundingClientRect();pointer.current={x:(event.clientX-r.left)/r.width*2-1,y:1-(event.clientY-r.top)/r.height*2};}}
      onClick={event => { if (touch.current && !touched) { event.preventDefault(); setTouched(true); } }}>
      <motion.span className={styles.suspensionShadow} aria-hidden="true" initial={false} animate={{ opacity: awake ? .55 : .8, scaleX: awake && !immediate ? .93 : 1 }} transition={{ duration: immediate ? 0 : .22 }} />
      <motion.div className={styles.surface} data-monitor-renderer="artwork" data-artwork={failed ? "unavailable" : "ready"}
        initial={false} animate={{ y: awake && !immediate ? -12 : -8 }} transition={{ duration: immediate ? 0 : .22, ease: [.2,.7,.3,1] }}>
        <img className={styles.artwork} src="/portfolio/monitor-cyan-cutout-v02.png" width={1536} height={1024} alt="" draggable={false} loading="lazy" decoding="async" data-device-fallback="monitor" onError={() => setFailed(true)} />
        <div className={styles.crtDisplay} data-crt-display="phosphor">
          {near&&<Suspense fallback={null}><MonitorCrtDisplay awake={awake} still={immediate} active={drawing} pointer={pointer}/></Suspense>}
        </div>
        <div className={styles.crtTranscript} data-display-transcript="true" data-monitor-fallback-screen aria-hidden={!awake}>{'JR\nENTER'}</div>
      </motion.div>
    </MotionLink>
    <motion.div className={styles.monitorCaption} initial={false} animate={{ opacity: awake ? 1 : .7 }} transition={{ duration: immediate ? 0 : .18 }}><MotionLink href="/terminal" prefetch={false} whileHover={{ color: "#b4e2dc" }} whileTap={immediate ? undefined : { y: 1 }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>{touched ? "进入终端" : "ENTER TERMINAL ↗"}</MotionLink></motion.div>
  </motion.div>;
}
