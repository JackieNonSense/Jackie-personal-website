"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import {motion} from 'framer-motion';
import {openingPath} from './vertical-signal';
import {riftOffset,riftSymbols,seamY,stepRift} from './rift-undercurrent';
import styles from './Portfolio.module.css';

export default function SignalRift({paused,reducedMotion}:{paused:boolean;reducedMotion:boolean}){
  const [pinned,setPinned]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const canvasRef=useRef<HTMLCanvasElement>(null),wake=useRef(()=>{});
  const input=useRef({x:.5,pinned:false,hover:false,focus:false,suppressed:false,still:paused||reducedMotion});
  useEffect(()=>{input.current.still=paused||reducedMotion;wake.current();},[paused,reducedMotion]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){input.current.pinned=false;input.current.suppressed=true;setPinned(false);wake.current();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas||typeof ResizeObserver==='undefined')return;
    let ctx:CanvasRenderingContext2D|null;try{ctx=canvas.getContext('2d');}catch{return;}if(!ctx)return;
    const context=ctx,plate=new Image(),base=document.createElement('canvas');
    let disposed=false,loaded=false,painted=false,visible=true,frame=0,last=0,time=0,width=1,height=1,dpr=1,amount=0,center=.5,glow=0;
    let glyphs=riftSymbols(1),paperPath=new Path2D();
    const precompose=()=>{
      base.width=canvas.width;base.height=canvas.height;const c=base.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);
      c.drawImage(plate,0,0,width,height);
      c.save();c.clip(paperPath);const wash=c.createLinearGradient(0,height*.44,0,height*.65);
      wash.addColorStop(0,'#d8d7cd00');wash.addColorStop(.38,'#d8d7cda0');wash.addColorStop(.65,'#d8d7cdb0');wash.addColorStop(1,'#d8d7cd00');c.fillStyle=wash;c.fillRect(0,0,width,height);
      let seed=79;for(let n=0;n<width*height*.013;n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%Math.ceil(width);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=height*(.45+(seed%1000)/1000*.2);c.fillStyle=n%3?'#1922170b':'#ffffff20';c.fillRect(x,y,.65,.65);}c.restore();
      c.globalCompositeOperation='destination-in';const fade=c.createLinearGradient(0,0,0,height);for(const [p,a] of [[0,0],[.35,0],[.45,1],[.66,1],[.73,0],[1,0]])fade.addColorStop(p,`rgba(0,0,0,${a})`);c.fillStyle=fade;c.fillRect(0,0,width,height);
    };
    const draw=(now:number)=>{
      frame=0;if(disposed||!loaded||!visible||document.hidden)return;
      const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
      const s=input.current,target=!s.suppressed&&(s.pinned||s.hover||s.focus)?1:0;
      amount=stepRift(amount,target,dt,s.still);glow=stepRift(glow,target,dt*(target?1:2),s.still);
      center=s.still?s.x:center+(s.x-center)*(1-Math.exp(-dt*16));if(!s.still)time+=dt;
      const spread=width<760?180:320,cx=center*width;
      context.clearRect(0,0,width,height);context.drawImage(base,0,0,base.width,base.height,0,0,width,height);
      const opening=new Path2D(),start=Math.max(0,Math.floor(cx-spread/2)),end=Math.min(width,Math.ceil(cx+spread/2));
      if(amount>0){
        for(let x=start;x<=end;x++){const y=seamY(x,width,height),o=riftOffset(x,cx,spread,amount);if(x===start)opening.moveTo(x,y+o.upper);else opening.lineTo(x,y+o.upper);}
        for(let x=end;x>=start;x--){const o=riftOffset(x,cx,spread,amount);opening.lineTo(x,seamY(x,width,height)+o.lower);}opening.closePath();
        // Two photographic halves share the exact same local deformation as the mask.
        for(let x=start;x<end;x++){
          const o=riftOffset(x+.5,cx,spread,amount),sy=seamY(x+.5,width,height),top=height*.35,bottom=height*.73;
          context.clearRect(x,top-17,1,bottom-top+29);
          context.fillStyle='#080f13';context.fillRect(x,sy+o.upper-1,1,o.lower-o.upper+2);
          context.drawImage(base,x*dpr,top*dpr,dpr,(sy-top)*dpr,x,top+o.upper,1,sy-top);
          context.drawImage(base,x*dpr,sy*dpr,dpr,(bottom-sy)*dpr,x,sy+o.lower,1,bottom-sy);
        }
        context.save();context.clip(opening);
        const light=context.createRadialGradient(cx,seamY(cx,width,height),0,cx,seamY(cx,width,height),spread*.55);light.addColorStop(0,`rgba(17,63,75,${glow*.55})`);light.addColorStop(1,'#07101700');context.fillStyle=light;context.fillRect(start,height*.4,end-start,height*.3);
        context.font='12px "Courier New",monospace';
        for(let i=0;i<28;i++){const x=start+i*19+Math.sin(i*5.7)*4,y=seamY(x,width,height)-1+Math.sin(time*.5+i)*5;context.fillStyle=i%5?'#657f9188':`rgba(106,206,159,${glow*.9})`;context.fillText(i%3?'· / 01':'ナ :',x,y);}
        context.restore();
        context.save();context.clip(opening);context.lineWidth=3;context.strokeStyle='#00000080';context.stroke(opening);context.restore();
      }
      context.save();context.clip(paperPath);context.font='11px "Courier New",monospace';
      for(const g of glyphs){const x=g.x*width,y=seamY(x,width,height)+(g.layer-1)*27+Math.sin(time*g.speed*.1+g.phase)*3;
        const o=riftOffset(x,cx,spread,amount),seam=seamY(x,width,height);if(y>seam+o.upper-7&&y<seam+o.lower+9)continue;
        context.fillStyle=g.layer===1?'#234d9255':'#28477740';context.fillText(g.text,x,y);
      }context.restore();
      canvas.dataset.opening=amount.toFixed(3);canvas.dataset.center=center.toFixed(3);canvas.dataset.drawing=s.still?'static':'running';
      if(!painted){painted=true;setReady(true);}
      if(!s.still)frame=requestAnimationFrame(draw);
    };
    const resume=()=>{
      if(!visible||document.hidden){cancelAnimationFrame(frame);frame=0;last=0;return;}
      if(loaded&&!frame){last=0;frame=requestAnimationFrame(draw);}
    };wake.current=resume;
    const resize=()=>{const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);glyphs=riftSymbols(width);paperPath=new Path2D();paperPath.addPath(new Path2D(openingPath(0)),new DOMMatrix().scale(width/1586,height/992));if(loaded)precompose();resume();};
    const ro=new ResizeObserver(resize);ro.observe(canvas);
    const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(!visible)canvas.dataset.drawing='suspended';resume();});io.observe(canvas);
    const visibility=()=>{if(document.hidden)canvas.dataset.drawing='suspended';resume();};document.addEventListener('visibilitychange',visibility);
    plate.onload=()=>{if(disposed)return;loaded=true;resize();};plate.onerror=()=>{if(!disposed){setReady(false);setFailed(true);}};plate.src='/portfolio/material-plate-v02.png';
    return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);plate.onload=null;plate.onerror=null;wake.current=()=>{};};
  },[]);
  return <>
    <div className={styles.riftBacking} data-rift-backing aria-hidden="true"/>
    <div className={styles.riftBed} data-rift-bed aria-hidden="true" style={{visibility:ready?'hidden':'visible'}}><img className={styles.material} src="/portfolio/material-plate-v02.png" alt="" draggable={false} onError={()=>setFailed(true)}/></div>
    {failed&&<div className={styles.paperFallback} data-testid="rift-paper-fallback" aria-hidden="true"/>}
    <canvas ref={canvasRef} className={styles.characters} data-testid="rift-canvas" data-paper-layers="upper lower" aria-hidden="true"/>
    <motion.button className={styles.riftHit} type="button" aria-label="探索裂隙" aria-pressed={pinned}
      onPointerEnter={e=>{if(e.pointerType!=='touch'){input.current.hover=true;input.current.suppressed=false;wake.current();}}}
      onPointerMove={e=>{if(input.current.pinned)return;const r=e.currentTarget.getBoundingClientRect();input.current.x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));wake.current();}}
      onPointerLeave={()=>{input.current.hover=false;wake.current();}}
      onFocus={e=>{if(e.currentTarget.matches(':focus-visible')){input.current.focus=true;if(!input.current.pinned)input.current.x=.5;input.current.suppressed=false;wake.current();}}}
      onBlur={()=>{input.current.focus=false;wake.current();}}
      onClick={e=>{const s=input.current;if(!s.pinned&&e.detail){const r=e.currentTarget.getBoundingClientRect();s.x=(e.clientX-r.left)/r.width;}s.pinned=!s.pinned;s.suppressed=!s.pinned;setPinned(s.pinned);wake.current();}}
      whileTap={paused||reducedMotion?undefined:{opacity:.96}}>
      <span className={styles.srOnly}>EXPLORE THE RIFT</span>
    </motion.button>
    <div className={styles.signalCaption}><span className={styles.signalLabel}>EXPLORE THE RIFT</span></div>
  </>;
}
