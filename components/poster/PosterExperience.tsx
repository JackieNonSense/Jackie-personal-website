"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import PosterScene from "./PosterScene";
import PosterChrome from "./PosterChrome";
import TornSignal from "./TornSignal";
import GrainOverlay from "./GrainOverlay";
import CopyPreloader from "./CopyPreloader";
import type { WaveformHandle } from "./WaveformCanvas";
import type { BinaryFieldHandle } from "./BinaryField";
import { sfx } from "@/lib/sfx";
import { posterChrome, type PanelId } from "@/lib/content";

type Mode = "poster" | "opening" | "open" | "closing";

/**
 * Top level: poster ↔ content navigation. Owns the open/close timelines
 * (scrub-then-commit: TornSignal previews --tear-p, commit plays it out).
 */
export default function PosterExperience() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveformHandle>(null);
  const binaryRef = useRef<BinaryFieldHandle>(null);
  const tearRef = useRef(0);
  const modeRef = useRef<Mode>("poster");
  const [mode, setMode] = useState<Mode>("poster");
  const [panel, setPanel] = useState<PanelId>("work");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReduced(prefersReducedMotion()), 0);
    return () => clearTimeout(t);
  }, []);

  const setTearVar = useCallback((p: number) => {
    tearRef.current = p;
    sceneRef.current?.style.setProperty("--tear-p", String(p));
  }, []);

  const openTear = useCallback(
    (target: PanelId = "work") => {
      if (modeRef.current !== "poster") return;
      modeRef.current = "opening";
      setMode("opening");
      setPanel(target);
      sfx.tearOpen();

      const scene = sceneRef.current;
      const interior = document.getElementById("rip-interior");
      const obj = { p: tearRef.current };
      const done = () => {
        modeRef.current = "open";
        setMode("open");
        try {
          history.replaceState(null, "", `#${target}`);
        } catch {
          /* ignore */
        }
      };

      if (prefersReducedMotion()) {
        setTearVar(2.4);
        if (interior) interior.style.opacity = "0";
        done();
        return;
      }

      const tl = gsap.timeline({ onComplete: done });
      tl.to(obj, {
        p: 2.4,
        duration: 0.85,
        ease: "power3.in",
        onUpdate: () => {
          setTearVar(obj.p);
          waveRef.current?.setTear(Math.min(obj.p, 1.1));
        },
      });
      if (interior) {
        tl.to(interior, { opacity: 0, duration: 0.4 }, 0.35);
      }
      if (scene) {
        tl.to(
          scene.querySelectorAll(".sig-label"),
          { opacity: 0, duration: 0.3 },
          0.2
        );
      }
    },
    [setTearVar]
  );

  const close = useCallback(() => {
    if (modeRef.current !== "open") return;
    modeRef.current = "closing";
    setMode("closing");
    try {
      history.replaceState(null, "", location.pathname);
    } catch {
      /* ignore */
    }

    const scene = sceneRef.current;
    const interior = document.getElementById("rip-interior");
    const obj = { p: tearRef.current };
    const done = () => {
      modeRef.current = "poster";
      setMode("poster");
    };

    if (prefersReducedMotion()) {
      setTearVar(0);
      if (interior) interior.style.opacity = "1";
      done();
      return;
    }

    const tl = gsap.timeline({ onComplete: done });
    tl.to(obj, {
      p: 0,
      duration: 1,
      ease: "power4.out",
      onUpdate: () => {
        setTearVar(obj.p);
        waveRef.current?.setTear(Math.min(obj.p, 1.1));
      },
    });
    if (interior) tl.to(interior, { opacity: 1, duration: 0.4 }, 0.2);
    if (scene) {
      tl.to(
        scene.querySelectorAll(".sig-label"),
        { opacity: 1, duration: 0.3 },
        0.5
      );
    }
    sfx.paper();
  }, [setTearVar]);

  // deep link: #work / #about / #contact loads straight into open state
  useEffect(() => {
    const h = location.hash.replace("#", "") as PanelId;
    if (h === "work" || h === "about" || h === "contact") {
      setPanel(h);
      setTearVar(2.4);
      const interior = document.getElementById("rip-interior");
      if (interior) interior.style.opacity = "0";
      modeRef.current = "open";
      setMode("open");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posterVisible = mode !== "open";

  return (
    <>
      {/* content layer (CP1 placeholder — panels land in CP2) */}
      <div
        className="fixed inset-0 z-0 bg-x-deep flex flex-col items-center justify-center gap-8"
        aria-hidden={posterVisible}
        {...(posterVisible ? { inert: true } : {})}
      >
        <p className="font-mono text-sm tracking-[0.4em] text-phos">
          {`// SIGNAL OPENED — ${panel.toUpperCase()} —`}
        </p>
        <p className="font-mono text-xs text-x-grey">
          content layer arrives in checkpoint 2
        </p>
        <button
          type="button"
          onClick={close}
          className="sig-label text-x-white hover:text-phos transition-colors cursor-pointer"
        >
          CLOSE THE TEAR
        </button>
      </div>

      {/* poster */}
      <div
        style={{
          visibility: posterVisible ? "visible" : "hidden",
          pointerEvents: posterVisible ? "auto" : "none",
        }}
      >
        <PosterScene ref={sceneRef} waveRef={waveRef} binaryRef={binaryRef}>
          <PosterChrome
            onNav={openTear}
            hint={reduced ? posterChrome.clickHint : posterChrome.dragHint}
          />
          <TornSignal
            sceneRef={sceneRef}
            waveRef={waveRef}
            binaryRef={binaryRef}
            tearRef={tearRef}
            openTear={() => openTear("work")}
          />
        </PosterScene>
      </div>

      <GrainOverlay />
      <CopyPreloader />
    </>
  );
}
