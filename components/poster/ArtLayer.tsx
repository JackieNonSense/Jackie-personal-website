"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type ArtLayerProps = {
  /** basename in /public/art/, e.g. "poster-yuchao" -> /art/poster-yuchao.png */
  id: string;
  className?: string;
  style?: CSSProperties;
  imgClassName?: string;
  /** procedural fallback rendered until (or unless) the PNG exists */
  children: ReactNode;
};

/**
 * Art swap point. Renders the procedural fallback immediately; probes
 * /art/{id}.png on the client and swaps it in once it actually loads.
 * Dropping an exported PNG into public/art/ upgrades the layer with zero
 * code changes.
 */
export default function ArtLayer({
  id,
  className,
  style,
  imgClassName = "w-full h-full object-contain",
  children,
}: ArtLayerProps) {
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
    <div className={className} style={style}>
      {artUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artUrl} alt="" draggable={false} className={imgClassName} />
      ) : (
        children
      )}
    </div>
  );
}
