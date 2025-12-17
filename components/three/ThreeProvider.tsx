
"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

export default function ThreeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 5], fov: 75 }}
        frameloop="always"
      >
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}

