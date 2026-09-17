"use client";
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { createCrtGlass, crtFragment, crtVertex } from './monitor-crt-optics';
import { CRT_TEXTURE_WIDTH, CRT_TEXTURE_HEIGHT, initialCrtSignal, stepCrtSignal, drawCrtSignal } from './monitor-crt-signal';

type Props = { awake: boolean; still: boolean; active: boolean; pointer: RefObject<{x:number;y:number}> };
type Runtime = { update: (props:Props) => void; dispose: () => void };

function mountDisplay(host: HTMLDivElement): Runtime {
  let props: Props | undefined, disposed = false, raf = 0, last = 0, frame = 0;
  let state = initialCrtSignal();
  let renderer: THREE.WebGLRenderer | undefined;
  let fallback: HTMLCanvasElement | undefined;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = CRT_TEXTURE_WIDTH; textureCanvas.height = CRT_TEXTURE_HEIGHT;
  const ctx = textureCanvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const geometry = createCrtGlass();
  const uniforms = { uSignal: {value:texture}, uPower: {value:0}, uIgnition: {value:0}, uPointer: {value:new THREE.Vector2()}, uTextureSize: {value:new THREE.Vector2(CRT_TEXTURE_WIDTH,CRT_TEXTURE_HEIGHT)},uScanLines:{value:140} };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader:crtVertex, fragmentShader:crtFragment, transparent:true, depthWrite:false, toneMapped:false });
  const scene = new THREE.Scene(); scene.add(new THREE.Mesh(geometry,material));
  const camera = new THREE.PerspectiveCamera(27, 3.2/1.9, .1, 20);
  camera.position.z = 4.13;
  const cancel = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
  const request = () => { if (!disposed && !raf && props?.active && !document.hidden) raf = requestAnimationFrame(draw); };
  const fallbackMode = () => {
    renderer?.dispose(); renderer = undefined;
    fallback = document.createElement('canvas');
    fallback.width=CRT_TEXTURE_WIDTH; fallback.height=CRT_TEXTURE_HEIGHT;
    fallback.style.cssText='display:block;width:100%;height:100%';
    host.replaceChildren(fallback); host.dataset.crtRenderer='canvas2d'; request();
  };
  try {
    renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0,0); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.domElement.style.cssText='display:block;width:100%;height:100%';
    renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); if(!disposed)fallbackMode(); }, {once:true});
    host.replaceChildren(renderer.domElement); host.dataset.crtRenderer='three';
  } catch { fallbackMode(); }
  const resize = () => {
    const {width,height}=host.getBoundingClientRect();
    if(width>0&&height>0){ renderer?.setSize(width,height,false); uniforms.uScanLines.value=height*.66; camera.aspect=width/height; camera.updateProjectionMatrix(); request(); }
  };
  const observer=new ResizeObserver(resize); observer.observe(host); resize();
  function draw(now:number) {
    raf=0;
    if(disposed||!props?.active||document.hidden){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.05):0;
    if(last&&dt<1/32){request();return;}
    last=now;
    state=stepCrtSignal(state,props.awake,dt,props.still);
    drawCrtSignal(ctx,state,host.clientWidth<270);
    texture.needsUpdate=true;
    uniforms.uPower.value=state.power;
    uniforms.uIgnition.value=state.phase==='igniting'?Math.sin(Math.min(1,state.elapsed/.14)*Math.PI)*.45:0;
    const point=props.pointer.current;
    uniforms.uPointer.value.lerp(new THREE.Vector2(props.still?0:point.x,props.still?0:point.y),.14);
    if(renderer)renderer.render(scene,camera);
    if(fallback){const f=fallback.getContext('2d')!;f.clearRect(0,0,fallback.width,fallback.height);f.globalAlpha=state.power;f.drawImage(textureCanvas,0,0);}
    host.dataset.crtPhase=state.phase;host.dataset.crtPower=state.power.toFixed(3);host.dataset.crtElapsed=state.elapsed.toFixed(3);host.dataset.crtFrame=String(++frame);
    if(!props.still&&(props.awake||state.power>0))request();
  }
  const visibility=()=>{cancel();if(!document.hidden)request();};
  document.addEventListener('visibilitychange',visibility);
  return {
    update(next){const resume=!props?.active&&next.active;props=next;if(!next.active)cancel();else{if(resume)last=0;request();}},
    dispose(){disposed=true;cancel();observer.disconnect();document.removeEventListener('visibilitychange',visibility);renderer?.dispose();geometry.dispose();material.dispose();texture.dispose();host.replaceChildren();}
  };
}

export default function MonitorCrtDisplay(props:Props){
  const ref=useRef<HTMLDivElement>(null),runtime=useRef<Runtime|null>(null);
  useEffect(()=>{if(!ref.current)return;const current=mountDisplay(ref.current);runtime.current=current;return()=>{current.dispose();runtime.current=null;};},[]);
  useEffect(()=>runtime.current?.update(props),[props]);
  return <div ref={ref} style={{position:'absolute',inset:0}} aria-hidden="true" data-crt-renderer="pending"/>;
}
