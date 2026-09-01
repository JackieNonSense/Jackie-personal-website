"use client";

import { useState, type ReactNode } from "react";

type PanelProps = {
  title?: string;
  cn?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

/** 1px-border dossier panel with corner ticks and a title strip. */
export default function Panel({ title, cn, children, className = "", id }: PanelProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      id={id}
      className={`relative border border-line bg-panel/80 ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Corner ticks */}
      <span aria-hidden className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-phos-500" />
      <span aria-hidden className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-phos-500" />
      <span aria-hidden className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-phos-500" />
      <span aria-hidden className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-phos-500" />

      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <span
            className={`font-tab text-xs tracking-[0.25em] text-phos-500 ${hover ? "aberrate" : ""}`}
          >
            {title}
          </span>
          {cn && (
            <span className="font-cjk text-xs text-phos-dim" lang="zh">
              {cn}
            </span>
          )}
        </div>
      )}
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
