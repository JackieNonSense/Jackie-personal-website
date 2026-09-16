import {EVENTS,PEOPLE,SCENES} from './archive-data';
export type SceneId='timeline'|'characters'|'ai'|'wiki';
export type ArchiveState={scene:SceneId;mode:'demo'|'manual'|'ended';step:number;paused:boolean;open:boolean;year:number|null;month:string|null;event:string|null;person:string|null;ai:'gathering'|'preview'|'waiting'|'archiving'|'created';revision:number};
const initial=(scene:SceneId='timeline'):ArchiveState=>({scene,mode:'demo',step:0,paused:false,open:true,year:null,month:null,event:null,person:null,ai:'gathering',revision:0});
export class ArchiveRuntime {
 private state=initial();private time=0;private ambient=0;private archive=0;
 private listeners=new Set<()=>void>();
 getSnapshot=()=>this.state;
 getFrame=()=>({time:this.time,ambient:this.ambient,archive:this.archive});
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private update(patch:Partial<ArchiveState>){this.state={...this.state,...patch,revision:this.state.revision+1};this.listeners.forEach(fn=>fn());}
 private edit(patch:Partial<ArchiveState>){this.update({...patch,mode:'manual'});}
 tick(delta:number,active=true,quiet=false){
  if(!Number.isFinite(delta)||delta<0||delta>100||!active||quiet||this.state.paused||!this.state.open)return;
  this.ambient+=delta;
  if(this.state.ai==='archiving'){this.archive=Math.min(2400,this.archive+delta);if(this.archive===2400)this.update({ai:'created'});return;}
  if(this.state.mode!=='demo')return;
  const def=SCENES.find(s=>s.id===this.state.scene)!;
  this.time=Math.min(def.duration,this.time+delta);
  const step=def.times.reduce<number>((last,t,i)=>this.time>=t?i:last,0);
  if(step!==this.state.step)this.update({...this.atStep(step),mode:this.time===def.duration?'ended':'demo'});
 }
 private atStep(step:number):Partial<ArchiveState>{
  if(this.state.scene==='timeline')return {step,year:step>=1?312:null,month:step>=2?'09':null,event:step>=4?'departure':null};
  if(this.state.scene==='characters')return {step,person:step>=2?'mara':null};
  return {step,ai:step>=5?'waiting':step>=3?'preview':'gathering'};
 }
 select(scene:SceneId){this.time=0;this.ambient=0;this.archive=0;this.update({...initial(scene),paused:this.state.paused});}
 year(value:number){if(value===312||value===313)this.edit({year:value,month:null,event:null});}
 month(value:string){if(EVENTS.some(e=>e.year===this.state.year&&e.month===value))this.edit({month:value,event:null});}
 event(value:string){if(EVENTS.some(e=>e.year===this.state.year&&e.month===this.state.month&&e.id===value))this.edit({event:value});}
 person(value:string){if(PEOPLE.some(p=>p.id===value))this.edit({person:value});}
 confirm(quiet=false){if(this.state.scene==='ai'&&this.state.ai==='waiting'){this.archive=quiet?2400:0;this.edit({ai:quiet?'created':'archiving'});}}
 pause(value:boolean){if(this.state.paused!==value)this.update({paused:value});}
 step(value:number){const def=SCENES.find(s=>s.id===this.state.scene)!;const step=Math.max(0,Math.min(def.times.length-1,Math.round(value)));this.time=def.times[step];this.ambient=this.time;this.archive=0;this.edit(this.atStep(step));}
 replay(){this.time=0;this.ambient=0;this.archive=0;this.update({...initial(this.state.scene),paused:this.state.paused});}
 close(){this.update({open:false});}
 open(){this.select('timeline');}
}
