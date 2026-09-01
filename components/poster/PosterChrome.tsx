"use client";

import { posterChrome, navLinks, type PanelId } from "@/lib/content";

type PosterChromeProps = {
  onNav: (panel: PanelId) => void;
  /** hint text under the rip (drag vs click variant) */
  hint: string;
};

/** Mono labels + nav from the mockup. Nav is real links; rest is decoration. */
export default function PosterChrome({ onNav, hint }: PosterChromeProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      {/* top corners */}
      <span className="sig-label absolute top-8 left-8 text-x-white">
        {posterChrome.topLeft}
      </span>
      <span className="sig-label absolute top-8 right-8 text-x-white">
        {posterChrome.topRight}
      </span>

      {/* tear-line row: nav left, contact right, signal center */}
      <div
        className="absolute inset-x-0 flex items-baseline justify-between px-8 md:px-12"
        style={{ top: "calc(50vh - 88px)" }}
      >
        <nav className="pointer-events-auto flex gap-8 md:gap-14">
          {navLinks.slice(0, 2).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNav(l.id);
              }}
              className="sig-label text-x-white hover:text-phos transition-colors cursor-pointer"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <span className="sig-label blink text-phos hidden md:inline">
          {posterChrome.signalDetected}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNav("contact");
          }}
          className="sig-label pointer-events-auto text-x-white hover:text-phos transition-colors cursor-pointer"
        >
          {navLinks[2].label}
        </button>
      </div>

      {/* drag hint under the rip (difference blend keeps it legible over the letters) */}
      <div
        className="absolute inset-x-0 flex justify-center mix-blend-difference"
        style={{ top: "calc(50vh + 64px)" }}
      >
        <span className="sig-label text-x-white">{hint}</span>
      </div>

      {/* hidden message slot (TornSignal writes into it) */}
      <div
        id="hidden-message"
        className="absolute inset-x-0 text-center font-mono text-xs tracking-[0.4em] text-phos opacity-0"
        style={{ top: "calc(50vh + 96px)" }}
      />
    </div>
  );
}
