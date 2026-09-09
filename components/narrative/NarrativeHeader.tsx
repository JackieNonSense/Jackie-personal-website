"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const MotionLink = motion.create(Link);

const navItem = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0 },
};

export default function NarrativeHeader() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.header
      className="narrative-header"
      initial={shouldReduceMotion ? false : { opacity: 0.72 }}
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.07, delayChildren: 0.08 },
        },
      }}
    >
      <motion.a
        className="site-mark"
        href="#signal"
        aria-label="Jackie home"
        variants={navItem}
        whileHover={shouldReduceMotion ? undefined : { x: 2 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.09, ease: "easeOut" }}
      >
        <span>JACKIE</span>
        <span className="site-mark__role">FRONTEND / CREATIVE TECHNOLOGY</span>
      </motion.a>

      <motion.nav className="narrative-nav" aria-label="Primary" variants={navItem}>
        <motion.a
          className="narrative-nav__work"
          href="#work"
          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.09, ease: "easeOut" }}
        >
          Work
        </motion.a>
        <motion.a
          className="narrative-nav__about"
          href="#about"
          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.09, ease: "easeOut" }}
        >
          About
        </motion.a>
        <MotionLink
          className="narrative-nav__terminal"
          href="/terminal"
          aria-label="Terminal"
          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.09, ease: "easeOut" }}
        >
          Terminal
        </MotionLink>
        <motion.a
          className="narrative-nav__contact"
          href="#contact"
          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.09, ease: "easeOut" }}
        >
          Contact
        </motion.a>
      </motion.nav>

      <motion.div className="header-status" variants={navItem} aria-label="Section 00">
        <span>00</span>
        <span className="status-square" aria-hidden="true" />
      </motion.div>
    </motion.header>
  );
}
