"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import ArtLayer from "./ArtLayer";
import PosterWord from "./PosterWord";
import BinaryField, { type BinaryFieldHandle } from "./BinaryField";
import WaveformCanvas, { type WaveformHandle } from "./WaveformCanvas";

const GAP = 26; // half of the resting rip height, px

/** Jagged torn-edge polygon for one half (jag on the rip-facing edge). */
function tornPolygon(edge: "bottom" | "top", jag = 22): string {
  const pts: string[] = [];
  const steps = 48;
  if (edge === "bottom") {
    pts.push("0% 0%", "100% 0%");
    for (let i = steps; i >= 0; i--) {
      const x = (i / steps) * 100;
      const y = jag * (0.35 + Math.random() * 0.65);
      pts.push(`${x.toFixed(2)}% calc(100% - ${y.toFixed(1)}px)`);
    }
  } else {
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 100;
      const y = jag * (0.35 + Math.random() * 0.65);
      pts.push(`${x.toFixed(2)}% ${y.toFixed(1)}px`);
    }
    pts.push("100% 100%", "0% 100%");
  }
  return `polygon(${pts.join(", ")})`;
}

type PosterSceneProps = {
  waveRef: RefObject<WaveformHandle | null>;
  binaryRef: RefObject<BinaryFieldHandle | null>;
  /** chrome + drag hit area render above the halves */
  children?: ReactNode;
};

/**
 * The poster layer stack. Owns CSS vars --tear-p / --scrub-x on its root
 * (written imperatively by TornSignal). The two halves carry the words and
 * torn edges and move apart with pure transforms.
 */
const PosterScene = forwardRef<HTMLDivElement, PosterSceneProps>(
  function PosterScene({ waveRef, binaryRef, children }, ref) {
    const [clips, setClips] = useState<{ top: string; bottom: string } | null>(
      null
    );

    useEffect(() => {
      // client-only: random jags would mismatch SSR
      const t = setTimeout(
        () => setClips({ top: tornPolygon("bottom"), bottom: tornPolygon("top") }),
        0
      );
      return () => clearTimeout(t);
    }, []);

    return (
      <div
        ref={ref}
        className="fixed inset-0 overflow-hidden bg-x-deep"
        style={
          { "--tear-p": 0, "--scrub-x": "0px" } as React.CSSProperties
        }
      >
        {/* static roughen filter for the fallback type (applied once, cached) */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter id="poster-rough">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.06"
              numOctaves="2"
              seed="7"
              result="n"
            />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
          </filter>
        </svg>

        {/* real headline for SEO/a11y — visually hidden */}
        <h1 className="sr-only">Yuchao Wang — frontend engineer portfolio</h1>

        {/* ── rip interior: paper + binary + waveform (z-5, under halves) ── */}
        <div id="rip-interior" className="absolute inset-0 z-[5]">
          <ArtLayer
            id="paper-inside"
            className="absolute inset-0"
            imgClassName="w-full h-full object-cover"
          >
            <div className="absolute inset-0 bg-x-white" />
            <div className="xerox-grain absolute inset-0 opacity-25 mix-blend-multiply" />
          </ArtLayer>
          <BinaryField ref={binaryRef} className="absolute inset-0 w-full h-full" />
          <div
            className="absolute inset-x-0"
            style={{
              top: "calc(50vh - 60px)",
              transform: "translateX(calc(var(--scrub-x) * 0.15))",
            }}
          >
            <WaveformCanvas ref={waveRef} className="w-full" height={120} />
          </div>
        </div>

        {/* ── top half: bg + YUCHAO + torn bottom edge (z-10) ── */}
        <div
          className="absolute inset-x-0 top-0 z-10 overflow-hidden"
          style={{
            height: `calc(50vh - ${GAP}px)`,
            transform: "translateY(calc(var(--tear-p) * -58vh))",
            clipPath: clips?.top,
            willChange: "transform",
          }}
        >
          <ArtLayer
            id="poster-bg"
            className="absolute inset-0"
            imgClassName="w-full h-full object-cover"
          >
            <div className="absolute inset-0 bg-x-black" />
            <div className="xerox-grain absolute inset-0 opacity-[0.12] invert" />
          </ArtLayer>
          <PosterWord word="YUCHAO" artId="poster-yuchao" bleed="top" size={25} />
          {/* torn fringe highlight */}
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-x-white/70" />
        </div>

        {/* ── bottom half: bg + WANG + torn top edge (z-10) ── */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 overflow-hidden"
          style={{
            height: `calc(50vh - ${GAP}px)`,
            transform: "translateY(calc(var(--tear-p) * 58vh))",
            clipPath: clips?.bottom,
            willChange: "transform",
          }}
        >
          <ArtLayer
            id="poster-bg"
            className="absolute inset-0"
            imgClassName="w-full h-full object-cover"
          >
            <div className="absolute inset-0 bg-x-black" />
            <div className="xerox-grain absolute inset-0 opacity-[0.12] invert" />
          </ArtLayer>
          <PosterWord word="WANG" artId="poster-wang" bleed="bottom" size={32} />
          <div className="absolute inset-x-0 top-0 h-[3px] bg-x-white/70" />
        </div>

        {children}
      </div>
    );
  }
);

export default PosterScene;
