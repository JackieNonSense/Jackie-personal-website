"use client";

import { useEffect, useState, type ReactNode } from "react";

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
 * Art swap point. Renders the procedural fallback immediately; probes
 * /art/{id}.png on the client and swaps it in only once it actually loads
 * (an SSR-rendered <img onError> misses the error event, so probe instead).
 * Dropping a PNG into public/art/ upgrades the object with zero code changes.
 */
export default function ArtSlot({
  id,
  width,
  height,
  className,
  children,
}: ArtSlotProps) {
  const [artUrl, setArtUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled && probe.naturalWidth > 0) setArtUrl(probe.src);
    };
    probe.src = `/art/${id}.png`;
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className={className} style={{ width, height, position: "relative" }}>
      {artUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artUrl}
          alt=""
          width={width}
          height={height}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        children
      )}
    </div>
  );
}
