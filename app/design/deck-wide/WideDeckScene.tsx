"use client";
import {Suspense,useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useLoader,useThree} from '@react-three/fiber';
import {Environment,Lightformer} from '@react-three/drei';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

function Model({target,instant}:{target:number;instant:boolean}){
 const gltf=useLoader(GLTFLoader,'/review/wide-deck-v01/wide-display-study.glb');
 const {camera,size,invalidate,gl}=useThree();const progress=useRef(0);
 const rig=useMemo(()=>{const scene=gltf.scene.clone(true),mixer=new THREE.AnimationMixer(scene);const clip=gltf.animations[0];mixer.clipAction(clip).play();return{scene,mixer,duration:clip.duration};},[gltf]);
 // R3F's camera is an imperative Three.js object, not immutable React state.
 // eslint-disable-next-line react-hooks/immutability
 useEffect(()=>{const cam=camera as THREE.OrthographicCamera;const height=21/(size.width/size.height);cam.left=-10.5;cam.right=10.5;cam.top=height/2;cam.bottom=-height/2;cam.position.set(0,-.2,40);cam.rotation.set(0,0,0);cam.updateProjectionMatrix();invalidate();},[camera,size,invalidate]);
 useEffect(()=>{invalidate();},[target,instant,invalidate]);
 useFrame((_,delta)=>{
  const d=target-progress.current;progress.current=instant?target:progress.current+Math.sign(d)*Math.min(Math.abs(d),Math.min(delta,.05)/rig.duration);
  // A tiny epsilon preserves the final pose rather than looping the clip to 0.
  rig.mixer.setTime(Math.min(progress.current*rig.duration,rig.duration-.00001));
  gl.domElement.setAttribute('data-study-progress',progress.current.toFixed(4));
  gl.domElement.setAttribute('data-hinge-angle',THREE.MathUtils.radToDeg(rig.scene.getObjectByName('PanelHinge')!.rotation.x).toFixed(2));
  if(Math.abs(target-progress.current)>.0001)invalidate();
 });
 return <primitive object={rig.scene}/>;
}
export default function WideDeckScene(props:{target:number;instant:boolean}){
 return <Canvas orthographic camera={{position:[0,0,40],near:.1,far:100}} dpr={2} frameloop="demand" gl={{antialias:true,alpha:true}}>
  <ambientLight intensity={.6}/><directionalLight position={[-9,10,15]} intensity={2.3} color="#fff0cf"/><directionalLight position={[12,1,10]} intensity={1.3} color="#b7d8ff"/>
  <Suspense fallback={null}><Environment resolution={256}><Lightformer position={[-5,8,12]} scale={[12,8,1]} intensity={2.5}/><Lightformer position={[9,0,8]} scale={[2,12,1]} intensity={2} color="#b7d8ff"/></Environment><Model {...props}/></Suspense>
 </Canvas>;
}
