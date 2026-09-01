"use client";

import { useEffect, useState } from "react";
import PaperCard from "../paper/PaperCard";
import Tape from "../paper/Tape";
import { notebookPages, skillGroups } from "@/lib/content";
import { sfx } from "@/lib/sfx";

type NotebookOverlayProps = { onClose: () => void };

/** Open notebook spread — the About section as flippable handwritten pages. */
export default function NotebookOverlay({ onClose }: NotebookOverlayProps) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, notebookPages.length - 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = notebookPages[page];

  const flip = (dir: 1 | -1) => {
    sfx.paper();
    setPage((p) => Math.min(Math.max(p + dir, 0), notebookPages.length - 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-label="My notebook"
    >
      <div onClick={(e) => e.stopPropagation()} className="relative">
        <PaperCard
          tilt={-1}
          className="relative w-[min(88vw,640px)] min-h-[420px] p-8 md:p-10"
        >
          <Tape rotate={-6} className="absolute -top-3 left-10" />
          <Tape rotate={5} className="absolute -top-3 right-12" />

          {/* faint ruled lines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-24 bottom-16 opacity-25"
            style={{
              background:
                "repeating-linear-gradient(to bottom, transparent 0 30px, var(--ink-soft) 30px 31px)",
            }}
          />

          <h2
            className="text-4xl mb-6 -rotate-1"
            style={{ fontFamily: "var(--font-hand-display)" }}
          >
            {current.title}
          </h2>

          {"lines" in current && current.lines && (
            <div className="relative space-y-2 text-2xl leading-[30px]">
              {current.lines.map((line, i) => (
                <p key={i} className={i % 2 ? "rotate-[0.3deg]" : "-rotate-[0.3deg]"}>
                  {line}
                </p>
              ))}
            </div>
          )}

          {"photo" in current && current.photo && (
            <div className="absolute right-8 top-16 rotate-3 bg-white p-2 pb-6 shadow-[3px_4px_0_rgba(0,0,0,0.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/about-avatar.jpg"
                alt="me"
                className="w-28 h-28 object-cover"
                style={{ filter: "sepia(0.25) contrast(1.05)" }}
              />
              <Tape rotate={2} className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-5" />
            </div>
          )}

          {"skills" in current && current.skills && (
            <div className="relative grid grid-cols-2 gap-x-8 gap-y-4">
              {skillGroups.map((group, gi) => (
                <div key={group.name} className={gi % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
                  <p
                    className="text-2xl underline decoration-wavy decoration-1 underline-offset-4 mb-1"
                    style={{ fontFamily: "var(--font-hand-display)" }}
                  >
                    {group.name}
                  </p>
                  <p className="text-xl leading-7 text-ink-soft">
                    {group.items.join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* page controls */}
          <div className="mt-8 flex items-center justify-between text-2xl" style={{ fontFamily: "var(--font-hand-display)" }}>
            <button
              onClick={() => flip(-1)}
              disabled={page === 0}
              className="wobble hover:-rotate-3 disabled:opacity-25 cursor-pointer"
              aria-label="previous page"
            >
              ← flip back
            </button>
            <span className="text-ink-soft text-lg">
              {page + 1} / {notebookPages.length}
            </span>
            <button
              onClick={() => flip(1)}
              disabled={page === notebookPages.length - 1}
              className="wobble hover:rotate-3 disabled:opacity-25 cursor-pointer"
              aria-label="next page"
            >
              flip →
            </button>
          </div>
        </PaperCard>

        <button
          onClick={onClose}
          aria-label="close notebook"
          className="hand-label absolute -top-5 -right-5 w-12 h-12 text-2xl rotate-6 wobble hover:rotate-12 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
