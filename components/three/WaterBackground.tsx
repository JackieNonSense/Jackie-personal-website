"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 3D Interactive Water Surface
 * - Procedural wave animation with vertex displacement
 * - Mouse creates visible ripples
 * - Click creates stronger expanding waves
 */

interface Ripple {
  x: number;
  y: number;
  time: number;
  strength: number;
}

const MAX_RIPPLES = 20;

export default function WaterBackground() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { viewport, gl } = useThree();

  const ripples = useRef<Ripple[]>([]);
  const mousePos = useRef(new THREE.Vector2(-10, -10));
  const lastMousePos = useRef(new THREE.Vector2(-10, -10));
  const time = useRef(0);

  // Create ripple uniforms
  const rippleData = useMemo(() => {
    return new Float32Array(MAX_RIPPLES * 4); // x, y, time, strength
  }, []);

  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRipples: { value: rippleData },
        uRippleCount: { value: 0 },
        uMouse: { value: new THREE.Vector2(-10, -10) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uRipples[${MAX_RIPPLES * 4}];
        uniform int uRippleCount;
        uniform vec2 uMouse;

        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;

        #define PI 3.14159265359

        // Simplex noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                   -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vUv = uv;

          vec3 pos = position;
          float height = 0.0;

          // Ambient waves - multiple layers of sine waves
          vec2 p = uv * 10.0;
          float t = uTime * 0.3;

          // Layer 1: Large slow waves
          height += sin(p.x * 0.5 + t) * sin(p.y * 0.3 + t * 0.7) * 0.15;

          // Layer 2: Medium waves
          height += sin(p.x * 1.2 - t * 0.8) * sin(p.y * 0.8 + t * 0.5) * 0.08;

          // Layer 3: Small ripples using noise
          height += snoise(p * 0.5 + t * 0.2) * 0.05;
          height += snoise(p * 1.0 - t * 0.1) * 0.03;

          // Mouse ripples - from stored ripple array
          for (int i = 0; i < ${MAX_RIPPLES}; i++) {
            if (i >= uRippleCount) break;

            int idx = i * 4;
            vec2 ripplePos = vec2(uRipples[idx], uRipples[idx + 1]);
            float rippleTime = uRipples[idx + 2];
            float strength = uRipples[idx + 3];

            float age = uTime - rippleTime;
            if (age < 0.0 || age > 4.0) continue;

            float dist = distance(uv, ripplePos);
            float radius = age * 0.15; // Expanding radius
            float ringDist = abs(dist - radius);

            // Concentric ripple waves
            float wave = sin(dist * 40.0 - age * 8.0);
            float fade = exp(-age * 1.2) * exp(-ringDist * 20.0);

            height += wave * fade * strength * 0.3;
          }

          vHeight = height;
          pos.z += height;

          // Calculate normal for lighting
          float delta = 0.01;
          vec2 uvL = uv - vec2(delta, 0.0);
          vec2 uvR = uv + vec2(delta, 0.0);
          vec2 uvU = uv + vec2(0.0, delta);
          vec2 uvD = uv - vec2(0.0, delta);

          // Simplified normal calculation
          float dX = snoise(uvR * 5.0 + t * 0.2) - snoise(uvL * 5.0 + t * 0.2);
          float dY = snoise(uvU * 5.0 + t * 0.2) - snoise(uvD * 5.0 + t * 0.2);

          vec3 tangent = normalize(vec3(delta * 2.0, 0.0, dX * 0.1));
          vec3 bitangent = normalize(vec3(0.0, delta * 2.0, dY * 0.1));
          vNormal = normalize(cross(tangent, bitangent));

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;

        void main() {
          // Deep dark water colors - no white at all
          vec3 deepColor = vec3(0.01, 0.015, 0.025);
          vec3 midColor = vec3(0.02, 0.03, 0.05);

          // Base color gradient based on height only - no specular
          float h = vHeight * 1.5 + 0.5;
          vec3 color = mix(deepColor, midColor, clamp(h, 0.0, 1.0));

          // Vignette
          float vignette = 1.0 - length(vUv - 0.5) * 0.8;
          vignette = smoothstep(0.0, 1.0, vignette);
          color *= vignette;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, [rippleData]);

  // Animation loop
  useFrame((state) => {
    time.current = state.clock.elapsedTime;
    waterMaterial.uniforms.uTime.value = time.current;
    waterMaterial.uniforms.uMouse.value.copy(mousePos.current);

    // Update ripple data for shader
    const now = time.current;
    const validRipples = ripples.current.filter(r => now - r.time < 4.0);
    ripples.current = validRipples;

    // Pack ripple data into float array
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const idx = i * 4;
      if (i < validRipples.length) {
        rippleData[idx] = validRipples[i].x;
        rippleData[idx + 1] = validRipples[i].y;
        rippleData[idx + 2] = validRipples[i].time;
        rippleData[idx + 3] = validRipples[i].strength;
      } else {
        rippleData[idx] = -10;
        rippleData[idx + 1] = -10;
        rippleData[idx + 2] = 0;
        rippleData[idx + 3] = 0;
      }
    }
    waterMaterial.uniforms.uRipples.value = rippleData;
    waterMaterial.uniforms.uRippleCount.value = validRipples.length;
  });

  // Add ripple at position
  const addRipple = useCallback((x: number, y: number, strength: number) => {
    ripples.current.push({ x, y, time: time.current, strength });
    if (ripples.current.length > MAX_RIPPLES) {
      ripples.current.shift();
    }
  }, []);

  // Track scroll progress to disable ripples
  const scrollProgress = useRef(0);

  // Mouse handlers - only create ripples when not scrolled
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Don't create ripples if scrolled past hero
    if (scrollProgress.current > 0.3) return;

    // Use window dimensions for coordinate mapping
    const x = e.clientX / window.innerWidth;
    const y = 1.0 - e.clientY / window.innerHeight;

    // Check if mouse moved enough to create ripple
    const dx = x - lastMousePos.current.x;
    const dy = y - lastMousePos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.02) {
      addRipple(x, y, 0.5 * (1 - scrollProgress.current));
      lastMousePos.current.set(x, y);
    }

    mousePos.current.set(x, y);
  }, [addRipple]);

  const handleClick = useCallback((e: MouseEvent) => {
    // Don't create ripples if scrolled past hero
    if (scrollProgress.current > 0.3) return;

    // Use window dimensions for coordinate mapping
    const x = e.clientX / window.innerWidth;
    const y = 1.0 - e.clientY / window.innerHeight;

    // Stronger ripple on click
    addRipple(x, y, 1.5 * (1 - scrollProgress.current));
  }, [addRipple]);

  // Listen for scroll progress from page.tsx
  const handleScrollProgress = useCallback((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    scrollProgress.current = customEvent.detail;
  }, []);

  useEffect(() => {
    // Listen on window instead of canvas for reliable event capture
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('scrollProgress', handleScrollProgress);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scrollProgress', handleScrollProgress);
    };
  }, [handleMouseMove, handleClick, handleScrollProgress]);

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <planeGeometry args={[viewport.width * 2, viewport.height * 2, 200, 200]} />
      <primitive object={waterMaterial} attach="material" />
    </mesh>
  );
}
