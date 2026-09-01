"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { sfx } from "@/lib/sfx";

type HotspotProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  labelEn: string;
  labelCn: string;
  onClick: () => void;
  children: ReactNode;
  /** where the label chip appears */
  labelSide?: "top" | "bottom";
  className?: string;
  style?: CSSProperties;
};

/** Clickable room object: hover tilt + handwritten label chip + SFX. */
export default function Hotspot({
  x,
  y,
  width,
  height,
  labelEn,
  labelCn,
  onClick,
  children,
  labelSide = "top",
  className = "",
  style,
}: HotspotProps) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      aria-label={labelEn}
      onClick={() => {
        sfx.click();
        onClick();
      }}
      onMouseEnter={() => {
        setHover(true);
        sfx.hover();
      }}
      onMouseLeave={() => setHover(false)}
      className={`absolute block wobble cursor-pointer select-none ${className}`}
      style={{
        left: x,
        top: y,
        width,
        height,
        transform: hover ? "rotate(-1.2deg) scale(1.03)" : undefined,
        filter: hover ? "brightness(1.08)" : undefined,
        ...style,
      }}
    >
      {children}

      {/* handwritten label chip */}
      <span
        aria-hidden
        className={`hand-label absolute left-1/2 z-20 whitespace-nowrap px-3 py-1 text-xl leading-none transition-all duration-200 ${
          hover ? "opacity-100" : "opacity-0 translate-y-1"
        }`}
        style={{
          top: labelSide === "top" ? -40 : height + 12,
          transform: `translateX(-50%) rotate(${labelSide === "top" ? -2 : 1.5}deg)`,
        }}
      >
        {labelEn}{" "}
        <span lang="zh" style={{ fontFamily: "var(--font-hand-cn)" }}>
          · {labelCn}
        </span>
        <span
          className="pointer-events-none absolute -top-2 -left-3 w-8 h-3 opacity-60 mix-blend-multiply"
          style={{
            background: "rgba(228,216,178,0.9)",
            transform: "rotate(-8deg)",
          }}
        />
      </span>
    </button>
  );
}
