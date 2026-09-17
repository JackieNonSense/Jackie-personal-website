'use client';

import {useEffect,useRef,type ReactNode} from 'react';
import {stagger,useAnimate,usePresence,type AnimationPlaybackControlsWithThen} from 'framer-motion';

/** Short, cancellable entrances. The archive illustration itself never moves. */
export default function ArchiveReveal({children,className,label,inline=false,kind='ink',quiet,active}: {
 children:ReactNode;className?:string;label?:string;inline?:boolean;kind?:'ink'|'scene'|'paper';quiet:boolean;active:boolean;
}) {
 const [scope,animate]=useAnimate<HTMLDivElement>();
 const [present,safeToRemove]=usePresence();
 const controls=useRef<AnimationPlaybackControlsWithThen[]>([]);
 const settled=useRef(false);
 useEffect(()=>{
  const element=scope.current;
  if(quiet){
   for(const node of [element,...Array.from(element.children)]){
    if(node instanceof HTMLElement||node instanceof SVGElement){node.style.opacity='1';node.style.transform='none';}
   }
   settled.current=true;
   if(!present)safeToRemove?.();
   return;
  }
  if(!present){
   const exit=animate(element,{opacity:0,x:12},{duration:.16,ease:'easeIn'});
   controls.current=[exit];void exit.then(()=>safeToRemove?.());
   return()=>exit.stop();
  }
  if(settled.current)return;
  const entrance=animate(element,{opacity:[0,1],x:kind==='paper'?[16,0]:[0,0],y:kind==='scene'?[6,0]:[0,0]},
   {duration:kind==='paper'?.32:.26,ease:[.22,.72,.2,1]});
  controls.current=[entrance];
  if(kind==='ink'){
   const lines=Array.from(element.children);
   if(lines.length)controls.current.push(animate(lines,{opacity:[0,1],y:[4,0]},
    {duration:.24,delay:stagger(.035,{startDelay:.09}),ease:[.22,.72,.2,1]}));
  }
  let mounted=true;
  void Promise.all(controls.current).then(()=>{if(mounted)settled.current=true;});
  return()=>{mounted=false;controls.current.forEach(control=>control.stop());controls.current=[];};
 },[animate,scope,kind,quiet,present,safeToRemove]);
 useEffect(()=>{
  controls.current.forEach(control=>{
   if(active&&control.state==='paused')control.play();
   else if(!active&&control.state==='running')control.pause();
  });
 },[active,quiet,kind,present]);
 if(inline)return <span ref={scope} className={className}>{children}</span>;
 return <div ref={scope} className={className} role={label?'region':undefined} aria-label={label} inert={!present}
  data-reading-body={kind==='ink'||undefined}
  data-archive-scene={kind==='scene'||undefined}>{children}</div>;
}
