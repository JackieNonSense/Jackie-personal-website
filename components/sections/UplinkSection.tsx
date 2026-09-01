"use client";

import { useRef } from "react";
import { useGsap, gsap, prefersReducedMotion } from "@/lib/motion";
import Panel from "@/components/ui/Panel";
import Scramble from "@/components/fx/Scramble";
import { contactLinks } from "@/lib/dossier";

/** Contact — establishing an uplink to the subject. */
export default function UplinkSection() {
  const ref = useRef<HTMLElement>(null);

  useGsap(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".uplink-line", {
      opacity: 0,
      stagger: 0.15,
      duration: 0.3,
      scrollTrigger: { trigger: ref.current, start: "top 70%" },
    });
  }, ref);

  return (
    <section ref={ref} id="uplink" className="relative px-4 md:px-8 py-24 max-w-6xl mx-auto">
      <div className="mb-8 flex items-baseline gap-4">
        <Scramble
          as="h2"
          text="ESTABLISH UPLINK"
          className="font-display text-3xl md:text-5xl text-phos-500"
        />
        <span lang="zh" className="font-cjk text-sm text-phos-dim">
          建立连接
        </span>
      </div>

      <Panel title="TRANSMISSION" cn="通讯">
        <div className="font-mono text-xs text-phos-dim space-y-1 mb-8">
          <p className="uplink-line">&gt; INITIATING HANDSHAKE... OK</p>
          <p className="uplink-line">&gt; CHANNEL SECURE. ENCRYPTION: NONE (SUBJECT PREFERS OPENNESS)</p>
          <p className="uplink-line">
            &gt; SELECT CHANNEL <span className="block-cursor" />
          </p>
        </div>

        <div className="space-y-1">
          {contactLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="uplink-line group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-4 hover:bg-phos-100/40 transition-colors px-2 -mx-2"
            >
              <span className="font-tab text-xs tracking-[0.25em] text-phos-dim group-hover:text-acid transition-colors">
                {link.label}
              </span>
              <span className="font-display text-lg md:text-2xl text-scan group-hover:text-phos-500 group-hover:aberrate transition-colors break-all">
                {link.value}
              </span>
            </a>
          ))}
        </div>
      </Panel>
    </section>
  );
}
