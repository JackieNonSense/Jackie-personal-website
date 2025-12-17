"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group } from "three";

interface SecretKeyProps {
  position?: [number, number, number];
  onClick?: () => void;
}

export default function SecretKey({ position = [0, 0, 0], onClick }: SecretKeyProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  // Continuous slow rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      // Subtle floating motion
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });

  // Material properties based on hover state
  const emissiveIntensity = hovered ? 1.5 : 0;
  const baseColor = hovered ? "#ffd700" : "#8b7355";
  const emissiveColor = "#ffd700";

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      scale={hovered ? 1.1 : 1}
    >
      {/* Key Ring (Bow) - Torus shape */}
      <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.04, 16, 32]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.9}
          roughness={0.2}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Key Shaft (Blade) */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.08, 0.5, 0.03]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.9}
          roughness={0.2}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Key Teeth - Three small rectangles */}
      <mesh position={[0.06, -0.25, 0]}>
        <boxGeometry args={[0.06, 0.08, 0.03]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.9}
          roughness={0.2}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      <mesh position={[0.05, -0.15, 0]}>
        <boxGeometry args={[0.04, 0.06, 0.03]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.9}
          roughness={0.2}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      <mesh position={[0.055, -0.32, 0]}>
        <boxGeometry args={[0.05, 0.05, 0.03]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.9}
          roughness={0.2}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Glow ring when hovered */}
      {hovered && (
        <pointLight
          position={[0, 0, 0.2]}
          color="#ffd700"
          intensity={2}
          distance={1}
        />
      )}
    </group>
  );
}
