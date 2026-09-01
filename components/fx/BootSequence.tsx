"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const BOOT_LINES = [
  "JR INDUSTRIES (C) 1981 — UNIFIED OPERATING SYSTEM",
  "BIOS CHECK............................ OK",
  "MEMTEST 640K.......................... OK",
  "PHOSPHOR ARRAY........................ ONLINE",
  "DECRYPTING ARCHIVE.................... 密钥有效",
  "LOADING SUBJECT FILE A-34...",
];

const BAR_STEPS = [0, 15, 30, 32, 50, 65, 70, 85, 95, 100];

/**
 * First-load boot overlay. sessionStorage-gated, any key/click skips.
 * Total runtime ≤ 2.5s; reduced-motion users never see it.
 */
export default function BootSequence() {
  const [phase, setPhase] = useState<"pending" | "run" | "done">("pending");
  const [lineCount, setLineCount] = useState(0);
  const [bar, setBar] = useState(-1);
  const [fading, setFading] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      let seen = true;
      try {
        seen = sessionStorage.getItem("jr_boot") === "1";
      } catch {
        // storage unavailable — treat as seen to avoid replay loops
      }
      setPhase(seen || prefersReducedMotion() ? "done" : "run");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "run") return;

    document.body.style.overflow = "hidden";

    const finish = () => {
      try {
        sessionStorage.setItem("jr_boot", "1");
      } catch {
        // ignore
      }
      setFading(true);
      timers.current.push(setTimeout(() => setPhase("done"), 400));
    };

    // Schedule: lines at 180ms cadence, then progress bar, then finish
    BOOT_LINES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setLineCount(i + 1), i * 180));
    });
    const barStart = BOOT_LINES.length * 180 + 100;
    BAR_STEPS.forEach((_, i) => {
      timers.current.push(setTimeout(() => setBar(i), barStart + i * 90));
    });
    timers.current.push(setTimeout(finish, barStart + BAR_STEPS.length * 90 + 200));

    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      document.body.style.overflow = "";
    };
  }, [phase]);

  if (phase !== "run") return null;

  const pct = bar >= 0 ? BAR_STEPS[Math.min(bar, BAR_STEPS.length - 1)] : 0;
  const filled = Math.round((pct / 100) * 24);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      <div className="scanlines absolute inset-0" />
      <div className="w-full max-w-xl px-6 font-mono text-sm text-phos-500 space-y-1">
        {BOOT_LINES.slice(0, lineCount).map((line, i) => (
          <p key={i}>
            <span className="text-phos-dim mr-2">&gt;</span>
            {line}
          </p>
        ))}
        {bar >= 0 && (
          <p className="pt-2 tracking-tighter">
            [{"█".repeat(filled)}
            {"░".repeat(24 - filled)}] {pct}%
          </p>
        )}
        <p className="pt-4 text-[11px] text-phos-dim animate-pulse">
          PRESS ANY KEY TO SKIP
        </p>
      </div>
    </div>
  );
}
