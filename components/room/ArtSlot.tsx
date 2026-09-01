"use client";

import { useState, type ReactNode } from "react";

type ArtSlotProps = {
  /** basename in /public/art/, e.g. "desk" -> /art/desk.png */
  id: string;
  width: number;
  height: number;
  className?: string;
  /** procedural fallback rendered until (or unless) the PNG exists */
  children: ReactNode;
};

/**
 * Art swap point: tries /art/{id}.png; while missing (404) renders the
 * procedural fallback. Dropping a PNG into public/art/ upgrades the object
 * with zero code changes; the design-space rect stays identical.
 */
export default function ArtSlot({
  id,
  width,
  height,
  className,
  children,
}: ArtSlotProps) {
  const [hasArt, setHasArt] = useState(true);

  return (
    <div className={className} style={{ width, height, position: "relative" }}>
      {hasArt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/art/${id}.png`}
          alt=""
          width={width}
          height={height}
          draggable={false}
          onError={() => setHasArt(false)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        children
      )}
    </div>
  );
}
