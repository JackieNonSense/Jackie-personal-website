"use client";
/* Three.js owns these mutable GPU resources; effects/frames update them outside React render. */
/* eslint-disable react-hooks/immutability */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { addAfterEffect, Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, SRGBColorSpace } from "three";
import type { MonitorProps } from "./MonitorSurface";
import { curvedScreen, frameGeometry } from "./monitor-geometry";
import { housingMaps } from "./monitor-wear";
import { presentationStep, type Presentation } from "./monitor-presentation";
import { bootLines, initialBoot, stepBoot, type BootState } from "./monitor-boot";
import styles from "./Monitor.module.css";

type Props = MonitorProps & { onReady: () => void; onFailure: () => void };
function drawScreen(ctx: CanvasRenderingContext2D, state: BootState) {
  ctx.fillStyle = "#020505"; ctx.fillRect(0, 0, 768, 576);
  const light = ctx.createRadialGradient(340, 240, 20, 384, 288, 440);
  light.addColorStop(0, `rgba(34,53,37,${state.power * .36})`); light.addColorStop(1, "rgba(2,5,5,0)");
  ctx.fillStyle = light; ctx.fillRect(0, 0, 768, 576);
  ctx.save(); ctx.globalAlpha = state.power;
  ctx.font = '28px "Courier New", monospace'; ctx.textBaseline = "top";
  for (let i = 0; i < state.lines; i++) {
    const y = i === 0 ? 95 : 171 + (i - 1) * 46 + (i === 4 ? 35 : 0);
    ctx.fillStyle = i === 0 ? "#a5c3a0" : "#82a984";
    ctx.font = i === 0 ? '26px "Courier New", monospace' : '28px "Courier New", monospace';
    ctx.shadowColor = "#497d50"; ctx.shadowBlur = 3;
    ctx.fillText(bootLines[i], 68, y);
  }
  ctx.shadowBlur = 0;
  if (state.lines) { ctx.fillStyle = "#28432d"; ctx.fillRect(68, 137, 628, 1); }
  ctx.restore();
  // Fine scanlines belong to the phosphor texture, not to the page or glass.
  ctx.fillStyle = "rgba(0,0,0,.14)";
  for (let y = 0; y < 576; y += 3) ctx.fillRect(0, y, 768, 1);
}
function Assembly({ awake, still, active, onReady }: Props) {
  const { gl, invalidate, camera, size } = useThree();
  const state = useRef(initialBoot());
  const presentation = useRef<Presentation>("unprepared");
  const restartClock = useRef(true);
  const resources = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 768; canvas.height = 576;
    const screen = new CanvasTexture(canvas); screen.colorSpace = SRGBColorSpace; screen.minFilter = LinearFilter; screen.generateMipmaps = false;
    const labels = document.createElement("canvas"); labels.width = 1024; labels.height = 96;
    const labelCtx = labels.getContext("2d")!;
    labelCtx.fillStyle = "#555344"; labelCtx.font = "24px monospace";
    labelCtx.fillText("JACKIE", 15, 49); labelCtx.font = "18px monospace";
    labelCtx.fillText("POWER", 739, 54); labelCtx.fillText("−    +", 863, 54);
    const labelTexture = new CanvasTexture(labels); labelTexture.colorSpace = SRGBColorSpace;
    const maps = housingMaps();
    const [patina, roughness, grain] = [maps.color, maps.roughness, maps.height].map(data => {
      const texture = new DataTexture(data, maps.width, maps.rows, RGBAFormat);
      texture.magFilter = LinearFilter; texture.minFilter = LinearMipmapLinearFilter;
      texture.generateMipmaps = true; texture.needsUpdate = true;
      return texture;
    });
    patina.colorSpace = SRGBColorSpace;
    return { canvas, screen, labelTexture, patina, roughness, grain, glass: curvedScreen(), shell: frameGeometry(4, 3.15, 3.35, 2.47, .18), rim: frameGeometry(3.34, 2.46, 3.09, 2.19, 0) };
  }, []);
  // Deliberately use the warm direct-light rig only. The old late room environment
  // washed the aged shell out after its first frame; no asynchronous lighting swap remains.
  useEffect(() => addAfterEffect(() => {
    const before = presentation.current;
    presentation.current = presentationStep(before, "after-render");
    if (before !== "ready" && presentation.current === "ready") onReady();
  }), [onReady]);
  useEffect(() => () => { resources.screen.dispose(); resources.labelTexture.dispose(); resources.patina.dispose(); resources.roughness.dispose(); resources.grain.dispose(); resources.glass.dispose(); resources.shell.dispose(); resources.rim.dispose(); }, [resources]);
  useLayoutEffect(() => {
    // Imperative camera projection follows CSS size; the object itself never stretches.
    camera.zoom = Math.min(size.width / 4.45, size.height / 3.82);
    camera.updateProjectionMatrix();
    presentation.current = presentationStep(presentation.current, "prepare");
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => { restartClock.current = true; if (active) invalidate(); }, [active, awake, still, invalidate]);
  useFrame((_, delta) => {
    if (!active) return;
    const dt = restartClock.current ? 0 : Math.min(delta, .05); restartClock.current = false;
    state.current = stepBoot(state.current, awake, dt, still);
    drawScreen(resources.canvas.getContext("2d")!, state.current); resources.screen.needsUpdate = true;
    gl.domElement.dataset.bootPhase = state.current.phase;
    gl.domElement.dataset.bootLines = String(state.current.lines);
    presentation.current = presentationStep(presentation.current, "draw");
    if (!still && state.current.phase !== "off" && state.current.phase !== "ready") invalidate();
  });
  return <group position={[0, .08, 0]}>
    <mesh geometry={resources.shell} position={[0, 0, .09]} castShadow receiveShadow>
      <meshPhysicalMaterial map={resources.patina} roughness={1} roughnessMap={resources.roughness} bumpMap={resources.grain} bumpScale={.018} clearcoat={.06} clearcoatRoughness={.8} envMapIntensity={.2} />
    </mesh>
    <mesh geometry={resources.rim} position={[0, .18, .025]} castShadow receiveShadow>
      <meshStandardMaterial color="#645744" roughness={.72} bumpMap={resources.grain} bumpScale={.008} envMapIntensity={.12} />
    </mesh>
    <mesh geometry={resources.glass} position={[0, .18, .07]}>
      <meshBasicMaterial map={resources.screen} toneMapped={false} />
    </mesh>
    <mesh geometry={resources.glass} position={[0, .18, .078]}>
      <shaderMaterial transparent depthWrite={false} toneMapped={false}
        vertexShader={`varying vec3 vN; varying vec3 vP;
          void main(){vec4 p=modelViewMatrix*vec4(position,1.);vP=p.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}`}
        fragmentShader={`varying vec3 vN; varying vec3 vP;
          void main(){
            vec3 n=normalize(vN);vec3 r=reflect(normalize(vP),n);
            // A bounded softbox bends around the dome, rather than fogging the whole screen.
            float windowX=smoothstep(.14,.23,r.x)*(1.-smoothstep(.6,.75,r.x));
            float windowY=smoothstep(.43,.49,r.y)*(1.-smoothstep(.61,.72,r.y));
            float upper=windowX*windowY;
            float edge=exp(-pow((r.x-.48)*32.,2.))*exp(-pow((r.y-.05)*2.4,2.));
            float fresnel=pow(1.-max(dot(n,normalize(-vP)),0.),3.);
            gl_FragColor=vec4(vec3(.66,.73,.75),.005+upper*.32+edge*.12+fresnel*.16);
          }`} />
    </mesh>
    <mesh position={[0, -1.335, .373]}><planeGeometry args={[3.55, .333]} /><meshBasicMaterial map={resources.labelTexture} transparent toneMapped={false} depthWrite={false} /></mesh>
    <mesh position={[.96, -1.35, .385]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.019, .019, .012, 16]} /><meshStandardMaterial color={awake ? "#96b65e" : "#4c5940"} emissive={awake ? "#4c6321" : "#000000"} emissiveIntensity={.3} /></mesh>
    <mesh position={[1.68, -1.35, .368]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[.083, .085, .055, 40]} /><meshStandardMaterial color="#a99f8b" roughness={.5} /></mesh>
    <mesh position={[1.68, -1.35, .397]}><ringGeometry args={[.035, .043, 32, 1, .35, Math.PI * 2 - .7]} /><meshBasicMaterial color="#605e4d" /></mesh>
    {[-1.38, 1.38].map(x => <RoundedBox key={x} args={[.46, .14, .42]} radius={.025} position={[x, -1.63, -.05]}><meshStandardMaterial color="#8d8470" roughness={.83} /></RoundedBox>)}
  </group>;
}
export default function MonitorScene(props: Props) {
  const [lost, setLost] = useState(false);
  if (lost) return null;
  return <div className={styles.scene} data-device-scene="monitor">
    <Canvas shadows orthographic camera={{ position: [0, 0, 9], zoom: 85, near: .1, far: 20 }} dpr={[1, 2]} frameloop={props.active ? "demand" : "never"}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", event => { event.preventDefault(); setLost(true); props.onFailure(); }, { once: true }); }}>
      <ambientLight intensity={.14} color="#f5e6c8" />
      <directionalLight position={[3, 4, 5]} intensity={1.15} color="#ffe4c4" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={.1} shadow-camera-far={16} shadow-bias={-.0003} shadow-normalBias={.012} />
      <directionalLight position={[-3, 1, 3]} intensity={.25} color="#c6d0d4" />
      <Assembly {...props} />
    </Canvas>
  </div>;
}
