"use client";

import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import SecretKey from "./SecretKey";
import SecretPaper from "./SecretPaper";

export default function SecretKeyScene() {
  const [isPaperOpen, setIsPaperOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic opacity: semi-hidden by default, fully visible when hovered
  const containerOpacity = isHovered ? 0.9 : 0.4;

  return (
    <>
      {/* The small key container */}
      <div
        className="w-full h-full pointer-events-auto cursor-pointer"
        style={{
          opacity: containerOpacity,
          transition: "opacity 0.3s ease-in-out",
          minWidth: "48px",
          minHeight: "48px",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Canvas
          camera={{ position: [0, 0, 2], fov: 50 }}
          style={{ background: "transparent" }}
          gl={{ alpha: true }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[2, 2, 2]} intensity={1} />
            <pointLight position={[-2, 1, 1]} intensity={0.5} color="#ffd700" />
            <Environment preset="city" />

            <SecretKey
              position={[0, 0, 0]}
              onClick={() => setIsPaperOpen(true)}
            />

            <EffectComposer>
              <Bloom
                luminanceThreshold={0.5}
                mipmapBlur
                intensity={0.8}
                radius={0.4}
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Modal overlay for the paper */}
      {isPaperOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsPaperOpen(false)}
        >
          <div
            className="relative w-[400px] h-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Canvas
              camera={{ position: [0, 0, 2.5], fov: 50 }}
              style={{ background: "transparent" }}
              gl={{ alpha: true }}
            >
              <Suspense fallback={null}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[2, 2, 2]} intensity={1} />

                <SecretPaper
                  isOpen={true}
                  onClose={() => setIsPaperOpen(false)}
                  position={[0, 0, 0]}
                />
              </Suspense>
            </Canvas>

            {/* Close hint */}
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs font-mono">
              click anywhere to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
