"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import CRTScreen from "./CRTScreen";

/**
 * Retro Computer 3D Model - IBM PC style with realistic plastic materials
 */
export default function RetroComputer() {
  const groupRef = useRef<THREE.Group>(null!);

  // Beige ABS plastic - typical 80s computer color
  const beigePlastic = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#d4cbb8",
    roughness: 0.55,
    metalness: 0.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.8,
  }), []);

  // Darker beige for recessed/shadow areas
  const darkBeigePlastic = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#b8a890",
    roughness: 0.6,
    metalness: 0.0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.9,
  }), []);

  // Dark plastic material (vents, details)
  const darkPlastic = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#1a1a1a",
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
  }), []);

  // Screen bezel - glossy black plastic
  const bezelPlastic = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#0a0a0a",
    roughness: 0.2,
    metalness: 0.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  }), []);

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      {/* === MONITOR === */}
      <group position={[0, 0.55, 0]}>
        {/* Monitor body - main outer shell */}
        <RoundedBox args={[1.3, 1.0, 0.75]} radius={0.04} smoothness={4}>
          <primitive object={beigePlastic} attach="material" />
        </RoundedBox>

        {/* Monitor inner frame (recessed) */}
        <mesh position={[0, 0.02, 0.33]}>
          <boxGeometry args={[1.15, 0.88, 0.12]} />
          <primitive object={darkBeigePlastic} attach="material" />
        </mesh>

        {/* Screen bezel (black plastic frame) */}
        <RoundedBox args={[1.05, 0.8, 0.08]} radius={0.02} smoothness={4} position={[0, 0.02, 0.37]}>
          <primitive object={bezelPlastic} attach="material" />
        </RoundedBox>

        {/* CRT Screen */}
        <CRTScreen position={[0, 0.02, 0.42]} />

        {/* Monitor top vent grille */}
        <mesh position={[0, 0.48, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.6, 0.3, 0.02]} />
          <primitive object={darkPlastic} attach="material" />
        </mesh>

        {/* Side vents - right */}
        <group position={[0.62, 0, 0]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, -0.2 + i * 0.1, 0]}>
              <boxGeometry args={[0.03, 0.04, 0.4]} />
              <primitive object={darkPlastic} attach="material" />
            </mesh>
          ))}
        </group>

        {/* Control panel on right side */}
        <group position={[0.5, -0.25, 0.35]}>
          {/* Power button */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
            <meshPhysicalMaterial color="#3a3a3a" roughness={0.4} clearcoat={0.2} />
          </mesh>

          {/* Brightness knob */}
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.015, 16]} />
            <meshPhysicalMaterial color="#4a4a4a" roughness={0.35} clearcoat={0.25} />
          </mesh>

          {/* Power LED */}
          <mesh position={[0, 0.18, 0.01]}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial
              color="#33ff33"
              emissive="#33ff33"
              emissiveIntensity={3}
            />
          </mesh>
        </group>

        {/* JR Industries logo plate */}
        <mesh position={[-0.4, -0.38, 0.38]}>
          <boxGeometry args={[0.12, 0.035, 0.008]} />
          <meshPhysicalMaterial color="#b8a080" metalness={0.4} roughness={0.3} clearcoat={0.3} />
        </mesh>
      </group>

      {/* === BASE UNIT === */}
      <group position={[0, 0, 0.05]}>
        {/* Main base unit */}
        <RoundedBox args={[1.3, 0.22, 0.6]} radius={0.02} smoothness={4}>
          <primitive object={beigePlastic} attach="material" />
        </RoundedBox>

        {/* Floppy drive A */}
        <group position={[0.35, 0.02, 0.31]}>
          <mesh>
            <boxGeometry args={[0.2, 0.06, 0.02]} />
            <primitive object={darkPlastic} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.15, 0.015, 0.01]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0.08, 0.015, 0.015]}>
            <sphereGeometry args={[0.004, 6, 6]} />
            <meshStandardMaterial color="#ff3333" emissive="#ff3333" emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* Floppy drive B */}
        <group position={[0.35, -0.05, 0.31]}>
          <mesh>
            <boxGeometry args={[0.2, 0.06, 0.02]} />
            <primitive object={darkPlastic} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.15, 0.015, 0.01]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        </group>

        {/* Vent grille on left */}
        <group position={[-0.45, 0, 0.31]}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <mesh key={i} position={[i * 0.025, 0, 0]}>
              <boxGeometry args={[0.01, 0.12, 0.02]} />
              <primitive object={darkPlastic} attach="material" />
            </mesh>
          ))}
        </group>

        {/* Front label */}
        <mesh position={[0, -0.08, 0.31]}>
          <boxGeometry args={[0.2, 0.018, 0.004]} />
          <meshPhysicalMaterial color="#e8e0d0" metalness={0.2} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
