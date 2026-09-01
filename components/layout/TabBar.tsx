"use client";

import { useEffect, useRef, useState } from "react";
import { useGsap, ScrollTrigger } from "@/lib/motion";
import { navTabs, FILE_STAMP } from "@/lib/dossier";

/** MR-BIOS style fixed header: wordmark, section tabs with scroll spy, UTC clock. */
export default function TabBar() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState("summary");
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setClock(
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useGsap(() => {
    navTabs.forEach((tab) => {
      ScrollTrigger.create({
        trigger: `#${tab.id}`,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) setActive(tab.id);
        },
      });
    });
  }, ref);

  return (
    <header
      ref={ref}
      className="fixed top-0 inset-x-0 z-40 border-b border-line bg-ink/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 px-4 md:px-8 h-12">
        <a
          href="#summary"
          className="block-cursor font-display text-lg text-phos-500 whitespace-nowrap"
        >
          {FILE_STAMP}
        </a>

        <nav className="flex-1 overflow-x-auto scrollbar-none">
          <ul className="flex items-center justify-center gap-1 md:gap-2">
            {navTabs.map((tab) => (
              <li key={tab.id}>
                <a
                  href={`#${tab.id}`}
                  className={`font-tab text-[11px] tracking-[0.2em] px-2 md:px-3 py-1 whitespace-nowrap transition-colors ${
                    active === tab.id
                      ? "bg-phos-500 text-black"
                      : "text-phos-dim hover:text-phos-500"
                  }`}
                >
                  [{tab.label}]
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:flex items-center gap-3 whitespace-nowrap">
          <span className="font-mono text-[11px] text-phos-dim">{clock}</span>
          <span
            lang="zh"
            className="font-cjk text-[11px] text-warn border border-warn px-1.5 py-0.5"
          >
            机密
          </span>
        </div>
      </div>
    </header>
  );
}
