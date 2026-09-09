"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useObjectVisibility } from "./use-object-visibility";
import MonitorSurface from "./MonitorSurface";
import styles from "./Devices.module.css";
const MotionLink = motion.create(Link);
export default function MonitorEntry({ still }: { still: boolean }) {
  const { ref: objectRef, near, drawing } = useObjectVisibility();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const touch = useRef(false);
  const awake = hovered || focused || touched;
  return <motion.div ref={objectRef} className={styles.monitor} data-testid="monitor-entry" data-awake={awake} initial={false} whileInView={{ opacity: 1 }}>
    <MotionLink href="/terminal" prefetch={false} aria-label="Open monitor" className={styles.monitorLink}
      onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onPointerDown={event => { touch.current = event.pointerType === "touch"; }}
      onClick={event => { if (touch.current && !touched) { event.preventDefault(); setTouched(true); } }}>
      <MonitorSurface near={near} active={drawing} still={still} awake={awake} />
    </MotionLink>
    <motion.div className={styles.monitorCaption} initial={false} animate={{ opacity: awake ? 1 : .7 }} transition={{ duration: still ? 0 : .3 }}><MotionLink href="/terminal" prefetch={false} whileHover={{ color: "#d5dfca" }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>{touched ? "进入终端" : "ENTER TERMINAL ↗"}</MotionLink><small>{awake ? "CONNECTION AVAILABLE" : "A QUIET WAY IN."}</small></motion.div>
  </motion.div>;
}
