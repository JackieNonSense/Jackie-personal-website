import {existsSync} from 'node:fs';
import {expect,it} from 'vitest';
import {displayMotion} from '../components/portfolio/deck-display-motion';
import {drawVfd} from '../components/portfolio/deck-vfd';

it('reveals the VFD once over 500 ms without a brightness flash',async()=>{
  expect(existsSync('components/portfolio/deck-display-motion.ts'),'the VFD motion controller exists').toBe(true);
  const modulePath='../components/portfolio/deck-display-motion';
  const {displayMotion}=await import(/* @vite-ignore */ modulePath);
  const start=displayMotion(0,null,false),middle=displayMotion(250,null,false),end=displayMotion(500,null,false);
  expect(start.reveal).toBe(0);
  expect(middle.reveal).toBeGreaterThan(0);
  expect(middle.reveal).toBeLessThan(1);
  expect(end.reveal).toBe(1);
  expect(start.needsFrame).toBe(true);
  expect(end.needsFrame).toBe(false);
  let previous=0;
  for(let elapsed=0;elapsed<=500;elapsed+=10){
    const frame=displayMotion(elapsed,null,false);
    expect(frame.reveal).toBeGreaterThanOrEqual(previous);
    expect(frame.levelGain).toBe(1);
    expect(frame.titleAlpha).toBe(1);
    expect(frame.titleOffset).toBe(0);
    previous=frame.reveal;
  }
});

it('contracts the current track over the first 180 ms of exchange',()=>{
  const start=displayMotion(500,0,false),middle=displayMotion(500,90,false),end=displayMotion(500,180,false);
  expect(start.levelGain).toBe(1);
  expect(start.titleAlpha).toBe(1);
  expect(middle.levelGain).toBeCloseTo(.5);
  expect(middle.titleAlpha).toBeCloseTo(.5);
  expect(middle.titleOffset).toBeCloseTo(-4);
  expect(end.levelGain).toBe(0);
  expect(end.titleAlpha).toBe(0);
});

it('keeps the title and sampled spectrum dark until the new disc settles',()=>{
  for(const elapsed of [180,250,500,649,650]){
    const frame=displayMotion(500,elapsed,false);
    expect(frame.levelGain).toBe(0);
    expect(frame.titleAlpha).toBe(0);
    expect(frame.reveal).toBe(1);
    expect(frame.needsFrame).toBe(true);
  }
});

it('restores the new track between 650 and 1050 ms then stops requesting frames',()=>{
  const start=displayMotion(500,650,false),middle=displayMotion(500,850,false),end=displayMotion(500,1050,false);
  expect(start.titleOffset).toBe(8);
  expect(middle.levelGain).toBeCloseTo(.5);
  expect(middle.titleAlpha).toBeCloseTo(.5);
  expect(middle.titleOffset).toBeCloseTo(4);
  expect(end).toEqual({reveal:1,levelGain:1,titleAlpha:1,titleOffset:0,needsFrame:false});
  expect(displayMotion(500,2000,false)).toEqual(end);
});

it('returns the static final state when page motion is paused or reduced',()=>{
  for(const boot of [0,100,500])for(const exchange of [null,0,90,500,850]){
    expect(displayMotion(boot,exchange,true)).toEqual({reveal:1,levelGain:1,titleAlpha:1,titleOffset:0,needsFrame:false});
  }
});

it('bounds every transition without overshoot or flicker',()=>{
  for(let elapsed=-100;elapsed<1300;elapsed+=5){
    const frame=displayMotion(elapsed,elapsed,false);
    for(const value of [frame.reveal,frame.levelGain,frame.titleAlpha]){expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);}
    expect(Math.abs(frame.titleOffset)).toBeLessThanOrEqual(8);
  }
});

// Canvas is the external rendering boundary; record its public drawing commands
// so these tests exercise drawVfd, not a mocked motion function or fake audio.
function drawing(){
  const fills:{x:number;y:number;color:unknown;alpha:number}[]=[],rects:number[][]=[];
  const arcs:{radius:number;color:unknown}[]=[],stack:{globalAlpha:number;fillStyle:unknown;strokeStyle:unknown}[]=[];
  const c={globalAlpha:1,fillStyle:'' as unknown,strokeStyle:'' as unknown,
    save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle});},
    restore(){Object.assign(this,stack.pop());},setTransform(){},translate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){},fillText(){},
    createLinearGradient(){return{addColorStop(){}};},
    fillRect(x:number,y:number){fills.push({x,y,color:this.fillStyle,alpha:this.globalAlpha});},
    rect(...bounds:number[]){rects.push(bounds);},clip(){},
    arc(x:number,y:number,radius:number){arcs.push({radius,color:this.strokeStyle});},
  };
  const canvas={getContext:()=>c} as unknown as HTMLCanvasElement;
  return{canvas,fills,rects,arcs};
}
const sample={title:'A',time:12,volume:.25,track:1,status:'playing',lit:.8,alternate:false,levels:Array(32).fill(8) as number[]};

it('adds falling peak caps and a restrained bass pulse without changing the VFD layout',()=>{
  const output=drawing();drawVfd(output.canvas,{...sample,levels:Array(32).fill(2),peaks:Array(32).fill(7),kick:1});
  expect(output.arcs.some(a=>a.color==='#c6f6ff')).toBe(true);
  expect(output.fills.some(f=>f.x>=775&&f.y<300&&f.color==='#e3b76b')).toBe(true);
  const still=drawing();drawVfd(still.canvas,{...sample,levels:Array(32).fill(0),peaks:Array(32).fill(0),kick:0});
  expect(still.arcs.some(a=>a.color==='#c6f6ff')).toBe(false);
});

it('clips the illuminated VFD to the warm-up reveal while keeping the glass intact',()=>{
  const output=drawing();drawVfd(output.canvas,{...sample,motion:{reveal:.25,levelGain:1,titleAlpha:1,titleOffset:0,needsFrame:true}});
  expect(output.rects).toContainEqual([0,0,1024,104]);
  expect(output.fills.some(f=>f.y===0&&f.alpha===1)).toBe(true);
});

it('fades and shifts only the dot-matrix title while attenuating real sampled levels',()=>{
  const output=drawing();drawVfd(output.canvas,{...sample,motion:{reveal:1,levelGain:0,titleAlpha:.5,titleOffset:6,needsFrame:true}});
  const title=output.fills.filter(f=>f.color==='#c9db6a');
  expect(title[0].x).toBe(199);
  expect(title.every(f=>f.alpha===.4)).toBe(true);
  expect(output.arcs.filter(a=>a.radius>=122&&a.radius<=206).every(a=>a.color==='#103447'||a.color==='#102636')).toBe(true);
  expect(output.fills.filter(f=>f.x>=775&&f.y<=316&&f.y>=260&&f.x<=940).some(f=>f.color==='#55d9f7')).toBe(false);
});
