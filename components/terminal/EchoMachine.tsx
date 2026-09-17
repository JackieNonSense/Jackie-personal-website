"use client";
/* Mutable Three.js resources are owned by the render loop, outside React state. */
/* eslint-disable react-hooks/immutability */

import { Component, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { chassisGeometry, frameGeometry, glassGeometry, insetGeometry, machineZoom, MACHINE } from './echo-geometry';

export type EchoMachineProps = {
  texture: THREE.Texture;
  awake: boolean;
  focused: boolean;
  still: boolean;
  phase: number;
  onPointer: (u: number, v: number) => void;
  onWheel: (delta: number) => void;
  onReady: () => void;
  onFailure: () => void;
  onPower: () => void;
};

RectAreaLightUniformsLib.init();

function makeSurface() {
  const size = 256, color = new Uint8Array(size * size * 4), roughness = new Uint8Array(size * size * 4);
  let seed = 777;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const grain = random(), broad = Math.sin(x * .033 + Math.cos(y * .044)) * Math.cos(y * .029);
    const edge = Math.min(x, y, size - x, size - y) < 5;
    const scratch = (x % 79 === 0 && y % 97 < 19) || (y % 113 === 0 && x % 61 < 12);
    const value = 139 + grain * 12 + broad * 5 + (edge ? 8 : 0) + (scratch ? 14 : 0);
    color[i] = value * .91; color[i + 1] = value; color[i + 2] = value * .97; color[i + 3] = 255;
    roughness[i] = roughness[i + 1] = roughness[i + 2] = 187 + grain * 18 - (scratch ? 22 : 0);
    roughness[i + 3] = 255;
  }
  const create = (data: Uint8Array, srgb = false) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true; return texture;
  };
  return { color: create(color, true), rough: create(roughness) };
}

function makeLabels() {
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#84958e'; ctx.font = 'bold 22px monospace'; ctx.fillText('JR', 48, 62);
  ctx.font = '11px monospace'; ctx.fillText('INDUSTRIES', 85, 59);
  ctx.fillStyle = '#556e65'; ctx.font = '10px monospace'; ctx.fillText('TERMLINK / 07', 48, 84);
  ctx.fillText('NEURAL RESEARCH SYSTEMS', 626, 54);
  ctx.fillStyle = '#617c72'; ctx.fillText('777 — LOCAL RECOVERY', 626, 73);
  ctx.fillStyle = '#5d726a'; ctx.fillText('POWER', 1028, 159);
  for (let i = 0; i < 6; i++) ctx.fillText(`0${i + 1}`, 698 + i * 51, 153);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

type Bar = { x: number; y: number; z: number; w: number; h: number; d: number };

function repeatedBars() {
  const bars: Bar[] = [];
  for (const side of [-1, 1]) {
    // Fine horizontal fins, with a second recessed louvre surface behind them.
    for (let i = 0; i < 79; i++) bars.push({ x: side * 2.425, y: -1.10 + i * .034, z: .390, w: .382, h: .010, d: .026 });
    // Four lower mesh sections; the dense grid reads as old punched metal.
    for (const [center, width] of [[side * 1.65, .91], [side * 2.405, .48]]) {
      const count = Math.round(width / .024);
      for (let i = 0; i <= count; i++) bars.push({ x: center - width / 2 + (i / count) * width, y: -1.567, z: .327, w: .006, h: .292, d: .013 });
      for (let i = 0; i < 13; i++) bars.push({ x: center, y: -1.707 + i * .023, z: .324, w: width, h: .004, d: .011 });
    }
  }
  return bars;
}

function Grilles({ map, rough }: { map: THREE.Texture; rough: THREE.Texture }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const bars = useMemo(() => repeatedBars(), []);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), position = new THREE.Vector3(), quaternion = new THREE.Quaternion();
    bars.forEach((bar, index) => {
      position.set(bar.x, bar.y, bar.z); scale.set(bar.w, bar.h, bar.d);
      matrix.compose(position, quaternion, scale); mesh.current!.setMatrixAt(index, matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [bars]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, bars.length]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#849991" map={map} roughnessMap={rough} roughness={.72} metalness={.55} />
  </instancedMesh>;
}

function Assembly(props: EchoMachineProps) {
  const { texture, awake, focused, still, phase, onPointer, onWheel, onReady, onFailure, onPower } = props;
  const { camera, size, gl } = useThree();
  const group = useRef<THREE.Group>(null), halo = useRef<THREE.PointLight>(null);
  const ready = useRef(false), readyFrame = useRef(0), initialized = useRef(false);
  const resources = useMemo(() => ({
    chassis: chassisGeometry(), inset: insetGeometry(), glass: glassGeometry(),
    outerRail: frameGeometry(5.37, 3.10, 5.28, 3.01, .372, .018),
    innerRail: frameGeometry(4.34, 2.90, 4.26, 2.82, .379, .021),
    hairline: frameGeometry(4.26, 2.82, 4.22, 2.78, .373, .011),
    gasket: frameGeometry(3.90, 2.47, 3.834, 2.394, -.025, .025, .022),
    ...makeSurface(), label: makeLabels(),
  }), []);
  const phosphor = useMemo(() => ({
    uniforms: { map: { value: texture }, time: { value: 0 }, power: { value: 1 }, phase: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D map;uniform float time;uniform float power;uniform float phase;varying vec2 vUv;
      void main(){
        vec2 q=vUv*2.-1.;
        vec3 color=texture2D(map,vUv).rgb;
        float scan=.986+.014*sin(vUv.y*3015.);
        float noise=fract(sin(dot(vUv+floor(time*9.),vec2(12.9898,78.233)))*43758.5453);
        color=color*scan*(1.-.07*dot(q,q))+(noise-.5)*(.00025+phase*.00003);
        float corner=1.-smoothstep(.035,.066,length(max(abs(q)-vec2(.976,.967),0.)));
        gl_FragColor=vec4(max(color,vec3(0.))*power*corner,1.);
        #include <colorspace_fragment>
      }`,
  }), [texture]); // Power and narrative phase are render-loop uniforms, not new materials.
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  useEffect(() => () => {
    cancelAnimationFrame(readyFrame.current);
    // The display texture belongs to the terminal renderer and must survive this scene.
    Object.values(resources).forEach(resource => resource.dispose());
  }, [resources]);
  useLayoutEffect(() => {
    if (!initialized.current) {
      camera.zoom = machineZoom(size.width, size.height, focused); camera.position.y = (focused ? MACHINE.screenY : -.015) + .2;
      camera.rotation.x = -.025;
      camera.updateProjectionMatrix(); initialized.current = true;
    }
  }, [camera, size.width, size.height, focused]);
  useFrame((state, delta) => {
    const dt = Math.min(delta, .06);
    const zoom = machineZoom(size.width, size.height, focused);
    camera.zoom = still ? zoom : THREE.MathUtils.damp(camera.zoom, zoom, 9, dt);
    camera.position.y = still ? (focused ? MACHINE.screenY : -.015) + .2 : THREE.MathUtils.damp(camera.position.y, (focused ? MACHINE.screenY : -.015) + .2, 9, dt);
    camera.updateProjectionMatrix();
    phosphor.uniforms.time.value = still ? 0 : state.clock.elapsedTime;
    phosphor.uniforms.phase.value = phase;
    phosphor.uniforms.power.value = still ? (awake ? 1.05 : .16) : THREE.MathUtils.damp(phosphor.uniforms.power.value, awake ? 1.05 : .16, 8, dt);
    if (halo.current) halo.current.intensity = awake ? .21 : .045;
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, still || focused ? 0 : state.pointer.x * .009, 5, dt);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, still || focused ? 0 : -state.pointer.y * .005, 5, dt);
    }
  });
  return <>
    <color attach="background" args={['#010403']} />
    <ambientLight intensity={.22} color="#9ab3a7" />
    <rectAreaLight position={[5.0, .25, -5.5]} rotation={[0, 2.2, 0]} width={1.8} height={6} intensity={30} color="#9affef" />
    <rectAreaLight position={[3.4, .25, .31]} rotation={[0, Math.PI / 2, 0]} width={.13} height={3.7} intensity={35} color="#d0fff5" />
    <rectAreaLight position={[-.9, 3.1, 2]} rotation={[-.83, 0, 0]} width={5} height={.65} intensity={1.7} color="#7faaa0" />
    <rectAreaLight position={[0, -.8, 2.6]} rotation={[-.22, 0, 0]} width={5.2} height={.25} intensity={3} color="#6c9e90" />
    <spotLight position={[-4.4, 5, 4]} intensity={18} distance={12} angle={.61} penumbra={1} color="#7bbcaf" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-.0003} />
    <pointLight ref={halo} position={[0, .20, .7]} color="#62bfaf" distance={3.7} decay={2} intensity={.21} />

    <group ref={group}>
      <RoundedBox args={[5.30, 3.07, .71]} position={[0, .25, -.49]} radius={.026} smoothness={2} castShadow>
        <meshStandardMaterial color="#18241f" roughness={.84} map={resources.color} />
      </RoundedBox>
      <mesh geometry={resources.chassis} castShadow receiveShadow>
        <meshPhysicalMaterial color="#728b80" map={resources.color} roughnessMap={resources.rough} roughness={.84} bumpMap={resources.rough} bumpScale={.0015} metalness={.30} clearcoat={.04} />
      </mesh>
      <mesh geometry={resources.outerRail}><meshStandardMaterial color="#586d61" map={resources.color} roughness={.61} metalness={.63} /></mesh>
      <mesh geometry={resources.innerRail}><meshStandardMaterial color="#324039" roughness={.76} metalness={.42} /></mesh>
      <mesh geometry={resources.hairline}><meshStandardMaterial color="#5d7e71" roughness={.41} metalness={.65} /></mesh>
      <mesh geometry={resources.inset} receiveShadow><meshPhysicalMaterial color="#46655b" map={resources.color} roughnessMap={resources.rough} roughness={.53} bumpMap={resources.rough} bumpScale={.0007} metalness={.53} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={resources.gasket}><meshStandardMaterial color="#010605" roughness={.5} /></mesh>

      <mesh geometry={resources.glass} position={[0, MACHINE.screenY, -.003]}
        onClick={event => { event.stopPropagation(); if (event.uv) onPointer(event.uv.x, event.uv.y); }}
        onWheel={event => { event.stopPropagation(); onWheel(event.deltaY); }}
        onAfterRender={() => {
          if (!ready.current) { ready.current = true; readyFrame.current = requestAnimationFrame(onReady); }
        }}>
        <shaderMaterial {...phosphor} toneMapped={false} />
      </mesh>
      <mesh geometry={resources.glass} position={[0, MACHINE.screenY, .002]} raycast={() => null}>
        <shaderMaterial transparent depthWrite={false} toneMapped={false}
          vertexShader={`varying vec3 vN;varying vec3 vP;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vP=p.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}`}
          fragmentShader={`varying vec3 vN;varying vec3 vP;void main(){
            vec3 viewDir=normalize(-vP);vec3 reflected=reflect(-viewDir,normalize(vN));
            float fresnel=pow(1.-max(dot(normalize(vN),viewDir),0.),3.);
            float lamp=pow(max(dot(reflected,normalize(vec3(-.24,.09,1.))),0.),250.);
            float strip=pow(max(dot(reflected,normalize(vec3(-.34,.02,1.))),0.),550.);
            gl_FragColor=vec4(.40,.77,.69,.005+fresnel*.14+lamp*.009+strip*.026);
          }`} />
      </mesh>

      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * 2.425, .225, .372]}><boxGeometry args={[.41, 2.74, .038]} /><meshStandardMaterial color="#010504" roughness={1} /></mesh>
        {[-1, 1].map(edge => <mesh key={edge} position={[side * 2.425 + edge * .212, .225, .404]}><boxGeometry args={[.018, 2.84, .040]} /><meshStandardMaterial color="#466053" roughness={.55} metalness={.6} /></mesh>)}
        <mesh position={[side * 2.650, .25, .405]}><boxGeometry args={[.013, 2.98, .015]} /><meshStandardMaterial color="#71998a" roughness={.38} metalness={.74} /></mesh>
      </group>)}

      {/* A separate steel control plinth with a shadow gap beneath the monitor. */}
      <RoundedBox args={[5.34, .425, .69]} position={[0, -1.568, -.024]} radius={.016} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial color="#637b70" map={resources.color} roughnessMap={resources.rough} roughness={.78} metalness={.4} bumpMap={resources.rough} bumpScale={.0015} />
      </RoundedBox>
      <mesh position={[0, -1.348, .192]}><boxGeometry args={[5.29, .023, .34]} /><meshStandardMaterial color="#010302" roughness={1} /></mesh>
      {[-1, 1].map(side => <group key={side}>
        {[[side * 1.65, .96], [side * 2.405, .52]].map(([x, width]) => <group key={x}>
          <mesh position={[x, -1.567, .322]}><boxGeometry args={[width, .324, .013]} /><meshStandardMaterial color="#010504" roughness={1} /></mesh>
          {[-1, 1].map(edge => <mesh key={edge} position={[x + edge * width / 2, -1.567, .34]}><boxGeometry args={[.018, .34, .030]} /><meshStandardMaterial color="#5b7668" map={resources.color} roughness={.51} metalness={.58} /></mesh>)}
        </group>)}
      </group>)}
      <Grilles map={resources.color} rough={resources.rough} />

      <mesh position={[0, -1.552, .332]}><boxGeometry args={[2.025, .385, .064]} /><meshStandardMaterial color="#3b5147" map={resources.color} roughness={.68} metalness={.39} /></mesh>
      <mesh position={[0, -1.438, .369]}><boxGeometry args={[1.83, .130, .014]} /><meshStandardMaterial color="#010403" roughness={1} /></mesh>
      <mesh position={[0, -1.438, .378]}><boxGeometry args={[1.72, .045, .008]} /><meshStandardMaterial color="#1b2921" map={resources.color} roughness={.87} /></mesh>
      <mesh position={[.15, -1.65, .37]}><boxGeometry args={[1.095, .165, .012]} /><meshStandardMaterial color="#010504" roughness={1} /></mesh>
      {Array.from({ length: 6 }, (_, index) => <RoundedBox key={index} args={[.148, .127, .054]} position={[-.299 + index * .163, -1.65, .395]} radius={.007} smoothness={2}>
        <meshStandardMaterial color={index === 0 ? '#334a3f' : '#60766b'} map={resources.color} roughness={.58} metalness={.29} bumpMap={resources.rough} bumpScale={.004} />
      </RoundedBox>)}
      <RoundedBox args={[.12, .093, .048]} position={[.79, -1.674, .392]} radius={.004} onClick={event => { event.stopPropagation(); onPower(); }}>
        <meshStandardMaterial color="#6e897b" roughness={.5} metalness={.56} />
      </RoundedBox>
      <mesh position={[.794, -1.674, .420]} raycast={() => null}><circleGeometry args={[.015, 16]} /><meshBasicMaterial color={awake ? '#9ef4d6' : '#264c3c'} toneMapped={false} /></mesh>
      <mesh position={[0, -1.55, .436]} raycast={() => null}><planeGeometry args={[5.1, .6375]} /><meshBasicMaterial map={resources.label} transparent toneMapped={false} depthWrite={false} /></mesh>

      {[[-2.63, 1.744], [2.63, 1.744], [-2.63, -1.235], [2.63, -1.235], [-1.1, -1.692], [1.1, -1.692]].map(([x, y], i) => <group key={i} position={[x, y, y < -1.4 ? .328 : .414]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.018, .018, .011, 10]} /><meshStandardMaterial color="#394d40" roughness={.54} metalness={.8} /></mesh>
        <mesh position={[0, 0, .008]} rotation={[0, 0, .45]}><boxGeometry args={[.019, .003, .003]} /><meshBasicMaterial color="#030704" /></mesh>
      </group>)}
      {[-2.25, 2.25].map(x => <RoundedBox key={x} args={[.46, .080, .47]} radius={.010} smoothness={2} position={[x, -1.821, -.13]} castShadow><meshStandardMaterial color="#13231a" roughness={.86} /></RoundedBox>)}
    </group>

    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.867, 0]} receiveShadow><planeGeometry args={[18, 8]} /><meshStandardMaterial color="#040807" roughness={.95} metalness={.05} transparent opacity={.5} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.86, -.10]} raycast={() => null}>
      <planeGeometry args={[6.3, 2.1]} />
      <shaderMaterial transparent depthWrite={false} toneMapped={false}
        vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }"
        fragmentShader="varying vec2 vUv;void main(){vec2 q=(vUv-.5)*2.;float a=exp(-q.x*q.x*2.-q.y*q.y*8.);gl_FragColor=vec4(0.,.002,.001,a*.84);}" />
    </mesh>
    <EffectComposer multisampling={0}><Bloom intensity={.095} luminanceThreshold={.87} luminanceSmoothing={.18} mipmapBlur /></EffectComposer>
  </>;
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function EchoMachine(props: EchoMachineProps) {
  return <motion.div data-testid="echo-webgl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: props.still ? 0 : .3 }} style={{ width: '100%', height: '100%', touchAction: 'none' }}>
    <SceneBoundary onFailure={props.onFailure}>
      <Canvas orthographic shadows dpr={[1, 1.75]} camera={{ position: [0, -.015, 8], near: .1, far: 100, zoom: 150 }}
        gl={defaults => {
          try {
            const renderer = new THREE.WebGLRenderer({ ...defaults, alpha: false, antialias: true, powerPreference: 'high-performance' });
            renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.03;
            return renderer;
          } catch (error) {
            // R3F configures asynchronously; report creation failures explicitly.
            queueMicrotask(props.onFailure);
            throw error;
          }
        }}
        fallback={<span>Your browser cannot display the 3D terminal. Use reading mode.</span>}
        onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}>
        <Assembly {...props} />
      </Canvas>
    </SceneBoundary>
  </motion.div>;
}
