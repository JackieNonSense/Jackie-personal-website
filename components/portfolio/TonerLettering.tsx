"use client";
import { useId } from "react";
import styles from "./Portfolio.module.css";

// The bitmap provides only glyph silhouettes. All toner and fade are independent,
// stationary SVG material layers, so generated maze-like grain is not inherited.
export default function TonerLettering() {
  const id = useId().replaceAll(":", "");
  return <svg className={styles.lettering} data-testid="toner-lettering" viewBox="0 0 1586 992" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <mask id={`${id}-shape`} maskUnits="userSpaceOnUse" x="0" y="0" width="1586" height="992" style={{ maskType: "luminance" }}>
        <image href="/portfolio/name-stencil-v04.png" width="1586" height="992" />
      </mask>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".78" numOctaves="1" seed="63" stitchTiles="noStitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer><feFuncR type="linear" slope="6" intercept="-2" /><feFuncG type="linear" slope="6" intercept="-2" /><feFuncB type="linear" slope="6" intercept="-2" /><feFuncA type="linear" slope="0" intercept="1" /></feComponentTransfer>
      </filter>
      <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0" stopColor="white" /><stop offset=".18" stopColor="#eee" /><stop offset=".32" stopColor="#888" /><stop offset=".40" stopColor="black" />
        <stop offset=".66" stopColor="black" /><stop offset=".75" stopColor="#999" /><stop offset=".9" stopColor="#eee" /><stop offset="1" stopColor="white" />
      </linearGradient>
      <mask id={`${id}-fadeMask`}><rect width="1586" height="992" fill={`url(#${id}-fade)`} /></mask>
      <mask id={`${id}-toner`}><rect width="1586" height="992" filter={`url(#${id}-grain)`} /></mask>
    </defs>
    <g mask={`url(#${id}-shape)`}><g mask={`url(#${id}-fadeMask)`}>
      <rect width="1586" height="992" fill="#dddcd2" mask={`url(#${id}-toner)`} />
    </g></g>
  </svg>;
}
