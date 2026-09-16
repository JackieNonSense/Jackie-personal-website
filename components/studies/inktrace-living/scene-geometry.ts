import type {ArchiveState,SceneId} from './archive-runtime';
export const ease=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export type ScenePose={row:number;x:number;y:number;frame:number;facing:number;carrying:boolean};
export function actorPoses(scene:SceneId,time:number,ambient:number,w:number,h:number,state:ArchiveState):ScenePose[]{
 const idle=(row:number)=>Math.floor((ambient+row*1700)/1400)%8===7?5:0;
 if(scene==='characters')return [0,1,2].map(row=>{
  const enter=ease((time-row*600)/3000),arrived=state.mode==='manual'?1:enter;
  const related=state.person!==null;
  const shift=related?(row===0?-.025:row===1?0:.025)*w*ease((time-6500)/2300):0;
  const x=Math.round(w*(.24+row*.26)-32+shift);
  const start=h*.42-70,end=h*(row===1?.60:.68)-96;
  const y=Math.round(start+(end-start)*arrived);
  const moving=state.mode==='demo'&&((enter>0&&enter<1)||(related&&time<8800));
  return {row,x,y,frame:moving?1+(Math.floor(ambient/150)+row)%4:related&&row===['mara','ivo','sen'].indexOf(state.person!)?5:idle(row),facing:row===2?-1:1,carrying:false};
 });
 if(scene==='ai'){
  const move=ease(time/3500),working=time>=4000&&time<12000&&state.mode==='demo';
  return [{row:0,x:Math.round(8+(w*.18-40)*move),y:Math.round(h*.89-96),frame:time<3500&&state.mode==='demo'?1+Math.floor(time/150)%4:working?6+Math.floor(time/380)%2:idle(0),facing:1,carrying:working}];
 }
 const move=ease((time-9000)/5200),manual=state.mode==='manual';
 const x=Math.round(18+(w*.62-64)*(manual&&state.event?1:move));
 return [{row:0,x,y:Math.round(h*(w<500?.94:.87)-96),frame:time>=9000&&time<14200&&!manual?1+Math.floor(time/150)%4:time>=14200&&time<15500&&!manual?6+Math.floor(time/380)%2:idle(0),facing:1,carrying:(!manual&&time>=9000&&time<15500)||!!state.event}];
}
export function aiNode(row:number,time:number,w:number,h:number){
 const p=ease((time-(4000+row*2000))/2200);
 const start={x:w*(.28+row*.22),y:h*.29};
 const target=[{x:w*.30,y:h*.46},{x:w*.69,y:h*.37},{x:w*.69,y:h*.53}][row];
 return {x:Math.round(start.x+(target.x-start.x)*p),y:Math.round(start.y+(target.y-start.y)*p),visible:time>=4000+row*2000};
}
