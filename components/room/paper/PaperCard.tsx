import type { CSSProperties, ReactNode } from "react";

type PaperCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** small random-looking rotation in degrees */
  tilt?: number;
  torn?: boolean;
};

/** Warm paper sheet with grain, soft shadow and optional torn bottom edge. */
export default function PaperCard({
  children,
  className = "",
  style,
  tilt = 0,
  torn = false,
}: PaperCardProps) {
  return (
    <div
      className={`paper-grain bg-paper text-ink shadow-[3px_5px_0_rgba(0,0,0,0.28)] ${className}`}
      style={{
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        clipPath: torn
          ? "polygon(0 0, 100% 0, 100% 94%, 96% 97%, 90% 94%, 82% 98%, 73% 95%, 64% 99%, 55% 95%, 45% 98%, 36% 95%, 27% 99%, 18% 95%, 9% 98%, 3% 95%, 0 98%)"
          : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
