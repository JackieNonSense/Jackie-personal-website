"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import RetroComputer from "./RetroComputer";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export default function TerminalScene() {
  return (
    <div className="w-full h-full">
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: 3,
          toneMappingExposure: 1.0,
        }}
        camera={{ position: [0, 0.3, 2.0], fov: 45 }}
        shadows
      >
        <Suspense fallback={null}>
          {/* Warm amber ambient light - like old office lighting */}
          <ambientLight intensity={0.15} color="#f5e6c8" />

          {/* Key light - warm tungsten from above-right */}
          <directionalLight
            position={[3, 4, 3]}
            intensity={0.6}
            color="#ffe4c4"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-far={20}
            shadow-camera-left={-3}
            shadow-camera-right={3}
            shadow-camera-top={3}
            shadow-camera-bottom={-3}
          />

          {/* Fill light - slightly cooler from left */}
          <directionalLight
            position={[-2, 2, 2]}
            intensity={0.25}
            color="#e8dcd0"
          />

          {/* Soft rim light from behind */}
          <pointLight
            position={[0, 1, -2]}
            intensity={0.2}
            color="#d4c4a8"
            distance={5}
          />

          {/* Subtle floor bounce light */}
          <pointLight
            position={[0, -1, 1]}
            intensity={0.1}
            color="#c8b89a"
            distance={3}
          />

          <RetroComputer />

          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={1.2}
            maxDistance={4}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
            minAzimuthAngle={-Math.PI / 4}
            maxAzimuthAngle={Math.PI / 4}
          />

          <EffectComposer>
            <Bloom
              intensity={0.4}
              luminanceThreshold={0.3}
              luminanceSmoothing={0.9}
            />
            <Vignette darkness={0.4} offset={0.3} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute bottom-4 left-4 text-[#33ff33]/60 text-xs font-mono pointer-events-none">
        <p>JR INDUSTRIES UNIFIED OPERATING SYSTEM</p>
        <p>COPYRIGHT 20????*&^*^& JR INDUSTRIES</p>
      </div>

      {/* Input hint */}
      <div className="absolute bottom-4 right-4 text-[#33ff33]/40 text-xs font-mono pointer-events-none">
        <p>Type number + ENTER to navigate</p>
        <p>Drag to rotate view</p>
      </div>
    </div>
  );
}
