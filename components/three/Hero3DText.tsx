"use client";

import { Text3D, Center } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

export default function Hero3DText() {
  const groupRef = useRef<THREE.Group>(null!);
  const { gl } = useThree();

  // Mouse tracking for rotation
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });

  // Mouse event handler
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Normalize to -1 to 1
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Set target rotation (subtle, max ~15 degrees)
      targetRotation.current.y = x * 0.15;
      targetRotation.current.x = y * 0.08;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [gl]);

  useFrame((state) => {
    if (groupRef.current) {
      // Smooth interpolation toward target rotation
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.05;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.05;

      // Apply rotation
      groupRef.current.rotation.x = currentRotation.current.x;
      groupRef.current.rotation.y = currentRotation.current.y;

      // Subtle floating animation
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Center position={[0, 0, 0]}>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={1.5}
          height={0.3}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.03}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          YUCHAO
          <meshStandardMaterial
            color="#ffffff"
            metalness={1.0}
            roughness={0.05}
            envMapIntensity={3.0}
          />
        </Text3D>
      </Center>
    </group>
  );
}
