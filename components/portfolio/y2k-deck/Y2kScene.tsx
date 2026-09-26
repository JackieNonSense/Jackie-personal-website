"use client";
/* Three.js owns these mutable GPU resources; they are not React state, and the render
   loop moves them every frame by design. */
/* eslint-disable react-hooks/immutability */
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { MusicController, MusicSnapshot } from '../music-controller';
import { musicTracks } from '../music-tracks';
import { advanceDeckMeter, createDeckMeter } from '../deck-beat-meter';
import { DISPLAY_CANVAS, drawGlowingDisplay } from './display-canvas';
import { SCREEN_FRAGMENT, SCREEN_VERTEX, drawTitle, sceneForTrack } from './screen-shader';
import { FOV, FRAME, cameraAngles, cameraPosition, keyTravel, type DeckKey } from './stage';
import { OFF, ON, discTo, powerOff, powerOn, type Mechanism } from './sequence';
import mechanism from './mechanism.json';

export type KeyRect = { left: number; top: number; width: number; height: number };
export type SceneProps = {
  active: boolean; still: boolean; player: MusicController; state: MusicSnapshot;
  /** The key currently held down, if any. */
  pressed: DeckKey | '';
  /** The disc has been ejected and waits half out of the mouth. */
  discOut: boolean;
  /** 0..1, how far the section has scrolled through the viewport. */
  scroll: { current: number };
  /** Where each key sits on the canvas, in percent, whenever that changes. */
  placeKeys: (rects: Partial<Record<DeckKey, KeyRect>>) => void;
  onReady: () => void; onFailure: () => void;
};

const MODEL = '/portfolio/y2k-deck/deck.glb';
const KEY_NODES: Record<string, DeckKey[]> = {
  Key_prev: ['prev'], Key_play: ['play'], Key_stop: ['stop'], Key_next: ['next'], Key_mute: ['mute'], Key_power: ['power'],
  Key_eject: ['eject'], Key_rocker: ['volup', 'voldown'],
};
// The model's nodes move in centimetres under a root scaled to metres.
const KEY_TRAVEL = .14;
const { clear: CLEAR, extend: EXTEND, stage1: STAGE1, discTravel: DISC_TRAVEL } = mechanism;

function rms(samples: ArrayLike<number> | undefined) {
  if (!samples || !samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.min(1, Math.sqrt(sum / samples.length) * 3.2);
}

const physical = (params: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(params);

/** A light that runs along the ink-green trim: a bright head at uRun (world x, metres)
 *  with a tail behind it, added to the material's own glow. */
function runLight(m: THREE.MeshPhysicalMaterial, run: { uRun: { value: number }; uRunGlow: { value: number } }) {
  m.onBeforeCompile = shader => {
    shader.uniforms.uRun = run.uRun; shader.uniforms.uRunGlow = run.uRunGlow;
    shader.vertexShader = 'varying float vRunX;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vRunX = (modelMatrix * vec4(transformed, 1.0)).x;');
    shader.fragmentShader = 'uniform float uRun; uniform float uRunGlow; varying float vRunX;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n  float runD = vRunX - uRun;\n  float runL = exp(-runD * runD / .00012) * 3.2 + (runD < 0.0 ? exp(runD / .05) * .7 : 0.0);\n  totalEmissiveRadiance += vec3(.56, 1.0, .8) * runL * uRunGlow;');
  };
}

function Deck(props: SceneProps) {
  const gltf = useLoader(GLTFLoader, MODEL, loader => {
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/'); loader.setDRACOLoader(draco);
  });
  const { gl, camera, invalidate } = useThree();
  const sweepLight = useRef<THREE.PointLight>(null);

  const assets = useMemo(() => {
    const root = gltf.scene.clone(true);
    const canvas = document.createElement('canvas'), layer = document.createElement('canvas');
    canvas.width = layer.width = DISPLAY_CANVAS.width; canvas.height = layer.height = DISPLAY_CANVAS.height;
    const display = new THREE.CanvasTexture(canvas);
    display.flipY = false; display.colorSpace = THREE.SRGBColorSpace; display.anisotropy = gl.capabilities.getMaxAnisotropy();
    const spectrum = new THREE.DataTexture(new Uint8Array(32), 32, 1, THREE.RedFormat);
    spectrum.needsUpdate = true;
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 1280; titleCanvas.height = Math.round(1280 / 2.514);
    const title = new THREE.CanvasTexture(titleCanvas);
    title.colorSpace = THREE.SRGBColorSpace; title.anisotropy = gl.capabilities.getMaxAnisotropy();
    const screen = new THREE.ShaderMaterial({
      vertexShader: SCREEN_VERTEX, fragmentShader: SCREEN_FRAGMENT, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uBass: { value: 0 }, uKick: { value: 0 }, uScene: { value: 0 }, uAspect: { value: 2.514 },
        uPicture: { value: 0 }, uNoise: { value: 0 }, uDegauss: { value: 0 }, uPulse: { value: 0 }, uPulseGlow: { value: 0 },
        uSpec: { value: spectrum }, uText: { value: title } },
    });
    const run = { uRun: { value: -1 }, uRunGlow: { value: 0 } };
    const icons: THREE.MeshStandardMaterial[] = [], trims: THREE.MeshPhysicalMaterial[] = [], lamps: THREE.MeshStandardMaterial[] = [];
    const powers: THREE.MeshPhysicalMaterial[] = [];
    const disposables: { dispose: () => void }[] = [display, spectrum, screen, title];
    root.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      const src = node.material as THREE.MeshStandardMaterial;
      const name = src.name.replace(/\.\d+$/, '');
      let m: THREE.Material;
      if (node.name.startsWith('DisplayScreen')) m = new THREE.MeshBasicMaterial({ map: display, toneMapped: false });
      else if (node.name.startsWith('Screen1Screen')) m = screen;
      else if (name === 'Titanium') m = physical({ color: '#3b3f46', metalness: 1, roughness: .34, clearcoat: .45, clearcoatRoughness: .18 });
      else if (name === 'TitaniumDark') m = physical({ color: '#1f2226', metalness: .95, roughness: .4 });
      else if (name === 'Chrome') m = physical({ color: '#f1f3f6', metalness: 1, roughness: .035 });
      else if (name === 'Satin') m = physical({ color: '#a9adb4', metalness: 1, roughness: .18 });
      else if (name === 'KeyCap') m = physical({ color: '#4a4f58', metalness: .9, roughness: .22, clearcoat: .8, clearcoatRoughness: .06 });
      else if (name === 'InkGreen') { const t = physical({ color: '#1d3b31', metalness: .7, roughness: .28, clearcoat: .7, clearcoatRoughness: .1, emissive: '#34c98a', emissiveIntensity: 0 }); runLight(t, run); trims.push(t); m = t; }
      else if (name === 'PowerGlass') { const g = physical({ color: '#2a5e48', metalness: 0, roughness: .2, clearcoat: 1, emissive: '#3fd08f', emissiveIntensity: 0 }); powers.push(g); m = g; }
      else if (name === 'N_mint' || name === 'IconDark') { const g = new THREE.MeshStandardMaterial({ color: '#0a0c0b', emissive: '#8ff5c4', emissiveIntensity: 0 }); icons.push(g); m = g; }
      else if (name === 'Amber') { const g = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#f0b25a', emissiveIntensity: 0 }); lamps.push(g); m = g; }
      else if (name === 'Lens') m = physical({ color: '#101714', metalness: 0, roughness: .03, transparent: true, opacity: .12, depthWrite: false });
      else if (name === 'DiscMirror') m = physical({ color: '#e4e7ec', metalness: 1, roughness: .07, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 620] });
      else if (name === 'DiscLabel') m = physical({ color: '#244aaa', metalness: .1, roughness: .45, clearcoat: .6 });
      else if (name === 'DiscClear') m = physical({ color: '#d7dde6', metalness: 0, roughness: .05, transparent: true, opacity: .35 });
      else if (name === 'Black' || name === 'DisplayBlack') m = physical({ color: '#040405', metalness: .2, roughness: .6 });
      else m = physical({ color: src.color, metalness: src.metalness, roughness: src.roughness });
      if (m !== screen) disposables.push(m);
      node.material = m;
      const glowing = m === screen || node.name.startsWith('DisplayScreen');
      node.castShadow = !glowing; node.receiveShadow = !glowing;
    });
    root.updateMatrixWorld(true);
    const keys: { node: THREE.Object3D; rest: THREE.Vector3; names: DeckKey[]; box: THREE.Box3; travel: number; tilt: number }[] = [];
    for (const [nodeName, names] of Object.entries(KEY_NODES)) {
      const node = root.getObjectByName(nodeName);
      if (node) keys.push({ node, rest: node.position.clone(), names, box: new THREE.Box3().setFromObject(node), travel: 0, tilt: 0 });
    }
    const pose = (name: string) => { const n = root.getObjectByName(name); return n ? { n, p: n.position.clone(), r: n.rotation.clone() } : null; };
    const rods: THREE.Object3D[] = [];
    root.getObjectByName('ScreenLift')?.traverse(n => { if (n.name.startsWith('PostRod')) rods.push(n); });
    // The light that runs round the trim follows the faceplate's front edge.
    const face = new THREE.Box3().setFromObject(root.getObjectByName('Faceplate') ?? root);
    return {
      root, display, context: canvas.getContext('2d')!, layer: layer.getContext('2d')!, spectrum, screen, icons, trims, lamps, powers, run,
      title, titleContext: titleCanvas.getContext('2d')!, titled: -1,
      keys, rods, face, disposables,
      coverFront: pose('CoverFront'), coverBack: pose('CoverBack'), stage1: pose('PostStage1'), lift: pose('ScreenLift'), tilt: pose('Screen1'), disc: pose('Disc'),
    };
  }, [gltf, gl]);

  useEffect(() => () => assets.disposables.forEach(d => d.dispose()), [assets]);

  const { player, state, still, pressed, discOut, scroll, placeKeys, onReady } = props;
  const mech = useRef<Mechanism>({ ...OFF });
  const timeline = useRef<{ kill: () => unknown } | null>(null);
  // Power: play the whole sequence, or pose the end of it at once when motion is off.
  const outRef = useRef(discOut);
  useEffect(() => { outRef.current = discOut; });
  useEffect(() => {
    timeline.current?.kill();
    if (still) { Object.assign(mech.current, state.powered ? ON : OFF); if (outRef.current) mech.current.disc = 0; invalidate(); return; }
    timeline.current = state.powered ? powerOn(mech.current) : powerOff(mech.current);
  }, [state.powered, still, invalidate]);
  // Eject draws the disc half out; playing again takes it back in.
  const poweredRef = useRef(state.powered);
  useEffect(() => { poweredRef.current = state.powered; });
  useEffect(() => {
    if (!poweredRef.current) return;
    if (still) { mech.current.disc = discOut ? 0 : 1; invalidate(); return; }
    const tween = discTo(mech.current, !discOut);
    return () => { tween.kill(); };
  }, [discOut, still, invalidate]);
  useEffect(() => () => { timeline.current?.kill(); }, []);

  const failure = useRef(props.onFailure);
  useEffect(() => { failure.current = props.onFailure; });
  useEffect(() => {
    // A remount in development can dispose an earlier renderer on this same canvas;
    // only give up on the scene if this renderer's own context is really gone.
    const lost = (e: Event) => { e.preventDefault(); setTimeout(() => { if (gl.getContext().isContextLost()) failure.current(); }, 300); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl]);

  const view = useRef({ yaw: NaN, pitch: NaN, time: 0, drawn: 0, ready: false, placed: '', beat: -1e9 });
  const meter = useRef(createDeckMeter());
  const bands = useRef(new Float32Array(32)), peaks = useRef(new Float32Array(32)), bassLevel = useRef(0);

  useFrame((_, delta) => {
    if (!props.active) return;
    const now = performance.now(), dt = Math.min(.05, delta), v = view.current, m = mech.current, a = assets;
    // ----- the mechanism, posed from the sequence's state.
    if (a.coverFront) a.coverFront.n.rotation.x = a.coverFront.r.x * m.covers;
    if (a.coverBack) a.coverBack.n.rotation.x = a.coverBack.r.x * m.covers;
    if (a.stage1) a.stage1.n.position.y = a.stage1.p.y - STAGE1 * (1 - m.stage1);
    if (a.lift) a.lift.n.position.y = a.lift.p.y - CLEAR * (1 - m.rise) - STAGE1 * (1 - m.stage1) - (EXTEND - STAGE1) * (1 - m.stage2);
    if (a.tilt) a.tilt.n.rotation.x = a.tilt.r.x * m.tilt;
    if (a.disc) a.disc.n.position.z = a.disc.p.z - DISC_TRAVEL * m.disc;
    for (const r of a.rods) r.visible = m.rise > .42;
    // ----- light: key backlights wake one after another; the trim carries the sweep.
    a.icons.forEach((g, i) => { g.emissiveIntensity = .15 + 2.3 * Math.max(0, Math.min(1, m.keys * (a.icons.length + 2) - i)); });
    a.lamps.forEach(l => { l.emissiveIntensity = 3 * m.keys; });
    a.powers.forEach(g => { g.emissiveIntensity = .2 + 1.3 * m.keys; });
    const f = a.face, from = f.min.x - .04, to = f.max.x + .04;
    const powering = m.sweep > 0 && m.sweep < 1;
    const kick = meter.current.kick;
    if (!powering && state.status === 'playing' && !still && kick > .55 && now - v.beat > 380) v.beat = now;
    const beatT = (now - v.beat) / 650;
    let head = -1, glow = 0;
    if (powering) { head = from + (to - from) * m.sweep; glow = Math.sin(Math.PI * m.sweep) * 1.2; }
    else if (beatT < 1) { head = from + (to - from) * (1 - (1 - beatT) ** 2.2); glow = (1 - beatT) ** 1.4 * .9; }
    a.run.uRun.value = head; a.run.uRunGlow.value = glow;
    const breath = state.status === 'playing' ? .06 + .5 * Math.min(1, bassLevel.current) : .06;
    a.trims.forEach(t => { t.emissiveIntensity = breath * m.keys; });
    a.screen.uniforms.uPulse.value = powering ? m.sweep : Math.min(1, beatT);
    a.screen.uniforms.uPulseGlow.value = powering ? 0 : Math.max(0, 1 - beatT) * .9;
    if (sweepLight.current) {
      sweepLight.current.position.set(head, f.min.y + .026, f.max.z + .012);
      sweepLight.current.intensity = .5 * glow;
    }
    // ----- keys: down fast, up slow; the rocker tips towards the half that is held.
    for (const k of a.keys) {
      const held = k.names.includes(pressed as DeckKey);
      k.travel = keyTravel(k.travel, held, dt);
      k.node.position.z = k.rest.z - KEY_TRAVEL * k.travel * (k.names.length > 1 ? .4 : 1);
      if (k.names.length > 1) {
        const aim = held ? (pressed === 'volup' ? 1 : -1) : 0;
        k.tilt += (aim - k.tilt) * (1 - Math.exp(-(held ? 55 : 18) * dt));
        k.node.rotation.x = -.09 * k.tilt;
      }
    }
    // ----- sound: the analyser drives the display and the top screen.
    const playing = state.status === 'playing' && !still;
    const exchange = state.exchangeStartedAt === null ? null : now - state.exchangeStartedAt;
    meter.current = advanceDeckMeter(meter.current, playing ? player.sample() : undefined, dt, state.status, exchange, still);
    for (let i = 0; i < 32; i++) { bands.current[i] = meter.current.levels[i] / 8; peaks.current[i] = meter.current.peaks[i] / 8; }
    const data = a.spectrum.image.data as Uint8Array;
    for (let i = 0; i < 32; i++) data[i] = Math.round(Math.min(1, bands.current[i]) * 255);
    a.spectrum.needsUpdate = true;
    const bass = (bands.current[0] + bands.current[1] + bands.current[2] + bands.current[3]) / 4;
    bassLevel.current = bass;
    if (a.titled !== state.track) {
      a.titled = state.track;
      const t = musicTracks[state.track];
      drawTitle(a.titleContext, t.title, t.artist, state.track, musicTracks.length);
      a.title.needsUpdate = true;
    }
    v.time += dt * (playing ? 1 : .3);
    const u = a.screen.uniforms;
    u.uTime.value = v.time; u.uBass.value = Math.min(1, bass); u.uKick.value = meter.current.kick; u.uScene.value = sceneForTrack(state.track);
    u.uPicture.value = m.picture; u.uNoise.value = m.noise; u.uDegauss.value = m.degauss;
    if (now - v.drawn > 33 || still) {
      v.drawn = now;
      const stereo = playing ? player.stereo() : undefined;
      drawGlowingDisplay(a.context, a.layer, {
        title: musicTracks[state.track].title, track: state.track, tracks: musicTracks.length, time: state.time, duration: state.duration,
        status: state.status, muted: state.muted, disc: !discOut, bands: bands.current, peaks: peaks.current,
        left: stereo ? rms(stereo[0]) : 0, right: stereo ? rms(stereo[1]) : 0, wave: [], lit: m.display, clock: v.time, bass,
        swap: exchange === null ? undefined : exchange / 1100,
      });
      a.display.needsUpdate = true;
    }
    // ----- camera: a few degrees of orbit with the scroll.
    const aim = cameraAngles(scroll.current, still);
    const ease = Number.isNaN(v.yaw) ? 1 : 1 - Math.exp(-dt * 4);
    v.yaw = Number.isNaN(v.yaw) ? aim.yaw : v.yaw + (aim.yaw - v.yaw) * ease;
    v.pitch = Number.isNaN(v.pitch) ? aim.pitch : v.pitch + (aim.pitch - v.pitch) * ease;
    const [x, y, z] = cameraPosition(v.yaw, v.pitch);
    const [tx, ty, tz] = FRAME.target;
    camera.position.set(x, y, z);
    camera.lookAt(tx, ty, tz);
    // ----- keep the real buttons over the keys they stand for.
    const rects: Partial<Record<DeckKey, KeyRect>> = {};
    const p = new THREE.Vector3();
    for (const k of a.keys) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const cx of [k.box.min.x, k.box.max.x]) for (const cy of [k.box.min.y, k.box.max.y]) {
        p.set(cx, cy, k.box.max.z).project(camera);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      const left = (x0 + 1) * 50, width = (x1 - x0) * 50, top = (1 - y1) * 50, height = (y1 - y0) * 50;
      if (k.names.length > 1) { rects.volup = { left, top, width, height: height / 2 }; rects.voldown = { left, top: top + height / 2, width, height: height / 2 }; }
      else rects[k.names[0]] = { left, top, width, height };
    }
    const signature = Object.values(rects).map(r => `${r!.left.toFixed(1)},${r!.top.toFixed(1)}`).join('|');
    if (signature !== v.placed) { v.placed = signature; placeKeys(rects); }
    if (!v.ready) { v.ready = true; queueMicrotask(onReady); }
    if (still) invalidate();
  }, 0);

  return <>
    <primitive object={assets.root} />
    <pointLight ref={sweepLight} color="#8ff5c4" distance={.14} decay={2} intensity={0} />
  </>;
}

/** A studio for chrome and titanium: a soft box overhead, two tall strips for the
 *  edge highlights, a kicker from the front, a faint green bounce from below. */
function Studio() {
  // Flat faces facing the camera reflect what is behind it: a large dim card there
  // gives the titanium its sheen; the narrow strips and the top box draw the edges.
  return <Environment resolution={256} frames={1} environmentIntensity={1}>
    <Lightformer form="rect" intensity={.85} position={[0, 1.5, 8]} scale={[14, 7, 1]} color="#e9eef5" />
    <Lightformer form="rect" intensity={2.2} position={[0, 7, 1]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
    <Lightformer form="rect" intensity={6} position={[-6, 1.5, 3]} rotation-y={Math.PI / 3} scale={[.3, 9, 1]} />
    <Lightformer form="rect" intensity={4} position={[6, 2, 2.5]} rotation-y={-Math.PI / 3} scale={[.25, 9, 1]} />
    <Lightformer form="rect" intensity={3} position={[0, 4.2, 6]} scale={[9, .12, 1]} />
    <Lightformer form="rect" intensity={.4} position={[0, -4, 3]} rotation-x={-Math.PI / 2} scale={[8, 2, 1]} color="#34c98a" />
  </Environment>;
}

export default function Y2kScene(props: SceneProps) {
  return <Canvas shadows
    camera={{ fov: FOV, near: .02, far: 10, position: cameraPosition(0, 4) as unknown as [number, number, number] }}
    dpr={[2, 2.5]} frameloop={props.active ? (props.still ? 'demand' : 'always') : 'never'}
    gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => { gl.setClearColor(0, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
    style={{ touchAction: 'pan-y', pointerEvents: 'none' }}>
    <ambientLight intensity={.04} />
    <directionalLight castShadow position={[-.3, .55, .45]} intensity={1.1} color="#fff3e6"
      shadow-mapSize={[2048, 2048]} shadow-bias={-.0012} shadow-normalBias={.03} shadow-radius={4}
      shadow-camera-left={-.3} shadow-camera-right={.3} shadow-camera-top={.4} shadow-camera-bottom={-.1} shadow-camera-near={.1} shadow-camera-far={2} />
    <Studio />
    {/* The model loads inside the canvas: suspending out of it would unmount the renderer. */}
    <Suspense fallback={null}><Deck {...props} /></Suspense>
    <ContactShadows position={[0, -.0005, .05]} opacity={.7} scale={.7} blur={2.6} far={.12} resolution={512} color="#000000" />
  </Canvas>;
}
