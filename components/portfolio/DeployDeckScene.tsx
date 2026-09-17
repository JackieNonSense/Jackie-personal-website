"use client";
/* Three.js owns these mutable GPU resources; they are not React state. */
import { Suspense,useEffect,useMemo,useRef } from 'react';
import { Canvas,useFrame,useLoader,useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { MusicController,MusicSnapshot } from './music-controller';
import { drawVfd } from './deck-vfd';
import { displayMotion } from './deck-display-motion';
import { createDeckPatina, deckFinish } from './deck-patina';
import { createDeckVisualClock,advanceDeckVisualClock } from './deck-visual-clock';
import { createDeckMeter,advanceDeckMeter } from './deck-beat-meter';
import { keyResponse } from './deck-interaction';
import panel from './deck-panel.json';

export type DeployProps={active:boolean;still:boolean;player:MusicController;state:MusicSnapshot;displayMode:boolean;attentionKey?:string;pressedKey?:string;onReady:()=>void;onFailure:()=>void};
function environment(gl:THREE.WebGLRenderer){
  const room=new THREE.Scene();room.background=new THREE.Color('#141b22');
  for(const [x,y,z,w,h,light] of [[-8,9,8,7,4,3.2],[8,1,9,1.2,10,1.7],[-9,-2,8,.6,6,.6],[0,7,-8,8,2,1.5]] as number[][]){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color('#dbe5ed').multiplyScalar(light),side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.lookAt(0,0,0);room.add(mesh);
  }
  const pmrem=new THREE.PMREMGenerator(gl),target=pmrem.fromScene(room,.035,.1,100);pmrem.dispose();room.traverse(n=>{if(n instanceof THREE.Mesh){n.geometry.dispose();n.material.dispose();}});return target;
}
function Model(props:DeployProps){
  const {onFailure}=props;
  const gltf=useLoader(GLTFLoader,'/portfolio/deploy-deck-v03.glb?r=2');
  const {gl,camera,size,invalidate,scene}=useThree();
  const progress=useRef(0),light=useRef(0),lastDraw=useRef(0),meter=useRef(createDeckMeter());
  const shadowPose=useRef('');
  const clock=useRef(createDeckVisualClock(musicTitle(0)));
  const assets=useMemo(()=>{
    const object=gltf.scene.clone(true),env=environment(gl),canvas=document.createElement('canvas');canvas.width=2048;canvas.height=832;
    const patina=createDeckPatina();
    const map=(bytes:Uint8Array,colorSpace:THREE.ColorSpace)=>{const t=new THREE.DataTexture(bytes,patina.width,patina.height);t.colorSpace=colorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=gl.capabilities.getMaxAnisotropy();t.needsUpdate=true;return t;};
    const surfaceMap=map(patina.surface,THREE.LinearSRGBColorSpace);
    const finishMaps=Object.fromEntries(Object.entries(deckFinish).map(([name,finish])=>{
      const bytes=patina.roughness.slice();
      for(let i=0;i<bytes.length;i+=4){
        const x=(i/4)%patina.width,y=Math.floor(i/4/patina.width);
        const edge=Math.max(Math.abs(x/patina.width-.5),Math.abs(y/patina.height-.5));
        const wear=Math.max(0,(edge-.44)/.06);
        const brushed=finish.anisotropy>.4?Math.sin(y*71.7)*.012:0;
        const value=Math.round(255*Math.max(.08,finish.roughness+(bytes[i]/255-.625)*finish.variation*8-wear*.035+brushed));
        bytes[i]=bytes[i+1]=bytes[i+2]=value;
      }
      return[name,map(bytes,THREE.NoColorSpace)];
    }));
    const display=new THREE.CanvasTexture(canvas);display.flipY=false;display.colorSpace=THREE.SRGBColorSpace;display.anisotropy=gl.capabilities.getMaxAnisotropy();
    const materials:THREE.Material[]=[];
    object.traverse(node=>{if(!(node instanceof THREE.Mesh))return;const source=node.material as THREE.MeshStandardMaterial;
      let material:THREE.Material;
      if(node.name==='DisplaySurface')material=new THREE.MeshBasicMaterial({map:display,toneMapped:false});
      else {const m=new THREE.MeshPhysicalMaterial({color:source.color,metalness:source.metalness,roughness:source.roughness,envMap:env.texture,envMapIntensity:.85,emissive:source.emissive,emissiveIntensity:source.emissiveIntensity});
        const finish=deckFinish[source.name];
        if(finish){m.roughness=1;m.roughnessMap=finishMaps[source.name];m.bumpMap=finishMaps[source.name];m.bumpScale=finish.bump;m.anisotropy=finish.anisotropy;m.clearcoat=finish.clearcoat;m.clearcoatRoughness=.19;if(source.name==='DarkAnodized')m.map=surfaceMap;}
        material=m;}
      node.material=material;materials.push(material);node.castShadow=node.name!=='DisplaySurface';node.receiveShadow=true;
    });
    // A separate thin reflective cover keeps phosphor behind, not on the glass.
    const screen=object.getObjectByName('DisplaySurface') as THREE.Mesh;
    const coverMaterial=new THREE.MeshPhysicalMaterial({color:'#263c41',metalness:.18,roughness:.17,envMap:env.texture,envMapIntensity:.65,transparent:true,opacity:.09,depthWrite:false,clearcoat:1,clearcoatRoughness:.12});
    const cover=new THREE.Mesh(screen.geometry,coverMaterial);cover.name='DisplayGlassCover';cover.position.copy(screen.position);cover.position.z+=.022;screen.parent!.add(cover);materials.push(coverMaterial);
    const mixer=new THREE.AnimationMixer(object);for(const clip of gltf.animations){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}
    const duration=Math.max(...gltf.animations.map(c=>c.duration));mixer.setTime(0);
    const keys=panel.keys.map(k=>{const node=object.getObjectByName(k.node)!;
      return{node,light:object.getObjectByName(k.node+'Light') as THREE.Mesh,z:node.position.z,y:node.position.y,press:0,glow:0};});
    return{object,env,canvas,display,materials,mixer,duration,keys,surfaceMap,finishMaps,users:0};
  },[gltf,gl]);
  useEffect(()=>{assets.users++;return()=>{assets.users--;queueMicrotask(()=>{if(!assets.users){assets.mixer.stopAllAction();assets.mixer.uncacheRoot(assets.object);assets.materials.forEach(m=>m.dispose());assets.display.dispose();assets.surfaceMap.dispose();Object.values(assets.finishMaps).forEach(m=>m.dispose());assets.env.dispose();}});};},[assets]);
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
      const next=keyResponse(key,props.pressedKey===key.node.name,props.attentionKey===key.node.name,dt,props.still);
      settling ||= Math.abs(next.press-key.press)>.001||Math.abs(next.glow-key.glow)>.001;
      key.press=next.press;key.glow=next.glow;
      // An orthographic camera cannot show travel along its own axis, so the cap
      // also settles into its seat and takes less of the room as it sinks.
      key.node.position.z=key.z-.14*key.press;key.node.position.y=key.y-.075*key.press;
      if(key.node instanceof THREE.Mesh)(key.node.material as THREE.MeshPhysicalMaterial).envMapIntensity=.85*(1-key.press*.45);
      const enabled=key.node.name==='PowerKey'?state.powered:key.node.name==='MuteKey'?state.muted:key.node.name==='DisplayKey'?props.displayMode:false;
      const backlight=state.powered?THREE.MathUtils.smoothstep(progress.current,index*.09,index*.09+.14):0;
      const rest=enabled?.65:key.node.name==='PowerKey'?.2:.02+backlight*.18;
      (key.light.material as THREE.MeshPhysicalMaterial).emissiveIntensity=THREE.MathUtils.lerp(rest,.85,key.glow)*(1-key.press*.35);
    }
    const seam=assets.object.getObjectByName('PlaybackSeam') as THREE.Mesh;
    (seam.material as THREE.MeshPhysicalMaterial).emissiveIntensity=state.status==='playing'?.15+light.current*.7:.04;
    // The meter advances on the draw hop, so its delta is the interval the
    // attack/release constants were tuned against, not the render frame rate.
    const now=performance.now();if(now-lastDraw.current>33||props.still){
      meter.current=advanceDeckMeter(meter.current,state.status==='playing'&&!props.still?props.player.sample():undefined,(now-lastDraw.current)/1000,state.status,visual.exchange,props.still);
      const {levels,peaks,kick}=meter.current,total=levels.reduce((a,b)=>a+b,0)*motion.levelGain;
      drawVfd(assets.canvas,{title:visual.visibleTitle,time:state.time,track:state.track+1,volume:state.volume,status:state.status,lit:light.current,alternate:props.displayMode,levels,peaks,kick,motion});assets.display.needsUpdate=true;lastDraw.current=now;gl.domElement.dataset.spectrumEnergy=total.toFixed(2);gl.domElement.dataset.spectrumKick=kick.toFixed(2);
    }
    gl.domElement.dataset.keyPress=Math.max(...assets.keys.map(k=>k.press)).toFixed(3);gl.domElement.dataset.keyGlow=Math.max(...assets.keys.map(k=>k.glow)).toFixed(3);
    gl.domElement.dataset.deployment=progress.current.toFixed(3);gl.domElement.dataset.screenLit=light.current.toFixed(3);gl.domElement.dataset.power=state.powered?'on':'off';
    // Include instant reduced-motion poses, native fader travel and key presses.
    // Never clear the renderer's pending initial shadow pass.
    const pose=[progress.current,fader.position.x,...assets.keys.map(k=>k.press.toFixed(3))].join('/');
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
      <ambientLight intensity={.16}/><directionalLight position={[-7,9,12]} intensity={2.4} color="#e6edf5" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-far={60} shadow-normalBias={.015}/><directionalLight position={[8,-2,8]} intensity={.32} color="#aac5e5"/>
      <pointLight position={[-5,1,6]} intensity={55} distance={30} decay={2} color="#eee6d7"/>
      <Suspense fallback={null}><Model {...props}/></Suspense>
    </Canvas>
  </div>;
}
