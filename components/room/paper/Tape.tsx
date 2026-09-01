import type { CSSProperties } from "react";

type TapeProps = {
  rotate?: number;
  className?: string;
  style?: CSSProperties;
};

/** Translucent masking-tape strip. */
export default function Tape({ rotate = -4, className = "", style }: TapeProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none w-20 h-6 opacity-70 mix-blend-multiply ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background:
          "linear-gradient(90deg, rgba(230,220,180,0.85), rgba(240,232,200,0.7) 30%, rgba(228,216,178,0.85))",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        clipPath:
          "polygon(2% 0, 98% 4%, 100% 30%, 97% 96%, 3% 100%, 0 65%, 1% 30%)",
        ...style,
      }}
    />
  );
}
