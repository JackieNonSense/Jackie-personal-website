"use client";
/* Three.js owns these mutable GPU resources; they are not React state. */
import { Suspense,useEffect,useMemo,useRef } from 'react';
import { Canvas,useFrame,useLoader,useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { MusicController,MusicSnapshot } from './music-controller';
import { drawVfd } from './deck-vfd';
import { displayMotion } from './deck-display-motion';
import { createDeckPatina } from './deck-patina';
import { createDeckVisualClock,advanceDeckVisualClock } from './deck-visual-clock';
import { deckLevels } from './deck-spectrum';
import { spectrumBands } from './deck-interaction';
import panel from './deck-panel.json';

export type DeployProps={active:boolean;still:boolean;player:MusicController;state:MusicSnapshot;displayMode:boolean;attentionKey?:string;pressedKey?:string;onReady:()=>void;onFailure:()=>void};
function environment(gl:THREE.WebGLRenderer){
  const room=new THREE.Scene();room.background=new THREE.Color('#141b22');
  for(const [x,y,z,w,h,light] of [[-8,9,8,9,6,3],[8,1,9,2,12,2.2],[-9,-2,8,1,8,1.3],[0,7,-8,10,3,2]] as number[][]){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color('#dbe5ed').multiplyScalar(light),side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.lookAt(0,0,0);room.add(mesh);
  }
  const pmrem=new THREE.PMREMGenerator(gl),target=pmrem.fromScene(room,.035,.1,100);pmrem.dispose();room.traverse(n=>{if(n instanceof THREE.Mesh){n.geometry.dispose();n.material.dispose();}});return target;
}
function Model(props:DeployProps){
  const {onFailure}=props;
  const gltf=useLoader(GLTFLoader,'/portfolio/deploy-deck-v03.glb?r=2');
  const {gl,camera,size,invalidate,scene}=useThree();
  const progress=useRef(0),light=useRef(0),lastDraw=useRef(0),levels=useRef(Array(32).fill(0) as number[]);
  const shadowPose=useRef('');
  const clock=useRef(createDeckVisualClock(musicTitle(0)));
  const assets=useMemo(()=>{
    const object=gltf.scene.clone(true),env=environment(gl),canvas=document.createElement('canvas');canvas.width=2048;canvas.height=832;
    const patina=createDeckPatina();
    const map=(bytes:Uint8Array,colorSpace:THREE.ColorSpace)=>{const t=new THREE.DataTexture(bytes,patina.width,patina.height);t.colorSpace=colorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=gl.capabilities.getMaxAnisotropy();t.needsUpdate=true;return t;};
    const surfaceMap=map(patina.surface,THREE.LinearSRGBColorSpace),roughnessMap=map(patina.roughness,THREE.NoColorSpace);
    const display=new THREE.CanvasTexture(canvas);display.flipY=false;display.colorSpace=THREE.SRGBColorSpace;display.anisotropy=gl.capabilities.getMaxAnisotropy();
    const materials:THREE.Material[]=[];
    object.traverse(node=>{if(!(node instanceof THREE.Mesh))return;const source=node.material as THREE.MeshStandardMaterial;
      let material:THREE.Material;
      if(node.name==='DisplaySurface')material=new THREE.MeshBasicMaterial({map:display,toneMapped:false});
      else {const m=new THREE.MeshPhysicalMaterial({color:source.color,metalness:source.metalness,roughness:source.roughness,envMap:env.texture,envMapIntensity:.85,emissive:source.emissive,emissiveIntensity:source.emissiveIntensity});
        if(['DarkAnodized','TitaniumPaddle','CobaltEnamel'].includes(source.name)){m.roughness=source.name==='DarkAnodized'?.93:.8;m.map=surfaceMap;m.roughnessMap=roughnessMap;m.bumpMap=roughnessMap;m.bumpScale=.014;m.anisotropy=source.name==='CobaltEnamel'?.08:.3;}
        if(source.name==='NarrowChrome'){m.roughness=.65;m.roughnessMap=roughnessMap;m.anisotropy=.45;}material=m;}
      node.material=material;materials.push(material);node.castShadow=node.name!=='DisplaySurface';node.receiveShadow=true;
    });
    const mixer=new THREE.AnimationMixer(object);for(const clip of gltf.animations){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}
    const duration=Math.max(...gltf.animations.map(c=>c.duration));mixer.setTime(0);
    const keys=panel.keys.map(k=>({node:object.getObjectByName(k.node)!,light:object.getObjectByName(k.node+'Light') as THREE.Mesh,z:object.getObjectByName(k.node)!.position.z}));
    return{object,env,canvas,display,materials,mixer,duration,keys,surfaceMap,roughnessMap,users:0};
  },[gltf,gl]);
  useEffect(()=>{assets.users++;return()=>{assets.users--;queueMicrotask(()=>{if(!assets.users){assets.mixer.stopAllAction();assets.mixer.uncacheRoot(assets.object);assets.materials.forEach(m=>m.dispose());assets.display.dispose();assets.surfaceMap.dispose();assets.roughnessMap.dispose();assets.env.dispose();}});};},[assets]);
  useEffect(()=>{
    const cam=camera as THREE.OrthographicCamera;const width=panel.stage.width,height=width*size.height/size.width;cam.left=-width/2;cam.right=width/2;cam.top=height/2;cam.bottom=-height/2;cam.position.set(0,panel.stage.cameraY,32);cam.rotation.set(0,0,0);cam.updateProjectionMatrix();invalidate();
  },[camera,size,invalidate]);
  // A paused demand loop may have only one frame: never throttle away a new
  // title, volume, pause or DISP state just because the last draw was recent.
  useEffect(()=>{lastDraw.current=-Infinity;if(props.active)invalidate();},[props.active,props.state,props.still,props.displayMode,props.attentionKey,props.pressedKey,invalidate]);
  useEffect(()=>{const canvas=gl.domElement;const lost=(e:Event)=>{e.preventDefault();onFailure();};canvas.addEventListener('webglcontextlost',lost);return()=>canvas.removeEventListener('webglcontextlost',lost);},[gl,onFailure]);
  useFrame((_,delta)=>{
    if(!props.active||gl.getContext().isContextLost())return;
    const state=props.player.getSnapshot(),target=state.powered?1:0,dt=Math.min(delta,.05);
    progress.current=props.still?target:THREE.MathUtils.clamp(progress.current+Math.sign(target-progress.current)*Math.min(Math.abs(target-progress.current),dt/1.6),0,1);
    // The animation is scrubbed by power only. Pause and next never retract it.
    assets.mixer.setTime(Math.min(progress.current*assets.duration,assets.duration-.00001));
    const lit=state.powered&&progress.current>.91?1:0;light.current=props.still?lit:THREE.MathUtils.damp(light.current,lit,12,dt);
    const visual=clock.current=advanceDeckVisualClock(clock.current,{deltaMs:dt*1000,lit:Boolean(lit),powered:state.powered,exchangeStartedAt:state.exchangeStartedAt,title:musicTitle(state.track),still:props.still,status:state.status});
    const motion=displayMotion(visual.boot,visual.exchange,props.still);
    const fader=assets.object.getObjectByName('VolumeFader')!;fader.position.x=panel.volume.x-panel.volume.travel/2+state.volume*panel.volume.travel;
    let settling=false;
    for(const [index,key] of assets.keys.entries()){
      const z=key.z-(props.pressedKey===key.node.name?.14:0);key.node.position.z=props.still?z:THREE.MathUtils.damp(key.node.position.z,z,35,dt);settling ||= Math.abs(key.node.position.z-z)>.0001;
      const enabled=key.node.name==='PowerKey'?state.powered:key.node.name==='MuteKey'?state.muted:key.node.name==='DisplayKey'?props.displayMode:false;
      const backlight=state.powered?THREE.MathUtils.smoothstep(progress.current,index*.09,index*.09+.14):0;
      const material=key.light.material as THREE.MeshPhysicalMaterial;material.emissiveIntensity=props.attentionKey===key.node.name?.8:enabled?.65:key.node.name==='PowerKey'?.2:.02+backlight*.18;
    }
    const seam=assets.object.getObjectByName('PlaybackSeam') as THREE.Mesh;
    (seam.material as THREE.MeshPhysicalMaterial).emissiveIntensity=state.status==='playing'?.15+light.current*.7:.04;
    const now=performance.now();if(now-lastDraw.current>33||props.still){
      const raw=spectrumBands(state.status==='playing'&&!props.still?props.player.sample():undefined);
      levels.current=deckLevels(levels.current,raw,state.status,visual.exchange,props.still);
      const total=levels.current.reduce((a,b)=>a+b,0)*motion.levelGain;
      drawVfd(assets.canvas,{title:visual.visibleTitle,time:state.time,track:state.track+1,volume:state.volume,status:state.status,lit:light.current,alternate:props.displayMode,levels:levels.current,motion});assets.display.needsUpdate=true;lastDraw.current=now;gl.domElement.dataset.spectrumEnergy=total.toFixed(2);
    }
    gl.domElement.dataset.deployment=progress.current.toFixed(3);gl.domElement.dataset.screenLit=light.current.toFixed(3);gl.domElement.dataset.power=state.powered?'on':'off';
    // Include instant reduced-motion poses, native fader travel and key presses.
    // Never clear the renderer's pending initial shadow pass.
    const pose=[progress.current,fader.position.x,...assets.keys.map(k=>k.node.position.z)].join('/');
    if(pose!==shadowPose.current){gl.shadowMap.needsUpdate=true;shadowPose.current=pose;}
    gl.render(scene,camera);queueMicrotask(()=>{if(!gl.getContext().isContextLost())props.onReady();});
    if(settling||progress.current!==target||Math.abs(light.current-lit)>.001||(!props.still&&(state.status==='playing'||lit&&motion.needsFrame)))invalidate();
  },1);
  return <primitive object={assets.object}/>;
}
import {musicTracks} from './music-tracks';
const musicTitle=(track:number)=>musicTracks[track].title;
export default function DeployDeckScene(props:DeployProps){
  return <div data-device-scene="deck" data-mechanism="deploy" style={{position:'absolute',inset:0}}>
    <Canvas orthographic camera={{position:[0,panel.stage.cameraY,32],near:.1,far:100}} dpr={2} shadows frameloop={props.active?'demand':'never'} gl={{alpha:true,antialias:true}} style={{touchAction:'pan-y',pointerEvents:'none'}} onCreated={({gl})=>{gl.setClearColor(0,0);gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;}}>
      <ambientLight intensity={.25}/><directionalLight position={[-7,9,12]} intensity={2.2} color="#e6edf5" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-far={60} shadow-normalBias={.015}/><directionalLight position={[8,-2,8]} intensity={.6} color="#aac5e5"/>
      <Suspense fallback={null}><Model {...props}/></Suspense>
    </Canvas>
  </div>;
}
