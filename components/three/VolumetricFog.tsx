"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Cinematic Fog using Curl Noise for fluid-like motion
export default function VolumetricFog() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { viewport, gl } = useThree();

  // Mouse tracking
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouse = useRef(new THREE.Vector2(0.5, 0.5));

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;
        varying vec2 vUv;

        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                   -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Curl Noise for fluid look
        vec2 curlNoise(vec2 p) {
          const float e = 0.1;
          float n1 = snoise(p + vec2(e, 0.0));
          float n2 = snoise(p - vec2(e, 0.0));
          float n3 = snoise(p + vec2(0.0, e));
          float n4 = snoise(p - vec2(0.0, e));

          float x = (n3 - n4) / (2.0 * e);
          float y = (n1 - n2) / (2.0 * e);

          return vec2(x, -y); // Rotate gradients 90 degrees
        }

        void main() {
          vec2 st = vUv;
          st.x *= uResolution.x / uResolution.y;

          // Slow, cinematic time
          float t = uTime * 0.05;

          // Mouse influence
          vec2 mouse = uMouse * vec2(uResolution.x/uResolution.y, 1.0);
          float mouseDist = distance(st, mouse);
          float mouseForce = smoothstep(0.6, 0.0, mouseDist);

          // Base coordinates with gentle zoom
          vec2 p = st * 1.5;

          // Fluid distortion using curl noise
          vec2 distortion = curlNoise(p + t * 0.2);

          // Apply mouse push to the distortion
          distortion += (st - mouse) * mouseForce * 2.0;

          // Sample noise with distorted coordinates
          // Layer 1: Base Flow
          float n1 = snoise(p + distortion * 1.5 - t * 0.2);

          // Layer 2: Detail
          float n2 = snoise(p * 2.0 + distortion * 1.0 + t * 0.1);

          // Combine layers for deep fog
          float fog = n1 * 0.6 + n2 * 0.4;

          // Compress range to create "void" pockets
          fog = smoothstep(-0.4, 0.8, fog);

          // Dark, moody palette
          vec3 voidColor = vec3(0.01, 0.01, 0.02); // Deepest black-blue
          vec3 mistColor = vec3(0.08, 0.10, 0.15); // Dark slate
          vec3 lightMist = vec3(0.20, 0.22, 0.30); // Highlights

          vec3 color = mix(voidColor, mistColor, fog);
          color = mix(color, lightMist, pow(fog, 3.0)); // Highlights only on densest parts

          // Subtle mouse glow in the fog (interaction)
          color += vec3(0.05, 0.1, 0.2) * mouseForce * 0.5;

          // Strong vignette to focus center
          float vignette = 1.0 - length(vUv - 0.5) * 1.0;
          color *= smoothstep(0.0, 0.8, vignette);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: false,
      depthWrite: false,
      depthTest: false,
    });
  }, []); // Initial creation

  // Update mouse and time
  useFrame((state) => {
    shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    mouse.current.lerp(targetMouse.current, 0.05); // Smoother lerp
    shaderMaterial.uniforms.uMouse.value.copy(mouse.current);
  });

  // Handle resize and mouse move
  useEffect(() => {
    const canvas = gl.domElement;

    const updateSize = () => {
       shaderMaterial.uniforms.uResolution.value.set(canvas.width, canvas.height);
    };

    // Initial size
    updateSize();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse.current.x = (event.clientX - rect.left) / rect.width;
      targetMouse.current.y = 1.0 - (event.clientY - rect.top) / rect.height;
    };

    window.addEventListener('resize', updateSize);
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
        window.removeEventListener('resize', updateSize);
        canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl, shaderMaterial]);

  return (
    <mesh ref={meshRef} renderOrder={-1000}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
