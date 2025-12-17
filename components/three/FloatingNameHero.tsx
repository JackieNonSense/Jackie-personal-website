"use client";

import { Text3D, Center } from "@react-three/drei";
import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

// Store for all letter physics data
interface LetterPhysics {
  initialPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  velocity: THREE.Vector3;
}

export default function FloatingNameHero() {
  const groupRef = useRef<THREE.Group>(null!);
  const letterRefs = useRef<THREE.Group[]>([]);
  const { camera, size } = useThree();

  // Scroll progress (0 = top, 1 = scrolled down)
  const [scrollProgress, setScrollProgress] = useState(0);

  // Mouse position in world coordinates
  const mouseWorld = useRef(new THREE.Vector3(0, 0, 0));
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useRef(new THREE.Vector2(0, 0));

  // Enhanced frosted glass material - matching reference
  const frostedGlassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#a8c0d0', // Slight blue-gray tint
    metalness: 0.0,
    roughness: 0.12,
    transmission: 0.85,
    thickness: 0.8,
    ior: 1.45,
    clearcoat: 0.3,
    clearcoatRoughness: 0.6,
    envMapIntensity: 1.8,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  }), []);

  // Letters configuration - YUCHAO + WANG (ALL UPPERCASE)
  const yuchaoLetters = ['Y', 'U', 'C', 'H', 'A', 'O'];
  const wangLetters = ['W', 'A', 'N', 'G'];

  const letterSpacing = 0.52;
  const yuchaoWidth = (yuchaoLetters.length - 1) * letterSpacing;
  const wangWidth = (wangLetters.length - 1) * letterSpacing;

  // Calculate initial positions
  const letterConfigs = useMemo(() => {
    const configs: { char: string; pos: [number, number, number] }[] = [];

    yuchaoLetters.forEach((char, i) => {
      configs.push({
        char,
        pos: [-yuchaoWidth / 2 + i * letterSpacing, 0.45, 0]
      });
    });

    wangLetters.forEach((char, i) => {
      configs.push({
        char,
        pos: [-wangWidth / 2 + i * letterSpacing, -0.45, 0]
      });
    });

    return configs;
  }, []);

  // Physics state for each letter
  const physics = useRef<LetterPhysics[]>(
    letterConfigs.map(config => ({
      initialPos: new THREE.Vector3(...config.pos),
      currentPos: new THREE.Vector3(...config.pos),
      velocity: new THREE.Vector3(0, 0, 0),
    }))
  );

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const progress = Math.min(1, scrollY / (windowHeight * 0.5));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      pointer.current.x = (event.clientX / size.width) * 2 - 1;
      pointer.current.y = -(event.clientY / size.height) * 2 + 1;

      raycaster.setFromCamera(pointer.current, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      raycaster.ray.intersectPlane(plane, mouseWorld.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [camera, size, raycaster]);

  useFrame(() => {
    const mouse = mouseWorld.current;

    // Apply scroll-based transformations to the group
    if (groupRef.current) {
      groupRef.current.position.y = 0.2 - scrollProgress * 2;
      frostedGlassMaterial.opacity = 0.92 * (1 - scrollProgress);
    }

    letterRefs.current.forEach((ref, index) => {
      if (!ref) return;

      const p = physics.current[index];

      const dx = p.currentPos.x - mouse.x;
      const dy = p.currentPos.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Repulsion force
      const repulsionRadius = 1.0;
      if (distance < repulsionRadius && distance > 0.01) {
        const force = Math.pow((repulsionRadius - distance) / repulsionRadius, 2) * 0.06;
        p.velocity.x += (dx / distance) * force;
        p.velocity.y += (dy / distance) * force;
      }

      // Spring force
      const springK = 0.02;
      p.velocity.x += (p.initialPos.x - p.currentPos.x) * springK;
      p.velocity.y += (p.initialPos.y - p.currentPos.y) * springK;

      // Damping
      p.velocity.x *= 0.92;
      p.velocity.y *= 0.92;

      // Update position
      p.currentPos.x += p.velocity.x;
      p.currentPos.y += p.velocity.y;

      ref.position.x = p.currentPos.x;
      ref.position.y = p.currentPos.y;
      ref.position.z = p.initialPos.z;
    });
  });

  // Don't render if fully scrolled
  if (scrollProgress >= 1) return null;

  return (
    <group ref={groupRef} position={[0, 0.2, 0]}>
      {letterConfigs.map((config, index) => (
        <group
          key={`letter-${index}`}
          ref={(el) => { if (el) letterRefs.current[index] = el; }}
          position={config.pos}
        >
          <Center>
            <Text3D
              font="/fonts/Outfit SemiBold_Regular.json"
              size={0.55}
              height={0.15}
              curveSegments={16}
              bevelEnabled
              bevelThickness={0.02}
              bevelSize={0.01}
              bevelOffset={0}
              bevelSegments={5}
            >
              {config.char}
              <primitive object={frostedGlassMaterial} attach="material" />
            </Text3D>
          </Center>
        </group>
      ))}
    </group>
  );
}
