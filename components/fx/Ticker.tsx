"use client";

import { tickerText } from "@/lib/dossier";

type TickerProps = {
  reverse?: boolean;
};

/** Infinite marquee strip of EN/CN micro-text. */
export default function Ticker({ reverse }: TickerProps) {
  const content = tickerText.repeat(3);
  return (
    <div
      aria-hidden
      className="overflow-hidden border-y border-line bg-panel py-1.5 select-none"
    >
      <div
        className={`ticker-track whitespace-nowrap font-cjk text-[11px] tracking-[0.3em] text-phos-dim ${
          reverse ? "reverse" : ""
        }`}
      >
        <span>{content}</span>
        <span>{content}</span>
      </div>
    </div>
  );
}
