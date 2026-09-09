"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const dossier = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const dossierLine = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function MegacityAbout() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<SVGSVGElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (shouldReduceMotion || !sectionRef.current) return;

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.65,
        },
      });

      timeline
        .fromTo(copyRef.current, { yPercent: 9 }, { yPercent: -5 }, 0)
        .fromTo(cityRef.current, { yPercent: 13 }, { yPercent: -9 }, 0);
    },
    {
      scope: sectionRef,
      dependencies: [shouldReduceMotion],
      revertOnUpdate: true,
    },
  );

  return (
    <section ref={sectionRef} id="about" className="megacity-about" aria-labelledby="about-title">
      <div className="megacity-about__sticky">
        <motion.div
          ref={copyRef}
          className="about-copy"
          variants={dossier}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-18%" }}
        >
          <motion.p className="chapter-kicker" variants={dossierLine}>
            <span>01 / MEGACITY</span>
            <span>SUBJECT LOCATED</span>
          </motion.p>

          <motion.h2 id="about-title" variants={dossierLine}>
            Designing systems
            <span> for people who notice the details.</span>
          </motion.h2>

          <motion.p className="about-lede" variants={dossierLine}>
            I&apos;m Yuchao Wang — a Sydney-based developer working where interface,
            motion and creative technology meet. I like turning complicated systems
            into experiences that feel direct, strange and unmistakably human.
          </motion.p>

          <motion.dl className="identity-grid" variants={dossier}>
            <motion.div variants={dossierLine}>
              <dt>ROLE</dt>
              <dd>Creative Developer</dd>
            </motion.div>
            <motion.div variants={dossierLine}>
              <dt>BASE</dt>
              <dd>Sydney, Australia</dd>
            </motion.div>
            <motion.div variants={dossierLine}>
              <dt>FOCUS</dt>
              <dd>Design · Code · Experiment</dd>
            </motion.div>
            <motion.div variants={dossierLine}>
              <dt>STATUS</dt>
              <dd className="identity-grid__online">Open to interesting work</dd>
            </motion.div>
          </motion.dl>
        </motion.div>

        <motion.figure
          className="city-sector"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-12%" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: "easeOut" }}
        >
          <svg
            ref={cityRef}
            viewBox="0 0 900 760"
            role="img"
            aria-label="Megacity sector map"
            preserveAspectRatio="xMidYMid meet"
          >
            <title>Megacity sector map</title>
            <defs>
              <pattern id="city-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.22" />
              </pattern>
              <pattern id="city-dots" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.9" fill="currentColor" opacity="0.45" />
              </pattern>
              <clipPath id="sector-cut">
                <path d="M70 86 L765 34 L848 138 L812 654 L168 720 L54 612 Z" />
              </clipPath>
            </defs>

            <g clipPath="url(#sector-cut)" className="city-sector__paper">
              <rect x="0" y="0" width="900" height="760" className="city-sector__base" />
              <rect x="0" y="0" width="900" height="760" fill="url(#city-grid)" />

              <g className="city-sector__blueprint">
                <path d="M42 586 L858 586 M42 604 L858 604 M118 540 L810 540" />
                <path d="M104 586 L104 338 L214 338 L214 586" />
                <path d="M236 586 L236 252 L356 252 L356 586" />
                <path d="M378 586 L378 128 L526 128 L526 586" />
                <path d="M548 586 L548 312 L650 312 L650 586" />
                <path d="M674 586 L674 204 L794 204 L794 586" />
                <path d="M395 128 L414 82 L490 82 L510 128" />
                <path d="M448 82 L448 24" />
                <path d="M252 252 L276 206 L330 206 L344 252" />
                <path d="M694 204 L716 166 L766 166 L782 204" />
              </g>

              <g className="city-sector__windows">
                <path d="M122 374 H196 M122 410 H196 M122 446 H196 M122 482 H196 M122 518 H196" />
                <path d="M254 286 H338 M254 326 H338 M254 366 H338 M254 406 H338 M254 446 H338 M254 486 H338 M254 526 H338" />
                <path d="M398 164 H506 M398 208 H506 M398 252 H506 M398 296 H506 M398 340 H506 M398 384 H506 M398 428 H506 M398 472 H506 M398 516 H506" />
                <path d="M566 350 H632 M566 390 H632 M566 430 H632 M566 470 H632 M566 510 H632" />
                <path d="M692 242 H776 M692 282 H776 M692 322 H776 M692 362 H776 M692 402 H776 M692 442 H776 M692 482 H776 M692 522 H776" />
              </g>

              <path className="city-sector__rail" d="M12 486 C170 430 284 468 426 410 C566 354 706 390 892 306" />
              <path className="city-sector__rail city-sector__rail--echo" d="M12 500 C170 444 284 482 426 424 C566 368 706 404 892 320" />
              <rect x="0" y="0" width="900" height="760" fill="url(#city-dots)" opacity="0.34" />
            </g>

            <g className="city-sector__annotations">
              <path d="M70 68 H246 M70 68 V104" />
              <text x="82" y="57">SECTOR 77A / ELEVATED LINE</text>
              <path d="M650 692 H840 M840 692 V648" />
              <text x="665" y="716">SIGNAL NODE / SYD</text>
              <circle cx="448" cy="410" r="7" />
              <path d="M448 410 L610 650" />
              <text x="620" y="646">33°52&apos;S</text>
              <text x="620" y="665">151°12&apos;E</text>
            </g>
          </svg>
          <figcaption>
            <span>A. CITY AS INTERFACE</span>
            <span>LIVE SECTOR / 01</span>
          </figcaption>
        </motion.figure>

        <div className="about-signal" aria-hidden="true">
          <span />
        </div>

        <motion.div
          id="next"
          className="next-chapter"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: "easeOut" }}
        >
          <span>CHAPTER 02</span>
          <span>OBJECT INVENTORY / PENDING</span>
        </motion.div>
      </div>
    </section>
  );
}
