"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uGrid;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uScroll;
  uniform float uAspect;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i.x + i.y * 57.0);
    float b = hash(i.x + 1.0 + i.y * 57.0);
    float c = hash(i.x + (i.y + 1.0) * 57.0);
    float d = hash(i.x + 1.0 + (i.y + 1.0) * 57.0);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * vnoise(p);
      p *= 2.1;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;

    // Occasional glitch row: hashed row index shifts horizontally for a beat
    float row = floor(uv.y * uGrid.y);
    float g = hash(row + floor(uTime * 1.5) * 13.7);
    float shift = step(0.985, g) * (hash(row * 3.1) - 0.5) * 0.08;
    uv.x += shift;

    vec2 cell = floor(uv * uGrid);
    vec2 cellUv = fract(uv * uGrid);
    vec2 cellCenter = (cell + 0.5) / uGrid;

    // Brightness field: drifting fbm + a travelling waveform band
    vec2 p = cellCenter * vec2(uAspect, 1.0);
    float field = fbm(p * 3.0 + vec2(uTime * 0.05, uTime * 0.02));
    float wave = sin(cellCenter.x * 18.0 + uTime * 1.2) * 0.5 + 0.5;
    float band = exp(-pow((cellCenter.y - (0.32 + wave * 0.06)) * 14.0, 2.0));
    field = field * 0.5 + band * 0.85;

    // Mouse proximity glow
    vec2 m = uMouse * vec2(uAspect, 1.0);
    float md = length(p - m);
    field += exp(-md * 5.0) * 0.9;

    // Fade the whole matrix as the visitor scrolls past the hero
    field *= 1.0 - uScroll * 0.85;

    // Phosphor dot with baked radial glow (no postprocessing needed)
    float d = length(cellUv - 0.5);
    float dotMask = smoothstep(0.5, 0.08, d);
    float glow = exp(-d * 4.0) * 0.35;
    float bright = field * (dotMask * 0.95 + glow);

    vec3 col = mix(uColorA, uColorB, smoothstep(0.55, 1.0, field)) * bright;
    // Subtle global CRT flicker
    col *= 0.96 + 0.04 * hash(floor(uTime * 24.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

type DotMatrixFieldProps = {
  scrollRef: RefObject<number>;
};

export default function DotMatrixField({ scrollRef }: DotMatrixFieldProps) {
  const { viewport, size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const target = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(() => {
    const isMobile = size.width < 768;
    return {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uGrid: {
        value: isMobile
          ? new THREE.Vector2(80, 45)
          : new THREE.Vector2(160, 90),
      },
      uColorA: { value: new THREE.Color("#33ff33") },
      uColorB: { value: new THREE.Color("#b8ff2e") },
      uScroll: { value: 0 },
      uAspect: { value: size.width / size.height },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value += delta;
    mat.uniforms.uScroll.value = scrollRef.current ?? 0;
    mat.uniforms.uAspect.value = state.size.width / state.size.height;

    // Lerp mouse toward pointer (pointer is -1..1, convert to 0..1 uv)
    target.current.set(
      state.pointer.x * 0.5 + 0.5,
      state.pointer.y * 0.5 + 0.5
    );
    mouse.current.lerp(target.current, 0.05);
    (mat.uniforms.uMouse.value as THREE.Vector2).copy(mouse.current);
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}
