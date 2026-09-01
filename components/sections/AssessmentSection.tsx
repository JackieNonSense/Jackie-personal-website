"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useGsap, gsap, prefersReducedMotion } from "@/lib/motion";
import Panel from "@/components/ui/Panel";
import Scramble from "@/components/fx/Scramble";
import { skillCategories } from "@/lib/dossier";

// Dynamic import to avoid SSR issues with Three.js (easter egg — do not remove)
const SecretKeyScene = dynamic(() => import("@/components/three/SecretKeyScene"), {
  ssr: false,
});

const BAR_LEN = 10;

/** Block-character proficiency bar that fills on scroll into view. */
function SkillBar({ name, level }: { name: string; level: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(() =>
    prefersReducedMotion() ? level : 0
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          let n = 0;
          interval = setInterval(() => {
            n++;
            setFilled(Math.min(n, level));
            if (n >= level && interval) clearInterval(interval);
          }, 60);
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [level]);

  return (
    <div ref={ref} className="flex items-center justify-between gap-3 font-mono text-sm">
      <span className="text-scan/90">{name}</span>
      <span className="text-phos-500 tracking-tighter select-none" aria-label={`${level} of ${BAR_LEN}`}>
        {"█".repeat(filled)}
        <span className="text-phos-100">{"░".repeat(BAR_LEN - filled)}</span>
      </span>
    </div>
  );
}

/** Capability assessment — the Skills section as a lab evaluation report. */
export default function AssessmentSection() {
  const ref = useRef<HTMLElement>(null);

  useGsap(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".assess-panel", {
      opacity: 0,
      y: 40,
      stagger: 0.12,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 65%" },
    });
  }, ref);

  return (
    <section ref={ref} id="assessment" className="relative px-4 md:px-8 py-24 max-w-6xl mx-auto">
      <div className="mb-8 flex items-baseline gap-4">
        <Scramble
          as="h2"
          text="CAPABILITY ASSESSMENT"
          className="font-display text-3xl md:text-5xl text-phos-500"
        />
        <span lang="zh" className="font-cjk text-sm text-phos-dim">
          检测
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {skillCategories.map((category) => (
          <div key={category.title} className="assess-panel">
            <Panel title={category.title} cn={category.cn}>
              <div className="space-y-2.5">
                {category.skills.map((skill) => (
                  <SkillBar key={skill.name} name={skill.name} level={skill.level} />
                ))}
              </div>
            </Panel>
          </div>
        ))}
      </div>

      {/* Decorative element with hidden easter egg */}
      <div className="relative z-10 mt-16 flex items-center justify-center gap-4">
        <p className="font-mono text-xs text-phos-dim/70">
          {"// always learning, always building"}
        </p>
        {/* Secret Key Easter Egg */}
        <div className="relative w-12 h-12">
          <SecretKeyScene />
        </div>
      </div>
    </section>
  );
}
