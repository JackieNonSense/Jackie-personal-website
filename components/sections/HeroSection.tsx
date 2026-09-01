"use client";

import { useRef } from "react";
import { useGsap, gsap, prefersReducedMotion } from "@/lib/motion";
import Scramble from "@/components/fx/Scramble";
import StatusLed from "@/components/fx/StatusLed";
import Waveform from "@/components/fx/Waveform";
import { SUBJECT_ID } from "@/lib/dossier";

/** Dossier cover: outlined display name over the dot-matrix field. */
export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);

  useGsap(() => {
    if (prefersReducedMotion()) return;

    // Wireframe -> solid scanning band sweep on the name
    gsap.fromTo(
      ".hero-name-fill",
      { clipPath: "inset(0 100% 0 0)" },
      {
        clipPath: "inset(0 0% 0 0)",
        duration: 2.2,
        ease: "steps(24)",
        delay: 0.4,
      }
    );
    // Stamp slams in
    gsap.fromTo(
      ".hero-stamp",
      { scale: 1.6, opacity: 0 },
      { scale: 1, opacity: 0.9, duration: 0.35, ease: "power3.in", delay: 2.4 }
    );
  }, ref);

  return (
    <section
      ref={ref}
      id="summary"
      className="relative min-h-screen flex flex-col justify-between px-4 md:px-8 pt-20 pb-6"
    >
      {/* Top meta block */}
      <div className="flex items-start justify-between">
        <div className="font-mono text-[11px] leading-relaxed text-phos-dim select-none">
          <p>&gt; FILE ID: SUBJ-{SUBJECT_ID}</p>
          <p>
            &gt; <span lang="zh" className="font-cjk">档案编号</span>: 1981-1127-A
          </p>
          <p>&gt; CLEARANCE: LEVEL 5 REQUIRED</p>
          <p>&gt; RECOVERED FROM: LAB 7 MAINFRAME</p>
        </div>

        <div className="hero-stamp stamp text-2xl md:text-3xl select-none">
          TOP SECRET
        </div>
      </div>

      {/* Center: the name */}
      <div className="relative select-none" aria-label="Yuchao Wang">
        <div
          aria-hidden
          className="text-outline font-display leading-[0.85] text-[clamp(4rem,14vw,12rem)]"
        >
          YUCHAO
          <br />
          WANG
        </div>
        <div
          aria-hidden
          className="hero-name-fill absolute inset-0 font-display leading-[0.85] text-[clamp(4rem,14vw,12rem)] text-phos-500"
          style={{ clipPath: "inset(0 0% 0 0)" }}
        >
          YUCHAO
          <br />
          WANG
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Scramble
            as="p"
            text={`FRONTEND ENGINEER / SUBJECT #${SUBJECT_ID}`}
            className="font-tab text-sm md:text-base tracking-[0.3em] text-acid"
          />
          <StatusLed label="SYS OK" />
          <StatusLed label="UPLINK STANDBY" color="acid" />
        </div>
      </div>

      {/* Bottom: prompt + waveform */}
      <div className="flex items-end justify-between gap-6">
        <p className="font-mono text-xs tracking-[0.2em] text-phos-dim animate-pulse">
          &gt; SCROLL TO DECRYPT ▼
        </p>
        <Waveform width={280} height={48} className="opacity-50 hidden md:block" />
      </div>
    </section>
  );
}
