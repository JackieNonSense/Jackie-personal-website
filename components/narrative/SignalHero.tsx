"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import {
  motion,
  type PanInfo,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SignalWave from "./SignalWave";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const heroContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.08 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const DRAG_LIMIT = 132;
const OPEN_THRESHOLD = 92;
const PAPER_TOP =
  "M-40 46 C10 44 32 31 72 39 C110 48 138 36 176 43 C216 50 244 28 282 37 C321 48 350 34 390 41 C430 48 459 30 498 39 C536 50 565 33 605 42 C644 50 676 27 716 37 C756 46 785 35 824 40 C864 48 893 26 933 36 C973 47 1003 34 1042 42 C1082 51 1112 31 1151 39 C1190 48 1221 30 1260 38 C1300 50 1328 29 1368 37 C1408 48 1438 33 1478 42 C1518 50 1550 31 1640 40";
const PAPER_BOTTOM =
  "M-40 180 C8 176 36 191 76 183 C115 174 142 190 181 181 C220 173 251 194 291 184 C331 175 360 190 400 180 C440 171 470 193 511 183 C551 174 580 190 621 181 C661 172 691 194 731 184 C771 175 801 191 841 182 C881 173 911 193 951 183 C991 174 1021 191 1061 181 C1101 172 1131 194 1171 184 C1211 175 1241 190 1281 181 C1321 173 1351 193 1391 183 C1431 174 1461 191 1501 181 C1541 172 1571 190 1640 180";
const PAPER_SHAPE = `${PAPER_TOP} L1640 180 C1571 190 1541 172 1501 181 C1461 191 1431 174 1391 183 C1351 193 1321 173 1281 181 C1241 190 1211 175 1171 184 C1131 194 1101 172 1061 181 C1021 191 991 174 951 183 C911 193 881 173 841 182 C801 191 771 175 731 184 C691 194 661 172 621 181 C580 190 551 174 511 183 C470 193 440 171 400 180 C360 190 331 175 291 184 C251 194 220 173 181 181 C142 190 115 174 76 183 C36 191 8 176 -40 180 Z`;

function PaperSurface() {
  return (
    <svg
      className="signal-paper"
      viewBox="0 0 1600 220"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="paper-distress" x="-4%" y="-18%" width="108%" height="136%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.009 0.16"
            numOctaves="3"
            seed="27"
            result="edgeNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="edgeNoise"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.52" numOctaves="3" seed="73421" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <clipPath id="paper-cut">
          <path d={PAPER_SHAPE} />
        </clipPath>
      </defs>

      <g filter="url(#paper-distress)">
        <path
          className="signal-paper__base"
          d={PAPER_SHAPE}
        />
        <rect
          className="signal-paper__grain"
          x="-20"
          y="0"
          width="1640"
          height="220"
          clipPath="url(#paper-cut)"
          filter="url(#paper-grain)"
        />
      </g>

      <path className="signal-paper__edge signal-paper__edge--top" d={PAPER_TOP} />
      <path className="signal-paper__fiber signal-paper__fiber--top" d={PAPER_TOP} />
      <path className="signal-paper__edge signal-paper__edge--bottom" d={PAPER_BOTTOM} />
      <path className="signal-paper__fiber signal-paper__fiber--bottom" d={PAPER_BOTTOM} />
    </svg>
  );
}

export default function SignalHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const handleX = useMotionValue(0);
  const waveX = useMotionValue(0);
  const [channelOpen, setChannelOpen] = useState(false);
  const [handlePosition, setHandlePosition] = useState(0);

  useGSAP(
    () => {
      if (shouldReduceMotion || !sectionRef.current) return;

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.55,
        },
      });

      timeline
        .to(titleRef.current, { yPercent: -5, opacity: 0.48 }, 0)
        .to(bandRef.current, { yPercent: 13, rotate: 0.35 }, 0);
    },
    {
      scope: sectionRef,
      dependencies: [shouldReduceMotion],
      revertOnUpdate: true,
    },
  );

  const updateSignal = (position: number) => {
    const nextPosition = Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, position));
    handleX.set(nextPosition);
    waveX.set(nextPosition * -0.46);
    setHandlePosition(Math.round(nextPosition));
    setChannelOpen(Math.abs(nextPosition) >= OPEN_THRESHOLD);
  };

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    updateSignal(info.offset.x);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    updateSignal(handleX.get() + (event.key === "ArrowRight" ? 22 : -22));
  };

  return (
    <section ref={sectionRef} id="signal" className="signal-hero" aria-labelledby="signal-title">
      <svg className="hero-filter-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="xerox-title" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.42 0.12" numOctaves="2" seed="17" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
            <feComponentTransfer in="mono" result="hardNoise">
              <feFuncR type="linear" slope="1.7" intercept="-0.28" />
              <feFuncG type="linear" slope="1.7" intercept="-0.28" />
              <feFuncB type="linear" slope="1.7" intercept="-0.28" />
            </feComponentTransfer>
            <feComposite in="hardNoise" in2="SourceGraphic" operator="in" result="noiseInType" />
            <feBlend in="SourceGraphic" in2="noiseInType" mode="multiply" />
          </filter>
          <filter id="hero-field-noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" seed="71" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      <svg className="hero-field-grain" aria-hidden="true">
        <rect width="100%" height="100%" filter="url(#hero-field-noise)" />
      </svg>

      <motion.div
        ref={titleRef}
        className="hero-title-wrap"
        variants={heroContainer}
        initial={false}
        animate="show"
      >
        <h1 id="signal-title" className="hero-title" aria-label="Yuchao Wang">
          <span className="hero-title__row hero-title__row--top" data-text="YUCHAO">YUCHAO</span>
          <span className="hero-title__row hero-title__row--bottom" data-text="WANG">WANG</span>
        </h1>
      </motion.div>

      <div className="hero-registration hero-registration--left" aria-hidden="true">
        <span>REC 00 / SIGNAL</span>
        <span>33°52&apos;S / 151°12&apos;E</span>
      </div>

      <motion.div
        className="signal-status signal-status--hero"
        initial={false}
        animate={{ opacity: 1 }}
        aria-live="polite"
      >
        <span aria-hidden="true" /> {channelOpen ? "CHANNEL OPEN" : "SIGNAL DETECTED"}
      </motion.div>

      <motion.div
        ref={bandRef}
        className="signal-rift"
        initial={false}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: 0.06, ease: "easeOut" }}
      >
        <div className="signal-rift__paper">
          <PaperSurface />
          <div className="signal-cipher signal-cipher--a" aria-hidden="true">
            001&nbsp;&nbsp;1 00 1&nbsp;&nbsp;101&nbsp;&nbsp;00<br />
            10&nbsp;&nbsp;0011&nbsp;&nbsp;100 11&nbsp;&nbsp;0<br />
            001&nbsp;&nbsp;1001&nbsp;&nbsp;1&nbsp;&nbsp;01
          </div>
          <div className="signal-cipher signal-cipher--b" aria-hidden="true">
            01&nbsp;&nbsp;1001&nbsp;&nbsp;11&nbsp;&nbsp;01<br />
            110&nbsp;&nbsp;1&nbsp;&nbsp;0010&nbsp;&nbsp;1<br />
            01&nbsp;&nbsp;100&nbsp;&nbsp;11&nbsp;&nbsp;0
          </div>
          <SignalWave x={waveX} />
          <motion.button
            className={`signal-handle${channelOpen ? " signal-handle--open" : ""}`}
            type="button"
            aria-label="Drag the signal"
            aria-pressed={channelOpen}
            data-position={handlePosition}
            drag={shouldReduceMotion ? false : "x"}
            dragConstraints={{ left: -DRAG_LIMIT, right: DRAG_LIMIT }}
            dragElastic={0.04}
            dragMomentum={false}
            onDrag={handleDrag}
            onKeyDown={handleKeyDown}
            style={{ x: handleX }}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.08 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.08, ease: "easeOut" }}
          >
            <span aria-hidden="true" />
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        className="signal-instruction"
        variants={heroContainer}
        initial={false}
        animate="show"
      >
        <motion.span variants={heroItem}>DRAG THE SIGNAL</motion.span>
        <motion.span variants={heroItem} aria-hidden="true">←&nbsp;&nbsp;&nbsp;→</motion.span>
      </motion.div>

      <motion.div
        className="hero-meta"
        variants={heroContainer}
        initial={false}
        animate="show"
      >
        <motion.p variants={heroItem}>FRONTEND / CREATIVE TECHNOLOGY</motion.p>
        <motion.a
          href="#about"
          variants={heroItem}
          whileHover={shouldReduceMotion ? undefined : { x: 3 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.08, ease: "easeOut" }}
        >
          Follow signal <span aria-hidden="true">↓</span>
        </motion.a>
      </motion.div>

      <div className="hero-registration hero-registration--right" aria-hidden="true">
        <span>CH.00</span>
        <span>SCROLL / 01</span>
      </div>
    </section>
  );
}
