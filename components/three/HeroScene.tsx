"use client";

import { useEffect, useState, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import DotMatrixField from "./DotMatrixField";
import { prefersReducedMotion } from "@/lib/motion";

type HeroSceneProps = {
  scrollRef: RefObject<number>;
};

/** Fullscreen phosphor dot-matrix background. Single WebGL canvas on the page. */
export default function HeroScene({ scrollRef }: HeroSceneProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Static black ground for reduced-motion users; the DOM carries the design.
    const t = setTimeout(() => setEnabled(!prefersReducedMotion()), 0);
    return () => clearTimeout(t);
  }, []);

  if (!enabled) return null;

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 1], fov: 75 }}
      frameloop="always"
    >
      <DotMatrixField scrollRef={scrollRef} />
    </Canvas>
  );
}
