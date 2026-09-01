"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGsap, gsap, prefersReducedMotion } from "@/lib/motion";
import Scramble from "@/components/fx/Scramble";
import StatusLed from "@/components/fx/StatusLed";
import { caseFiles, type CaseFile } from "@/lib/dossier";

function FileRow({ file }: { file: CaseFile }) {
  const encrypted = file.status === "ENCRYPTED";

  const inner = (
    <div
      className={`case-row group relative border border-line bg-panel/80 px-4 md:px-6 py-5 transition-colors ${
        encrypted ? "opacity-60 select-none" : "hover:bg-phos-100/40"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-4 min-w-0">
          <span className="font-tab text-[11px] tracking-[0.2em] text-phos-dim shrink-0">
            {file.id}
          </span>
          {encrypted ? (
            <span className="redacted font-display text-xl md:text-2xl">
              ▓▓▓▓▓▓▓▓▓▓▓▓
            </span>
          ) : (
            <span className="font-display text-xl md:text-2xl text-phos-500 group-hover:aberrate">
              {file.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span lang="zh" className="font-cjk text-xs text-phos-dim">
            {file.cnStatus}
          </span>
          {file.warn ? (
            <StatusLed label={file.status} color="red" />
          ) : encrypted ? (
            <span className="stamp text-xs !rotate-0 px-1.5">ENCRYPTED</span>
          ) : (
            <StatusLed label={file.status} color="acid" blink={false} />
          )}
        </div>
      </div>

      {file.blurb && (
        <p className="mt-3 font-mono text-sm leading-relaxed text-scan/80 max-w-3xl">
          <span className="text-phos-dim mr-2">&gt;</span>
          {file.blurb}
        </p>
      )}

      {file.tags && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {file.tags.map((tag) => (
            <span
              key={tag}
              className="font-tab text-[10px] tracking-[0.2em] border border-line px-2 py-0.5 text-phos-dim"
            >
              {tag}
            </span>
          ))}
          <span className="ml-auto font-mono text-xs text-acid opacity-0 group-hover:opacity-100 transition-opacity">
            &gt; OPEN LINK ↗
          </span>
        </div>
      )}
    </div>
  );

  if (encrypted || !file.href) return inner;

  const external = file.href.startsWith("http") || file.href === "#";
  return external ? (
    <a href={file.href} target={file.href === "#" ? undefined : "_blank"} rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link href={file.href}>{inner}</Link>
  );
}

/** Works archive — real projects presented as recovered case files. */
export default function CaseFilesSection() {
  const ref = useRef<HTMLElement>(null);

  useGsap(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".case-row", {
      opacity: 0,
      y: 24,
      stagger: 0.1,
      duration: 0.5,
      ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 65%" },
    });
  }, ref);

  return (
    <section ref={ref} id="case-files" className="relative px-4 md:px-8 py-24 max-w-6xl mx-auto">
      <div className="mb-8 flex items-baseline gap-4">
        <Scramble
          as="h2"
          text="CASE FILES"
          className="font-display text-3xl md:text-5xl text-phos-500"
        />
        <span lang="zh" className="font-cjk text-sm text-phos-dim">
          案件档案
        </span>
      </div>

      <div className="space-y-3">
        {caseFiles.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
      </div>
    </section>
  );
}
