"use client";
/* Three.js resources are intentionally updated by effects and the render loop. */
/* eslint-disable react-hooks/immutability */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { bezelGeometry, cameraZoom, housingGeometry, screenGeometry } from './terminal-geometry';
import { drawTerminal, displayAction } from './terminal-display';
import type { Session, Action } from './terminal-session';
import CRTScreen from './CRTScreen';

type Props = { session: Session; focused: boolean; still: boolean; dispatch: (a: Action) => void; onReady: () => void; onFailure: () => void };
RectAreaLightUniformsLib.init();

function surfaceTextures() {
  const size = 256, grain = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
  let seed = 271828;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const n = seed / 4294967296;
    for (let c = 0; c < 3; c++) { grain[i * 4 + c] = 110 + n * 38; rough[i * 4 + c] = 165 + n * 34; }
    grain[i * 4 + 3] = rough[i * 4 + 3] = 255;
  }
  const textures = [grain, rough].map(data => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
  });
  return { grain: textures[0], rough: textures[1] };
}

function Assembly({ session, focused, still, dispatch, onReady, onFailure }: Props) {
  const { camera, size, gl } = useThree();
  const group = useRef<THREE.Group>(null), glow = useRef<THREE.PointLight>(null);
  const frame = useRef(0);
  useEffect(() => { const canvas = gl.domElement; const lost = (event: Event) => { event.preventDefault(); onFailure(); }; canvas.addEventListener("webglcontextlost", lost); return () => canvas.removeEventListener("webglcontextlost", lost); }, [gl, onFailure]);
  const resources = useMemo(() => {
    const display = document.createElement('canvas'); display.width = 1440; display.height = 1000;
    drawTerminal(display.getContext('2d')!, { awake: false, view: 'mail', selected: 0, readIds: [], scroll: 0 });
    const texture = new THREE.CanvasTexture(display); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false;
    const label = document.createElement('canvas'); label.width = 1600; label.height = 140;
    const ctx = label.getContext('2d')!; ctx.fillStyle = '#8b9991'; ctx.font = 'bold 30px monospace'; ctx.fillText('JR', 34, 58); ctx.font = '18px monospace'; ctx.fillText('INDUSTRIES', 96, 55);
    ctx.fillStyle = '#526d64'; ctx.font = '16px monospace'; ctx.fillText('TERMLINK  /  07', 35, 91);
    ['MAIL', 'FILES', 'LOGS', 'SYS', 'GAME'].forEach((t, i) => ctx.fillText(t, 940 + i * 102, 107)); ctx.fillText('POWER', 1467, 107);
    const labelTexture = new THREE.CanvasTexture(label); labelTexture.colorSpace = THREE.SRGBColorSpace;
    return { display, texture, labelTexture, housing: housingGeometry(), bezel: bezelGeometry(), glass: screenGeometry(), ...surfaceTextures() };
  }, []);
  const shader = useMemo(() => ({
    uniforms: { map: { value: resources.texture }, time: { value: 0 }, power: { value: .35 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D map;uniform float time;uniform float power;varying vec2 vUv;
      void main(){vec2 q=vUv*2.-1.;float mask=1.-smoothstep(.96,1.,max(abs(q.x),abs(q.y)));
      vec3 c=texture2D(map,vUv).rgb;float scan=.975+.025*sin(vUv.y*2100.);
      float noise=fract(sin(dot(vUv+floor(time*12.),vec2(12.9898,78.233)))*43758.5453);
      c=c*scan*(.98-.14*dot(q,q))+(noise-.5)*.0006;
      gl_FragColor=vec4(max(c,vec3(0.))*power*mask,1.);
      #include <colorspace_fragment>
      }`,
  }), [resources]);
  useEffect(() => { drawTerminal(resources.display.getContext('2d')!, session); resources.texture.needsUpdate = true; gl.domElement.dataset.terminalView = session.view; gl.domElement.dataset.awake = String(session.awake); }, [session, resources, gl]);
  useEffect(() => () => { resources.texture.dispose(); resources.labelTexture.dispose(); resources.housing.dispose(); resources.bezel.dispose(); resources.glass.dispose(); resources.grain.dispose(); resources.rough.dispose(); }, [resources]);
  useLayoutEffect(() => { camera.zoom = cameraZoom(size.width, size.height, focused); camera.updateProjectionMatrix(); }, [camera, size.width, size.height, focused]);
  useFrame((state, delta) => {
    const dt = Math.min(delta, .05);
    shader.uniforms.time.value = still ? 0 : state.clock.elapsedTime;
    shader.uniforms.power.value = still ? (session.awake ? 1.1 : .40) : THREE.MathUtils.damp(shader.uniforms.power.value, session.awake ? 1.1 : .4, 5, dt);
    if (glow.current) glow.current.intensity = session.awake ? .18 : .015;
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, focused || still ? 0 : state.pointer.x * .017, 3, dt);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, focused || still ? 0 : -state.pointer.y * .009, 3, dt);
    }
    if (++frame.current === 3) onReady();
  });
  return <>
    <ambientLight intensity={.16} color="#78968c" />
    <rectAreaLight position={[2.8, .2, .64]} rotation={[0, 1.35, 0]} width={.8} height={3.8} intensity={24} color="#63dacc" />
    <rectAreaLight position={[3.1, 1, -.1]} rotation={[0, 1.63, 0]} width={.32} height={3.3} intensity={9} color="#bbdfd4" />
    <rectAreaLight position={[0, 4, 1.6]} rotation={[-1.1, 0, 0]} width={4.7} height={.7} intensity={1.2} color="#9fbfb3" />
    <spotLight position={[-3.5, 4, 5]} target-position={[0, 0, 0]} intensity={12} angle={.65} penumbra={.8} color="#74b5a9" castShadow shadow-mapSize={[1024,1024]} shadow-bias={-.0003} />
    <pointLight ref={glow} position={[0, .1, .7]} color="#5dc4b5" distance={2.5} intensity={.18} />
    <group ref={group}>
      <RoundedBox args={[4.74, 3.18, .74]} radius={.045} position={[0, 0, -.47]} castShadow receiveShadow><meshStandardMaterial color="#101b19" roughness={.78} /></RoundedBox>
      <mesh geometry={resources.housing} castShadow receiveShadow><meshPhysicalMaterial color="#1b2421" roughness={.72} roughnessMap={resources.rough} bumpMap={resources.grain} bumpScale={.007} metalness={.23} clearcoat={.08} clearcoatRoughness={.5} /></mesh>
      <mesh geometry={resources.bezel} receiveShadow><meshPhysicalMaterial color="#36574e" roughness={.46} metalness={.30} bumpMap={resources.grain} bumpScale={.004} side={THREE.DoubleSide} /></mesh>
      <RoundedBox args={[3.49, 2.43, .065]} radius={.13} smoothness={6} position={[0,.16,.128]}><meshStandardMaterial color="#010504" roughness={.27} /></RoundedBox>
      <mesh geometry={resources.glass} position={[0,.16,.171]} onClick={e => { e.stopPropagation(); if(e.uv){const action=displayAction(e.uv.x*1440,(1-e.uv.y)*1000,session);if(action)dispatch(action);} }}>
        <shaderMaterial {...shader} toneMapped={false} />
      </mesh>
      <mesh geometry={resources.glass} position={[0,.16,.176]} raycast={() => null}>
        <shaderMaterial transparent depthWrite={false} toneMapped={false}
          vertexShader={`varying vec3 vN;varying vec3 vP;varying vec2 vUv;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vP=p.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}`}
          fragmentShader={`varying vec3 vN;varying vec3 vP;varying vec2 vUv;void main(){vec3 n=normalize(vN);float f=pow(1.-max(dot(n,normalize(-vP)),0.),3.);
            float left=exp(-pow((vUv.x-.008)*90.,2.))*.035;float top=exp(-pow((vUv.y-.97)*58.,2.))*.016;
            float window=smoothstep(.79,.84,vUv.x)*(1.-smoothstep(.91,.96,vUv.x))*smoothstep(.84,.89,vUv.y)*(1.-smoothstep(.96,.99,vUv.y));
            gl_FragColor=vec4(vec3(.36,.69,.63),left+top+window*.008+f*.15);}`}/>
      </mesh>
      {session.view==='game' && session.awake && <group position={[0,.16,.27]} scale={[3.65,3.30,1]}><CRTScreen directGame /></group>}
      {[-1,1].map(side=><group key={side} position={[side*2.185,.1,.46]}>
        <mesh><boxGeometry args={[.24,2.64,.023]} /><meshStandardMaterial color="#010403" roughness={.9}/></mesh>
        {Array.from({length:37},(_,i)=><mesh key={i} position={[0,-1.25+i*.069,.012]} castShadow><boxGeometry args={[.232,.022,.035]}/><meshStandardMaterial color="#263c35" roughness={.69} metalness={.25}/></mesh>)}
      </group>)}
      <mesh position={[0,-1.37,.468]}><planeGeometry args={[4.54,.397]}/><meshBasicMaterial map={resources.labelTexture} transparent toneMapped={false} depthWrite={false}/></mesh>
      {(['mail','files','logs','system','game'] as const).map((view,i)=><RoundedBox key={view} args={[.18,.094,.06]} radius={.008} position={[.51+i*.285,-1.34,.482]} onClick={e=>{e.stopPropagation();dispatch({type:'wake'});dispatch({type:'navigate',view});}}>
        <meshPhysicalMaterial color="#24342e" metalness={.45} roughness={.38}/>
      </RoundedBox>)}
      <mesh position={[2.04,-1.33,.489]} onClick={e=>{e.stopPropagation();dispatch({type:session.awake?'sleep':'wake'});}}><circleGeometry args={[.032,24]}/><meshBasicMaterial color={session.awake?'#a7ead8':'#44776a'} toneMapped={false}/></mesh>
      {[-1.78,1.78].map(x=><RoundedBox key={x} args={[.4,.105,.49]} radius={.012} position={[x,-1.7,-.18]} castShadow><meshStandardMaterial color="#0e1915" roughness={.8}/></RoundedBox>)}
      {[[-2.32,1.53],[2.32,1.53],[-2.32,-1.53],[2.32,-1.53]].map(([x,y],i)=><mesh key={i} position={[x,y,.465]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.021,.021,.009,12]}/><meshStandardMaterial color="#38453b" metalness={.7} roughness={.45}/></mesh>)}
    </group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.763,0]} receiveShadow><planeGeometry args={[16,12]}/><meshStandardMaterial color="#030907" roughness={.48} metalness={.25}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.759,.5]}><planeGeometry args={[5.6,2.4]}/><shaderMaterial transparent depthWrite={false} vertexShader={'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'} fragmentShader={'varying vec2 v;void main(){float a=exp(-pow((v.x-.5)*3.9,2.))*exp(-pow((v.y-.72)*4.,2.));gl_FragColor=vec4(.035,.12,.09,a*.14);}'}/></mesh>
    <EffectComposer multisampling={0}><Bloom intensity={.18} luminanceThreshold={.62} luminanceSmoothing={.35} mipmapBlur /></EffectComposer>
  </>;
}
export default function CyanTerminalScene(props: Props) {
  return <Canvas orthographic camera={{position:[0,.12,8],zoom:150,near:.1,far:60}} dpr={[1,1.5]} shadows gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}
    onCreated={({gl})=>{ gl.setClearColor('#020505');gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05; }} fallback={<p>Terminal scene. Reading mode provides accessible content.</p>}>
    <Assembly {...props}/>
  </Canvas>;
}



