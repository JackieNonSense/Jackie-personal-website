"use client";

import ArtLayer from "./ArtLayer";

type PosterWordProps = {
  word: string;
  artId: string;
  /** which edge of the half the word bleeds past */
  bleed: "top" | "bottom";
  /** vw font size (tune per word so both fill the width) */
  size?: number;
};

/**
 * One viewport-filling distressed word. Procedural fallback: Anton set huge
 * with xerox grain inside the letterforms (background-clip: text) and a
 * static roughen filter (applied once — never animated; the browser caches
 * the rasterization, per feTurbulence performance rules).
 */
export default function PosterWord({ word, artId, bleed, size = 25 }: PosterWordProps) {
  return (
    <ArtLayer
      id={artId}
      className="absolute inset-x-0 flex justify-center overflow-visible"
      style={{
        [bleed === "top" ? "top" : "bottom"]: "-6vh",
      }}
      imgClassName="w-[104vw] max-w-none h-auto"
    >
      <span
        aria-hidden
        className="xerox-grain select-none whitespace-nowrap"
        style={{
          fontFamily: "var(--font-anton), 'Arial Black', sans-serif",
          fontSize: `${size}vw`,
          lineHeight: 0.82,
          letterSpacing: "0.01em",
          transform: "scaleY(1.22)",
          transformOrigin: bleed === "top" ? "top center" : "bottom center",
          backgroundColor: "#efece2",
          backgroundBlendMode: "multiply",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "url(#poster-rough) contrast(1.05)",
        }}
      >
        {word}
      </span>
    </ArtLayer>
  );
}
