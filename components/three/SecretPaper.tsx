"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, CanvasTexture } from "three";
import { animated, useSpring } from "@react-spring/three";

interface SecretPaperProps {
  isOpen: boolean;
  onClose?: () => void;
  position?: [number, number, number];
}

// Create paper texture with password text
function createPaperTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Paper background with aged effect
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  gradient.addColorStop(0, "#f5f0e6");
  gradient.addColorStop(0.7, "#e8dcc8");
  gradient.addColorStop(1, "#d4c4a8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Add some noise/texture
  ctx.fillStyle = "rgba(139, 115, 85, 0.03)";
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * 512,
      Math.random() * 512,
      Math.random() * 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Paper border/edge effect
  ctx.strokeStyle = "rgba(139, 115, 85, 0.3)";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 492);

  // Inner decorative border
  ctx.strokeStyle = "rgba(139, 115, 85, 0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, 452, 452);

  // Draw a small key icon at top
  ctx.fillStyle = "#8b7355";
  ctx.font = "40px serif";
  ctx.textAlign = "center";
  ctx.fillText("🔑", 256, 120);

  // Main password text
  ctx.fillStyle = "#2c1810";
  ctx.font = "bold 72px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Add shadow for depth
  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.fillText("3c5614", 256, 256);

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // Decorative line below
  ctx.strokeStyle = "#8b7355";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 320);
  ctx.lineTo(392, 320);
  ctx.stroke();

  // Subtle "secret" text at bottom
  ctx.fillStyle = "rgba(139, 115, 85, 0.5)";
  ctx.font = "italic 24px Georgia, serif";
  ctx.fillText("• secret •", 256, 420);

  const texture = new CanvasTexture(canvas);
  return texture;
}

export default function SecretPaper({ isOpen, onClose, position = [0, 0, 0] }: SecretPaperProps) {
  const meshRef = useRef<Mesh>(null);
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  // Create texture on mount (client-side only)
  useEffect(() => {
    setTexture(createPaperTexture());
  }, []);

  // Spring animation for scale and rotation
  const { scale, rotationZ, opacity } = useSpring({
    scale: isOpen ? 1 : 0,
    rotationZ: isOpen ? 0 : Math.PI * 2,
    opacity: isOpen ? 1 : 0,
    config: {
      tension: 200,
      friction: 20,
    },
  });

  // Subtle hover animation
  useFrame((state) => {
    if (meshRef.current && isOpen) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  if (!texture) return null;

  return (
    <animated.mesh
      ref={meshRef}
      position={position}
      scale={scale}
      rotation-z={rotationZ}
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <planeGeometry args={[1.5, 1.5]} />
      <animated.meshStandardMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={2} // DoubleSide
      />
    </animated.mesh>
  );
}
