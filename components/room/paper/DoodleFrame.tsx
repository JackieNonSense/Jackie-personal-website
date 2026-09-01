import type { ReactNode } from "react";

type DoodleFrameProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * Hand-wobbly ink border drawn as an SVG overlay — the signature
 * "someone drew this" frame used on cards and OS windows.
 */
export default function DoodleFrame({ children, className = "" }: DoodleFrameProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 2.2 3.1 C 20 1.8, 45 3.4, 62 2.2 C 78 1.4, 92 2.8, 97.6 3.5 C 98.9 20, 97.2 40, 98.1 60 C 98.8 78, 97.5 90, 97.9 96.8 C 80 98.4, 60 96.9, 40 97.8 C 25 98.5, 10 97.2, 2.6 97.5 C 1.5 80, 3.0 60, 2.1 42 C 1.4 28, 2.8 12, 2.2 3.1 Z"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.1"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
