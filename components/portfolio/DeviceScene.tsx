"use client";
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";
import type { SurfaceProps } from "./DeviceSurface";
import styles from "./Devices.module.css";

function Slab({ at, size, color, radius = .04, metal = 0 }: { at: [number, number, number]; size: [number, number, number]; color: string; radius?: number; metal?: number }) {
  return <RoundedBox args={size} position={at} radius={radius} smoothness={3}>
    <meshStandardMaterial color={color} roughness={metal ? .48 : .62} metalness={metal} />
  </RoundedBox>;
}
function Model({ kind, active, still, phase }: SurfaceProps) {
  const face = useRef<Group>(null);
  const { invalidate, size } = useThree();
  useEffect(() => { if (active) invalidate(); }, [active, phase, still, invalidate]);
  useFrame((_, delta) => {
    if (!face.current || !active) return;
    const target = still || phase === "seated" ? 0 : -.055;
    const next = still ? target : face.current.position.y + (target - face.current.position.y) * Math.min(1, delta * 16);
    face.current.position.y = next;
    if (Math.abs(target - next) > .001) invalidate();
  });
  return <group scale={[1, (size.height / size.width) / (kind === "deck" ? .4 : .9), 1]}><group ref={face}>
    {kind === "deck" ? <>
      <Slab at={[0, .045, 0]} size={[7.8, 2.91, .16]} color="#b9bcb6" metal={.5} radius={.075} />
      <Slab at={[0, 1.19, .09]} size={[7.65, .45, .02]} color="#c7c9c3" metal={.45} radius={.012} />
      <Slab at={[0, .68, .095]} size={[7.74, .012, .005]} color="#5e665c" radius={.002} />
      <Slab at={[0, -.84, .095]} size={[7.74, .014, .005]} color="#5e665c" radius={.002} />
      <Slab at={[0, 1.2, .11]} size={[5.46, .21, .035]} color="#080d0a" radius={.035} />
      <Slab at={[.01, .035, .105]} size={[5.34, 1.35, .035]} color="#40483c" radius={.065} />
      <Slab at={[.01, .035, .125]} size={[5.2, 1.21, .025]} color="#030804" radius={.045} />
    </> : <>
      <Slab at={[0, .05, 0]} size={[3.7, 3.2, .35]} color="#d4cbb8" radius={.07} />
      <Slab at={[0, .135, .19]} size={[3.1, 2.47, .065]} color="#8e826b" radius={.11} />
      <Slab at={[0, .14, .23]} size={[2.92, 2.32, .075]} color="#191d1a" radius={.14} />
      <Slab at={[0, .14, .27]} size={[2.83, 2.23, .055]} color="#060b09" radius={.17} />
      <Slab at={[0, -1.19, .18]} size={[3.65, .012, .01]} color="#988b74" radius={.002} />
      <Slab at={[-1.4, -1.6, -.03]} size={[.48, .18, .16]} color="#9d9078" radius={.025} />
      <Slab at={[1.4, -1.6, -.03]} size={[.48, .18, .16]} color="#9d9078" radius={.025} />
    </>}
  </group></group>;
}
export default function DeviceScene(props: SurfaceProps) {
  const [lost, setLost] = useState(false);
  if (lost) return null;
  return <div className={styles.webgl} data-device-scene={props.kind}>
    <Canvas orthographic camera={{ position: [0, 0, 12], zoom: 100, near: .1, far: 30 }} dpr={[1, 2]} frameloop={props.active ? "demand" : "never"}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} fallback={null}
      onCreated={({ gl, camera, size }) => {
        camera.zoom = size.width / (props.kind === "deck" ? 8 : 4); camera.updateProjectionMatrix();
        gl.domElement.addEventListener("webglcontextlost", event => { event.preventDefault(); setLost(true); }, { once: true });
      }}>
      <ambientLight intensity={.9} />
      <directionalLight position={[-3, 5, 8]} intensity={1.8} color="#fffcf5" />
      <directionalLight position={[4, -2, 5]} intensity={.4} color="#a9bdd4" />
      <Model {...props} />
      <CameraSize kind={props.kind} />
    </Canvas>
  </div>;
}
function CameraSize({ kind }: { kind: "deck" | "monitor" }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    // Three's imperative camera is not a React state object; resize must update its projection.
    // eslint-disable-next-line react-hooks/immutability
    camera.zoom = size.width / (kind === "deck" ? 8 : 4);
    camera.updateProjectionMatrix(); invalidate();
  }, [camera, size.width, kind, invalidate]);
  return null;
}
