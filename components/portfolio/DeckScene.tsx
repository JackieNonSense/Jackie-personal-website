"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import * as THREE from "three";
import type { MusicController } from "./music-controller";
import {rotaryGesture,transportPose,spectrumBands} from "./deck-interaction";
RectAreaLightUniformsLib.init();

export type DeckView = "closed" | "open" | "knob" | "glass";
export type DeckSceneProps = {
  view?: DeckView; title?: string; status?: string; time?: number; volume?: number; track?:number;
  active: boolean; review?: boolean; onReady: () => void; onFailure: () => void;
  player?:MusicController; still?:boolean; displayMode?:boolean; onDisplay?:()=>void;
};

function lightRig(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color("#24282c");
  const cards: [number, number, number, number, number, string, number][] = [
    [-8, 9, 10, 13, 8, "#f6f7ff", 4], [10, 2, 7, 3, 17, "#a5c2e1", 2.6],
    [-11, -3, 5, 2, 15, "#e6f1ff", 3], [1, -9, 8, 14, 2, "#d5dce3", 1.7],
    [0, 5, -8, 12, 4, "#ffffff", 2],
    [-2.5, 1, 14, 2, 15, "#f6f5f1", 1.8],
  ];
  for (const [x,y,z,w,h,color,intensity] of cards) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    mesh.position.set(x,y,z); mesh.lookAt(0,0,0); room.add(mesh);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, .04, .1, 100);
  pmrem.dispose();
  room.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); object.material.dispose(); } });
  return target;
}

function Model(props: DeckSceneProps) {
  const gltf = useLoader(GLTFLoader, "/portfolio/deck-a-v02.glb");
  const roughness = useLoader(THREE.TextureLoader, "/portfolio/deck-satin-roughness-v01.png");
  const { gl, scene, camera, size, invalidate } = useThree();
  const {onFailure}=props;
  const hovered=useRef('');
  const gesture=useRef<{id:number;x:number;y:number;volume:number;dragged:boolean;key:string;capture:{releasePointerCapture:(id:number)=>void}}|null>(null);
  const spectrum=useRef({at:0,levels:Array(32).fill(0) as number[]});
  useEffect(()=>{
    const canvas=gl.domElement;
    const lost=(event:Event)=>{event.preventDefault();onFailure();};
    canvas.addEventListener("webglcontextlost",lost);
    return ()=>canvas.removeEventListener("webglcontextlost",lost);
  },[gl,onFailure]);
  const assets = useMemo(() => {
    const object = gltf.scene.clone(true);
    const environment = lightRig(gl);
    const canvas = document.createElement("canvas"); canvas.width=1536; canvas.height=288;
    const display = new THREE.CanvasTexture(canvas); display.colorSpace=THREE.SRGBColorSpace; display.flipY=false;
    const radialCanvas=document.createElement("canvas");radialCanvas.width=512;radialCanvas.height=512;
    const radialContext=radialCanvas.getContext("2d")!;const pixels=radialContext.createImageData(512,512);
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){const angle=Math.atan2(y-255.5,x-255.5),i=(y*512+x)*4;pixels.data[i]=Math.round((Math.cos(angle)*.5+.5)*255);pixels.data[i+1]=Math.round((Math.sin(angle)*.5+.5)*255);pixels.data[i+2]=255;pixels.data[i+3]=255;}
    radialContext.putImageData(pixels,0,0);const radial=new THREE.CanvasTexture(radialCanvas);radial.flipY=false;
    const materials: THREE.Material[]=[];
    object.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow=true;node.receiveShadow=true;
      const source=node.material as THREE.MeshStandardMaterial;
      let material: THREE.Material;
      if(node.name==="Screen") material=new THREE.MeshBasicMaterial({map:display,toneMapped:false});
      else if(node.name==="Glass") {material=new THREE.MeshPhysicalMaterial({color:"#c9e1ef",metalness:0,roughness:.11,transparent:true,opacity:.09,clearcoat:1,clearcoatRoughness:.13,envMap:environment.texture,envMapIntensity:.6,depthWrite:false});node.castShadow=false;}
      else {
        const physical=new THREE.MeshPhysicalMaterial();
        physical.color.copy(source.color);physical.metalness=source.metalness;physical.roughness=source.roughness;
        physical.emissive.copy(source.emissive);physical.emissiveIntensity=source.emissiveIntensity;
        physical.envMap=environment.texture;physical.envMapIntensity=.9;
        if(source.name==="SatinSilver") { physical.roughness=.72;physical.roughnessMap=roughness;physical.anisotropy=.48;physical.bumpMap=roughness;physical.bumpScale=.006; }
        if(node.name==="KnobHub") {physical.anisotropy=.85;physical.anisotropyMap=radial;physical.roughness=.27;physical.roughnessMap=null;}
        if(source.name==="MachinedChrome") {physical.roughness=.28;physical.anisotropy=.25;}
        if(source.name==="OpticalSilver") {physical.iridescence=.18;physical.iridescenceIOR=1.3;physical.roughness=.22;}
        if(source.name==="IceBlueEdge") {physical.clearcoat=.8;physical.emissiveIntensity=.75;}
        material=physical;
      }
      materials.push(material);node.material=material;
    });
    const keys=['KeyPlay','KeyNext','KeyDisplay','KeyMute'].map(name=>{const node=object.getObjectByName(name)!;return {name,node,z:node.position.z,press:0,light:0};});
    return {object,environment,canvas,display,materials,radial,keys,users:0};
  },[gltf,gl,roughness]);
  useEffect(()=>{assets.users++;return ()=>{assets.users--;queueMicrotask(()=>{if(!assets.users){assets.materials.forEach(m=>m.dispose());assets.display.dispose();assets.radial.dispose();assets.environment.dispose();}});};},[assets]);
  useEffect(()=>{
    const view=props.view??"closed";
    const face=assets.object.getObjectByName("FacePivot")!;
    face.rotation.x=view==="open"?THREE.MathUtils.degToRad(28):0;
    const carrier=assets.object.getObjectByName("DiscCarrier")!;
    carrier.visible=view==="open";
    carrier.position.z=view==="open"?-3.2:-4.9;
    const cam=camera as THREE.OrthographicCamera;
    const width=view==="knob"?6.4:view==="glass"?18.2:19.6;
    const height=Math.max(width/(size.width/size.height),view==="closed"?10.15:view==="open"?11:0);
    cam.left=-height*size.width/size.height/2;cam.right=-cam.left;cam.top=height/2;cam.bottom=-height/2;
    cam.position.set(0,view==="knob"?-2.12:view==="glass"?2:0,32);
    cam.rotation.set(0,0,0);cam.updateProjectionMatrix();
    gl.shadowMap.needsUpdate=true;invalidate();
  },[assets,camera,size,props.view,invalidate,gl]);
  useEffect(()=>{if(props.active)invalidate();},[props.active,invalidate]);
  useEffect(()=>{
    const ctx=assets.canvas.getContext("2d")!;
    ctx.fillStyle="#03090b";ctx.fillRect(0,0,1536,288);
    const gloss=ctx.createLinearGradient(0,0,0,288);gloss.addColorStop(0,"#0c1418");gloss.addColorStop(.45,"#030707");gloss.addColorStop(1,"#010302");ctx.fillStyle=gloss;ctx.fillRect(0,0,1536,288);
    ctx.lineWidth=2;ctx.strokeStyle="#255868";
    for(let i=0;i<37;i++){const a=(i/36)*Math.PI*1.5+Math.PI*.75;ctx.beginPath();ctx.moveTo(165+79*Math.cos(a),137+79*Math.sin(a));ctx.lineTo(165+94*Math.cos(a),137+94*Math.sin(a));ctx.strokeStyle=i/36< (props.volume??.25)?"#68d7e5":"#17383c";ctx.stroke();}
    ctx.font="18px monospace";ctx.fillStyle="#70aab1";ctx.textAlign="center";ctx.fillText("VOLUME",165,123);ctx.font="38px monospace";ctx.fillStyle="#a8e8e6";ctx.fillText(String(Math.round((props.volume??.25)*100)).padStart(2,"0"),165,168);
    ctx.textAlign="left";ctx.font="17px monospace";ctx.fillStyle="#74994c";ctx.fillText("COMPACT DISC / DIGITAL SOUND",333,42);
    for(let col=0;col<32;col++)for(let row=0;row<9;row++){ctx.fillStyle=row===0?"#3e5730":"#18281c";ctx.fillRect(337+col*22,155-row*10,15,5);}
    ctx.fillStyle="#a6d975";ctx.font="24px monospace";ctx.fillText((props.title??"EDM DETECTION MODE").toUpperCase().slice(0,30),335,210);
    ctx.fillStyle="#75866d";ctx.font="14px monospace";ctx.fillText((props.status??"READY").toUpperCase()+"   /   STEREO",335,242);
    ctx.fillStyle="#d9ad59";ctx.font="18px monospace";ctx.fillText(`TRACK ${String(props.track??1).padStart(2,"0")}`,1180,60);
    const t=props.time??0;
    const digits=`${String(Math.floor(t/60)).padStart(2,"0")}:${String(Math.floor(t%60)).padStart(2,"0")}`;
    const patterns=["abcdef","bc","abged","abgcd","fgbc","afgcd","afgecd","abc","abcdefg","abfgcd"];
    const lines:{[key:string]:number[]}={a:[5,0,30,0],b:[34,4,34,26],c:[34,34,34,56],d:[5,60,30,60],e:[1,34,1,56],f:[1,4,1,26],g:[5,30,30,30]};
    [...digits].forEach((char,index)=>{const x=1160+index*46,y=93;ctx.lineWidth=3;ctx.strokeStyle="#cdddaf";if(char===":"){ctx.fillStyle="#cdddaf";ctx.fillRect(x+14,y+18,3,4);ctx.fillRect(x+14,y+40,3,4);}else for(const [key,[x1,y1,x2,y2]] of Object.entries(lines)){ctx.globalAlpha=patterns[Number(char)].includes(key)?1:.05;ctx.beginPath();ctx.moveTo(x+x1,y+y1);ctx.lineTo(x+x2,y+y2);ctx.stroke();}});ctx.globalAlpha=1;
    ctx.fillStyle="#4b7274";ctx.font="14px monospace";ctx.fillText("OPTICAL / 44.1 kHz",1158,207);
    if(props.displayMode){ctx.fillStyle='#050a0b';ctx.fillRect(330,56,740,110);ctx.fillStyle='#86bd76';ctx.font='25px monospace';ctx.fillText('OPTICAL DIGITAL AUDIO',337,98);ctx.fillStyle='#627e68';ctx.font='18px monospace';ctx.fillText('44.1 kHz  /  STEREO',337,140);}
    assets.display.needsUpdate=true;invalidate();
  },[assets,props.title,props.status,props.time,props.volume,props.track,props.displayMode,invalidate]);
  const semantic=(object:THREE.Object3D|null):string=>{while(object){if(['VolumePivot','KeyPlay','KeyNext','KeyDisplay','KeyMute'].includes(object.name))return object.name;object=object.parent;}return '';};
  const finishGesture=()=>{
    const current=gesture.current;gesture.current=null;
    if(current){try{current.capture.releasePointerCapture(current.id);}catch{/* Native cancellation may already release capture. */}}
    gl.domElement.style.cursor='auto';invalidate();
  };
  useEffect(()=>{
    // Native blur can happen without a final raycast event.
    const cancel=()=>{const current=gesture.current;gesture.current=null;hovered.current='';if(current){try{current.capture.releasePointerCapture(current.id);}catch{}}gl.domElement.style.cursor='auto';invalidate();};
    // A release outside the Canvas may have no R3F hit to dispatch to. Window
    // bubbling runs after the mesh handler; clear only an unfinished gesture.
    const release=(event:PointerEvent)=>{if(gesture.current?.id===event.pointerId)cancel();};
    window.addEventListener('blur',cancel);
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
    return ()=>{window.removeEventListener('blur',cancel);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);cancel();};
  },[gl,invalidate]);
  const down=(event:ThreeEvent<PointerEvent>)=>{
    if(!props.player||event.button!==0||gesture.current)return;
    const key=semantic(event.object);if(!key)return;
    if(key==='KeyNext'&&props.player.getSnapshot().status==='switching')return;
    const capture=event.target as HTMLElement|null;if(!capture?.setPointerCapture)return;
    event.stopPropagation();capture.setPointerCapture(event.pointerId);
    gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,volume:props.player.getSnapshot().volume,dragged:false,key,capture};
    hovered.current=key;gl.domElement.style.cursor=key==='VolumePivot'?'grabbing':'pointer';invalidate();
  };
  const move=(event:ThreeEvent<PointerEvent>)=>{
    if(!props.player)return;
    const current=gesture.current;
    if(current){event.stopPropagation();if(event.pointerId!==current.id)return;if(current.key==='VolumePivot'){
      const change=rotaryGesture(current.volume,event.clientX-current.x,event.clientY-current.y);
      current.dragged ||= change.dragged;if(current.dragged)props.player.setVolume(change.volume);
    }}else{hovered.current=semantic(event.object);gl.domElement.style.cursor=hovered.current==='VolumePivot'?'grab':hovered.current?'pointer':'auto';}
    invalidate();
  };
  const up=(event:ThreeEvent<PointerEvent>)=>{
    const current=gesture.current;if(!current||event.pointerId!==current.id)return;event.stopPropagation();
    const rect=gl.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const inside=semantic(ray.intersectObject(assets.object,true)[0]?.object??null)===current.key;
    if(current.key==='VolumePivot'){if(!current.dragged&&inside)props.player?.toggleMute();}
    else if(inside){if(current.key==='KeyPlay')props.player?.toggle();if(current.key==='KeyNext')void props.player?.next();if(current.key==='KeyMute')props.player?.toggleMute();if(current.key==='KeyDisplay')props.onDisplay?.();}
    finishGesture();
  };
  useFrame((_,delta)=>{
    if(!props.active||gl.getContext().isContextLost())return;
    const state=props.player?.getSnapshot(),dt=Math.min(delta,.05);
    const elapsed=state?.exchangeStartedAt==null?1050:performance.now()-state.exchangeStartedAt;
    let settling=false;
    if(!props.review){
      const pose=transportPose(elapsed,props.still);
      const face=assets.object.getObjectByName('FacePivot')!,carrier=assets.object.getObjectByName('DiscCarrier')!;
      const faceAngle=THREE.MathUtils.degToRad(pose.angle);
      settling ||= Math.abs(face.rotation.x-faceAngle)>.0001;
      face.rotation.x=faceAngle;carrier.visible=pose.discVisible;
      carrier.position.z=-3.2-6*pose.discTravel;carrier.position.y=2.8+.12*Math.sin(pose.discTravel*Math.PI);
      gl.domElement.dataset.faceAngle=pose.angle.toFixed(2);gl.domElement.dataset.discTravel=pose.discTravel.toFixed(3);
    }
    const knob=assets.object.getObjectByName('VolumePivot')!;
    const rotation=THREE.MathUtils.degToRad(60-(state?.volume??props.volume??.25)*240);
    knob.rotation.z=props.still?rotation:THREE.MathUtils.damp(knob.rotation.z,rotation,30,dt);
    settling ||= Math.abs(knob.rotation.z-rotation)>.001;
    for(const key of assets.keys){
      const pressed=gesture.current?.key===key.name?1:0,lit=hovered.current===key.name?1:0;
      key.press=props.still?pressed:THREE.MathUtils.damp(key.press,pressed,30,dt);
      key.light=props.still?lit:THREE.MathUtils.damp(key.light,lit,24,dt);
      key.node.position.z=key.z-.10*key.press;
      settling ||= Math.abs(key.press-pressed)>.001||Math.abs(key.light-lit)>.001;
      key.node.traverse(node=>{if(node instanceof THREE.Mesh&&node.name.endsWith('Blue'))(node.material as THREE.MeshPhysicalMaterial).emissiveIntensity=.75+.15*key.light;});
    }
    if(!props.displayMode&&performance.now()-spectrum.current.at>33){
      const bands=spectrumBands(state?.status==='playing'&&!props.still?props.player?.sample():undefined);
      const ctx=assets.canvas.getContext('2d')!;ctx.fillStyle='#050a0b';ctx.fillRect(330,56,740,110);
      let total=0;
      for(let col=0;col<32;col++){
        const old=spectrum.current.levels[col],next=bands[col];const level=props.still||state?.status!=='playing'?0:old+(next-old)*(next>old?.6:.22);spectrum.current.levels[col]=level;total+=level;
        for(let row=0;row<9;row++){ctx.fillStyle=row>=7?'#d0a94f':'#95c761';ctx.globalAlpha=row<level?.9:.07;ctx.fillRect(337+col*22,155-row*10,15,5);}
      }
      ctx.globalAlpha=1;assets.display.needsUpdate=true;spectrum.current.at=performance.now();gl.domElement.dataset.spectrumEnergy=total.toFixed(2);
    }
    if(settling||state?.status==='switching')gl.shadowMap.needsUpdate=true;
    gl.render(scene,camera);
    if(props.review) gl.domElement.dataset.reviewDiagnostics=JSON.stringify({triangles:gl.info.render.triangles,calls:gl.info.render.calls,bounds:new THREE.Box3().setFromObject(assets.object),camera:camera.position.toArray(),projection:camera.projectionMatrix.elements,children:scene.children.length});
    queueMicrotask(()=>{if(!gl.getContext().isContextLost())props.onReady();});
    if(!props.still&&(state?.status==='playing'||state?.status==='switching'||settling))invalidate();
  },1);
  return <primitive object={assets.object} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={finishGesture} onLostPointerCapture={finishGesture} onPointerLeave={()=>{if(!gesture.current){hovered.current='';gl.domElement.style.cursor='auto';invalidate();}}}/>;
}

export default function DeckScene(props: DeckSceneProps) {
  return <div data-device-scene="deck" style={{position:"absolute",inset:0}}>
    <Canvas style={{touchAction:props.player?'none':'auto'}} shadows orthographic camera={{position:[0,0,32],near:.1,far:100}} dpr={[1,2]}
      frameloop={props.active?"demand":"never"} gl={{alpha:true,antialias:true,preserveDrawingBuffer:!!props.review}}
      onCreated={({gl})=>{gl.setClearColor(0,0);gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;}}>
      <ambientLight intensity={.15}/><directionalLight position={[-5,9,12]} intensity={1.2} color="#f0f4ff" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-near={.1} shadow-camera-far={45} shadow-bias={-.0001} shadow-normalBias={.02}/>
      <directionalLight position={[8,-3,7]} intensity={.5} color="#99bde6" />
      <rectAreaLight position={[-4,4,8]} width={8} height={3} intensity={8} color="#f3eee4"/>
      <rectAreaLight position={[6,-1,6]} width={2} height={8} intensity={4} color="#b8c9dc"/>
      <rectAreaLight position={[-6,-1,6]} width={2} height={8} intensity={4} color="#dfdcd3"/>
      <Suspense fallback={null}><Model {...props}/></Suspense>
    </Canvas>
  </div>;
}
