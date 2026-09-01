"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import type { WaveformHandle } from "./WaveformCanvas";
import type { BinaryFieldHandle } from "./BinaryField";
import { sfx } from "@/lib/sfx";
import { hiddenMessages, allVisitedReward } from "@/lib/content";

gsap.registerPlugin(Draggable, InertiaPlugin);

type TornSignalProps = {
  sceneRef: RefObject<HTMLDivElement | null>;
  waveRef: RefObject<WaveformHandle | null>;
  binaryRef: RefObject<BinaryFieldHandle | null>;
  tearRef: RefObject<number>;
  /** commit: fully tear open (owned by PosterExperience) */
  openTear: () => void;
};

const COMMIT_P = 0.9;

/**
 * The drag brain. One invisible proxy driven by GSAP Draggable with
 * lockAxis: horizontal = scrub the signal (audio + hidden messages),
 * vertical = tear the poster open (scrub-then-commit). All per-frame writes
 * are imperative CSS-var / canvas-handle updates — zero React re-renders.
 */
export default function TornSignal({
  sceneRef,
  waveRef,
  binaryRef,
  tearRef,
  openTear,
}: TornSignalProps) {
  const hitRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const hit = hitRef.current;
    const proxy = proxyRef.current;
    if (!scene || !hit || !proxy) return;

    if (prefersReducedMotion()) {
      // click-to-tear path; no drag physics
      const onClick = () => openTear();
      hit.addEventListener("click", onClick);
      return () => hit.removeEventListener("click", onClick);
    }

    const setScrubVar = (px: number) =>
      scene.style.setProperty("--scrub-x", `${px}px`);
    const setTearVar = (p: number) => {
      tearRef.current = p;
      scene.style.setProperty("--tear-p", String(p));
    };

    const msgEl = document.getElementById("hidden-message");
    const visited = new Set<number>();
    const enteredAt = new Map<number, number>();
    let rewardShown = false;
    try {
      rewardShown = sessionStorage.getItem("sig-reward") === "1";
    } catch {
      /* ignore */
    }

    let vel = 0;
    let lastOffset = 0;
    let lastTearP = 0;
    let axis: "x" | "y" | null = null;
    let settling: gsap.core.Tween | null = null;

    const showMessage = (text: string | null, opacity: number) => {
      if (!msgEl) return;
      if (text !== null) msgEl.textContent = text;
      msgEl.style.opacity = String(opacity);
    };

    const handleScrub = (rawX: number) => {
      const MAX = window.innerWidth * 0.4;
      const offset =
        Math.sign(rawX) * MAX * (1 - Math.exp(-Math.abs(rawX) / MAX));
      vel = vel * 0.7 + (offset - lastOffset) * 0.3;
      lastOffset = offset;

      setScrubVar(offset);
      waveRef.current?.setScrub(offset, vel);
      binaryRef.current?.setChurn(Math.min(Math.abs(vel) / 30, 1));
      sfx.scrubUpdate(vel);

      // hidden message zones
      const s = offset / MAX; // -1..1
      let active = -1;
      hiddenMessages.forEach((m, i) => {
        if (s >= m.zone[0] && s <= m.zone[1]) active = i;
      });
      if (active >= 0) {
        const m = hiddenMessages[active];
        const mid = (m.zone[0] + m.zone[1]) / 2;
        const half = (m.zone[1] - m.zone[0]) / 2;
        const prox = 1 - Math.min(Math.abs(s - mid) / half, 1);
        showMessage(m.text, prox);
        if (!enteredAt.has(active)) enteredAt.set(active, performance.now());
        else if (
          performance.now() - (enteredAt.get(active) ?? 0) > 400 &&
          !visited.has(active)
        ) {
          visited.add(active);
        }
      } else {
        enteredAt.clear();
        showMessage(null, 0);
      }

      if (visited.size === hiddenMessages.length && !rewardShown) {
        rewardShown = true;
        try {
          sessionStorage.setItem("sig-reward", "1");
        } catch {
          /* ignore */
        }
        showMessage(allVisitedReward, 1);
        gsap.to(msgEl, { opacity: 0, delay: 4, duration: 1 });
      }
    };

    const handleTear = (rawY: number) => {
      const p = Math.pow(
        Math.min(Math.max(rawY / (window.innerHeight * 0.4), 0), 1.1),
        0.92
      );
      setTearVar(p);
      waveRef.current?.setTear(p);
      if (Math.abs(p - lastTearP) > 0.05) {
        sfx.tearGrain(Math.abs(p - lastTearP) * 6);
        lastTearP = p;
      }
    };

    const drag = Draggable.create(proxy, {
      type: "x,y",
      trigger: hit,
      lockAxis: true,
      cursor: "grab",
      activeCursor: "grabbing",
      onPress() {
        settling?.kill();
        vel = 0;
        axis = null;
      },
      onDrag(this: Draggable) {
        if (axis === null) {
          // lockAxis zeroes the non-dominant axis; infer from movement
          if (Math.abs(this.x) < 4 && Math.abs(this.y) < 4) return;
          axis = Math.abs(this.x) >= Math.abs(this.y) ? "x" : "y";
        }
        if (axis === "x") handleScrub(this.x);
        else if (this.y > 0) handleTear(this.y);
      },
      onDragEnd(this: Draggable) {
        const state = { x: this.x, y: this.y };
        gsap.set(proxy, { x: 0, y: 0 });

        if (axis === "x") {
          sfx.scrubEnd();
          const obj = { o: lastOffset };
          settling = gsap.to(obj, {
            o: 0,
            duration: 0.9,
            ease: "elastic.out(1, 0.35)",
            onUpdate() {
              setScrubVar(obj.o);
              waveRef.current?.setScrub(obj.o, (obj.o - lastOffset) * 0.3);
              lastOffset = obj.o;
            },
            onComplete() {
              binaryRef.current?.setChurn(0);
              showMessage(null, 0);
            },
          });
          return;
        }

        // vertical: commit or snap back
        const p = tearRef.current;
        const vy = InertiaPlugin.getVelocity(proxy, "y") || 0;
        if (state.y > 0 && (p >= COMMIT_P || vy > 900)) {
          openTear();
        } else if (p > 0) {
          sfx.snapClose();
          const obj = { p };
          settling = gsap.to(obj, {
            p: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.45)",
            onUpdate() {
              setTearVar(obj.p);
              waveRef.current?.setTear(obj.p);
            },
          });
          lastTearP = 0;
        }
      },
    })[0];

    // velocity tracking for the commit decision
    InertiaPlugin.track(proxy, "x,y");

    return () => {
      drag.kill();
      settling?.kill();
    };
  }, [sceneRef, waveRef, binaryRef, tearRef, openTear]);

  return (
    <>
      {/* drag hit area over the rip */}
      <div
        ref={hitRef}
        className="absolute inset-x-0 z-20"
        style={{
          top: "calc(50vh - 90px)",
          height: 180,
          touchAction: "none",
        }}
        aria-label="Drag the signal"
        role="slider"
        aria-valuenow={0}
        tabIndex={0}
      />
      {/* invisible drag proxy */}
      <div ref={proxyRef} className="absolute w-px h-px opacity-0" />
    </>
  );
}
