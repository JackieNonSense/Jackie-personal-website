"use client";

import { Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import WaterBackground from "./WaterBackground";
import FloatingNameHero from "./FloatingNameHero";

export default function Scene() {
  return (
    <>
      {/* Environment for reflections */}
      <Environment
        preset="night"
        background={false}
        environmentIntensity={1.2}
      />

      <WaterBackground />

      <FloatingNameHero />

      {/* Simple lighting setup */}
      <directionalLight
        position={[-3, 5, 8]}
        intensity={2}
        color="#ffffff"
      />

      <directionalLight
        position={[5, 3, 5]}
        intensity={1.5}
        color="#ffeedd"
      />

      <ambientLight intensity={0.4} color="#aabbcc" />

      {/* Post Processing - simple */}
      <EffectComposer multisampling={4}>
        <Bloom
          luminanceThreshold={0.6}
          mipmapBlur
          intensity={0.25}
          radius={0.3}
        />
        <Vignette eskil={false} offset={0.2} darkness={0.4} />
      </EffectComposer>
    </>
  );
}
