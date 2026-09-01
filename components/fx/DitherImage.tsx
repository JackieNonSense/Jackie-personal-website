"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

// Ordered Bayer 4x4 threshold matrix, normalized to 0..1
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

type DitherImageProps = {
  src: string;
  alt: string;
  /** internal sample width in px (output dots) */
  sampleWidth?: number;
  className?: string;
};

/**
 * Green-phosphor Bayer-dithered rendition of an image, with a top-to-bottom
 * "signal acquire" reveal on first view. Falls back to a CSS-filtered <img>.
 */
export default function DitherImage({
  src,
  alt,
  sampleWidth = 180,
  className,
}: DitherImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const t = setTimeout(() => setFailed(true), 0);
      return () => clearTimeout(t);
    }
    const img = new Image();
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      const w = sampleWidth;
      const h = Math.round((img.height / img.width) * w);
      canvas.width = w;
      canvas.height = h;

      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const offCtx = off.getContext("2d");
      if (!offCtx) {
        setFailed(true);
        return;
      }
      offCtx.drawImage(img, 0, 0, w, h);

      let data: ImageData;
      try {
        data = offCtx.getImageData(0, 0, w, h);
      } catch {
        setFailed(true);
        return;
      }

      const bright = [51, 255, 51]; // --phos-500
      const dim = [10, 42, 10]; // --phos-100
      const px = data.data;
      const out = ctx.createImageData(w, h);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const lum =
            (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          const threshold = BAYER_4X4[y % 4][x % 4];
          const c = lum > threshold ? bright : dim;
          out.data[i] = c[0];
          out.data[i + 1] = c[1];
          out.data[i + 2] = c[2];
          out.data[i + 3] = 255;
        }
      }

      if (prefersReducedMotion()) {
        ctx.putImageData(out, 0, 0);
        return;
      }

      // Signal-acquire reveal: rows appear top-to-bottom over ~600ms
      canvas.style.opacity = "1";
      const start = performance.now();
      const reveal = (now: number) => {
        if (cancelled) return;
        const t = Math.min((now - start) / 600, 1);
        const rows = Math.floor(t * h);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        if (rows > 0) {
          ctx.putImageData(out, 0, 0, 0, 0, w, rows);
        }
        // scanline at the reveal edge
        if (t < 1) {
          ctx.fillStyle = "#b8ff2e";
          ctx.fillRect(0, rows, w, 1);
          requestAnimationFrame(reveal);
        }
      };
      requestAnimationFrame(reveal);
    };

    img.onerror = () => setFailed(true);

    return () => {
      cancelled = true;
    };
  }, [src, sampleWidth]);

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          filter:
            "grayscale(1) contrast(1.4) brightness(0.9) sepia(1) hue-rotate(60deg) saturate(3)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={className}
      style={{ imageRendering: "pixelated", width: "100%", height: "auto" }}
    />
  );
}
