"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sfx";

const STEPS = [0, 12, 29, 31, 48, 63, 66, 81, 94, 100];

/**
 * Photocopier warm-up preloader: a copier lamp sweeps while the poster is
 * "being copied". Session-gated, skippable, ≤1.8s, hands off into the poster.
 */
export default function CopyPreloader() {
  const [phase, setPhase] = useState<"pending" | "run" | "done">("pending");
  const [pct, setPct] = useState(0);
  const [fading, setFading] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      let seen = true;
      try {
        seen = sessionStorage.getItem("sig-copy") === "1";
      } catch {
        /* ignore */
      }
      setPhase(seen || prefersReducedMotion() ? "done" : "run");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "run") return;

    const finish = () => {
      try {
        sessionStorage.setItem("sig-copy", "1");
      } catch {
        /* ignore */
      }
      sfx.paper();
      setFading(true);
      timers.current.push(setTimeout(() => setPhase("done"), 450));
    };

    STEPS.forEach((v, i) => {
      timers.current.push(setTimeout(() => setPct(v), 150 + i * 140));
    });
    timers.current.push(setTimeout(finish, 150 + STEPS.length * 140 + 150));

    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [phase]);

  if (phase !== "run") return null;

  const filled = Math.round((pct / 100) * 18);

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[80] bg-x-deep flex flex-col items-center justify-center gap-5 transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* copier lamp sweep */}
      <div
        className="absolute inset-x-0 h-24 opacity-40"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(51,255,51,0.35), transparent)",
          animation: "copy-sweep 1.1s ease-in-out infinite alternate",
        }}
      />
      <style>{`@keyframes copy-sweep { 0% { top: -10vh; } 100% { top: 95vh; } }`}</style>

      <p className="sig-label text-x-grey no-underline" style={{ textDecoration: "none" }}>
        JR PHOTOCOPY SERVICE
      </p>
      <p className="font-mono text-sm tracking-[0.3em] text-phos">
        COPYING [{"█".repeat(filled)}{"░".repeat(18 - filled)}] {pct}%
      </p>
      <p className="font-mono text-[10px] tracking-[0.3em] text-x-dim">
        ORIGINAL: WANG_YUCHAO.PSD — DO NOT REMOVE FROM TRAY
      </p>
    </div>
  );
}
