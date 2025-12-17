"use client";

import { Text3D, Center, Float } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

export default function RefractionHero() {
  const groupRef = useRef<THREE.Group>(null!);
  const textRef = useRef<THREE.Group>(null!);
  const { gl } = useThree();

  // Mouse tracking for subtle rotation
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      targetRotation.current = { x: y * 0.1, y: x * 0.1 };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smooth mouse interaction
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 2 * delta;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 2 * delta;

      // Apply rotation to the entire group
      groupRef.current.rotation.x = currentRotation.current.x;
      groupRef.current.rotation.y = currentRotation.current.y;
    }
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.1,
    metalness: 0.1, // Reduced for clearer glass
    transmission: 0.98,
    thickness: 2.0,
    ior: 1.45,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 3.0, // Increased reflection
    emissive: '#ffffff',
    emissiveIntensity: 0.1, // Slight glow to prevent being too dark
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <Center position={[0, 0.4, 0]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.65} // Smaller, more elegant size
            height={0.1}
            curveSegments={16}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.015}
            bevelOffset={0}
            bevelSegments={8} // High quality bevels
            letterSpacing={0.2}
          >
            YUCHAO WANG
            <primitive object={glassMaterial} attach="material" />
          </Text3D>
        </Center>

        <Center position={[0, -0.4, 0]}>
           <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.25} // Subordinate text
            height={0.05}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.01}
            bevelSize={0.005}
            bevelOffset={0}
            bevelSegments={5}
            letterSpacing={0.4} // Wide tracking for elegance
          >
            PORTFOLIO
            <meshBasicMaterial color="#aaaaaa" transparent opacity={0.6} />
          </Text3D>
        </Center>
      </Float>
    </group>
  );
}
