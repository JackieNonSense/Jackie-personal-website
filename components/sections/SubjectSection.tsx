"use client";

import { useRef } from "react";
import { useGsap, gsap, prefersReducedMotion } from "@/lib/motion";
import Panel from "@/components/ui/Panel";
import DossierRow from "@/components/ui/DossierRow";
import DitherImage from "@/components/fx/DitherImage";
import Waveform from "@/components/fx/Waveform";
import Scramble from "@/components/fx/Scramble";
import { dossierRows, subjectNotes } from "@/lib/dossier";

/** SUBJECT specimen card — the About section as an investigation dossier. */
export default function SubjectSection() {
  const ref = useRef<HTMLElement>(null);

  useGsap(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".dossier-row", {
      opacity: 0,
      x: -12,
      stagger: 0.08,
      duration: 0.4,
      ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 60%" },
    });
  }, ref);

  return (
    <section ref={ref} id="subject" className="relative px-4 md:px-8 py-24 max-w-6xl mx-auto">
      <div className="mb-8 flex items-baseline gap-4">
        <Scramble
          as="h2"
          text="SUBJECT DOSSIER"
          className="font-display text-3xl md:text-5xl text-phos-500"
        />
        <span lang="zh" className="font-cjk text-sm text-phos-dim">
          档案
        </span>
      </div>

      <Panel title="SPECIMEN RECORD" cn="标本记录">
        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          {/* Left: dithered portrait + vitals */}
          <div className="space-y-4">
            <div className="border border-line p-1 bg-black">
              <DitherImage src="/about-avatar.jpg" alt="Subject portrait — Jackie" />
            </div>
            <div aria-hidden className="barcode h-8 opacity-70" />
            <div>
              <p className="font-tab text-[10px] tracking-[0.25em] text-phos-dim mb-1">
                VITALS
              </p>
              <Waveform width={260} height={48} className="w-full" />
            </div>
          </div>

          {/* Right: dossier table + notes */}
          <div>
            <div>
              {dossierRows.map((row) => (
                <DossierRow
                  key={row.k}
                  k={row.k}
                  v={row.v}
                  accent={"accent" in row && Boolean(row.accent)}
                />
              ))}
            </div>

            <div className="mt-6">
              <p className="font-tab text-[10px] tracking-[0.25em] text-phos-dim mb-2">
                NOTES / <span lang="zh" className="font-cjk">观察记录</span>
              </p>
              <div className="font-mono text-sm leading-relaxed text-scan/90 space-y-1.5">
                {subjectNotes.map((line, i) => (
                  <p key={i} className="dossier-row">
                    <span className="text-phos-dim mr-2">&gt;</span>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </section>
  );
}
