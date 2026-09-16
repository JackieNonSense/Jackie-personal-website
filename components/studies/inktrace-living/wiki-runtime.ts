export type ImageLayout = 'wide' | 'left' | 'right';
export type QuotePosition = 'hidden' | 'after' | 'between' | 'before';
export type WikiReference = 'mara' | 'coast' | null;
export type WikiMode = 'demo' | 'manual' | 'ended';
export type WikiSnapshot = {
  open: boolean; mode: WikiMode; paused: boolean; step: number;
  layout: ImageLayout; width: number; quote: QuotePosition;
  reference: WikiReference; revision: number; lastAction: string;
};
export const WIKI_STEPS = [0, 3000, 5000, 9500, 12500, 15500, 18500, 22000] as const;
export const INITIAL_WIKI: WikiSnapshot = {open:true,mode:'demo',paused:false,step:0,layout:'wide',width:100,quote:'hidden',reference:null,revision:0,lastAction:'start'};
export class WikiRuntime {
  private state: WikiSnapshot = {...INITIAL_WIKI};
  private time = 0;
  private ambient = 0;
  private listeners = new Set<() => void>();
  getSnapshot = (): WikiSnapshot => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {this.listeners.delete(listener);};
  };
  private update(patch: Partial<WikiSnapshot>) {
    this.state = {...this.state,...patch};
    this.listeners.forEach(listener => listener());
  }
  getFrame = () => ({time:this.time,ambient:this.ambient,width:this.state.mode === 'demo' ? demoWidth(this.time) : this.state.width});
  tick(delta:number,active=true,quiet=false) {
    if(!Number.isFinite(delta)||delta<0||delta>100||!active||quiet||this.state.paused||!this.state.open)return;
    this.ambient += delta;
    if(this.state.mode !== 'demo')return;
    this.time = Math.min(22000,this.time+delta);
    const step = stepAt(this.time);
    if(step !== this.state.step)this.update({...atStep(step),mode:step===7?'ended':'demo'});
  }
  pause(value:boolean) {if(value!==this.state.paused)this.update({paused:value});}
  private edit(patch:Partial<WikiSnapshot>,action:string) {
    this.update({width:this.getFrame().width,...patch,mode:'manual',revision:this.state.revision+1,lastAction:action});
  }
  layout(value:ImageLayout) {this.edit({layout:value,width:value==='wide'?100:44},'layout');}
  resize(value:number) {
    if(Number.isFinite(value))this.edit({width:Math.max(28,Math.min(100,Math.round(value)))},'resize');
  }
  quote(value:QuotePosition) {this.edit({quote:value},'quote');}
  reference(value:WikiReference) {this.edit({reference:value},'reference');}
  step(index:number) {
    const step=Math.max(0,Math.min(WIKI_STEPS.length-1,Math.round(index)));
    this.time=WIKI_STEPS[step];this.ambient=this.time;
    this.edit(atStep(step),'step');
  }
  replay() {this.time=0;this.ambient=0;this.update({...INITIAL_WIKI,revision:this.state.revision+1});}
  close() {this.update({open:false});}
  open() {this.replay();}
}
const ease=(t:number)=>{const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p);};
const demoWidth=(time:number)=>100-56*ease((time-5000)/4500);
const stepAt=(time:number)=>WIKI_STEPS.reduce<number>((last,value,index)=>time>=value?index:last,0);
const atStep=(step:number):Partial<WikiSnapshot>=>({step,layout:step>=2?'right':'wide',width:step>=3?44:100,quote:step>=5?'between':step>=4?'after':'hidden',reference:step>=6?'mara':null});
export type ActorPose = {row:number;x:number;y:number;frame:number;facing:number;carrying:boolean};
export function wikiActorPoses(time:number,ambient:number,width:number,paperBottom:number,manual=false):ActorPose[] {
  const starts=[0,3000,13500],ends=[3000,5000,16500];
  const lane=width/3;
  return starts.map((start,row)=>{
    const moving=!manual&&time>=start&&time<ends[row];
    const progress=ease((time-start)/(ends[row]-start));
    const forward=row!==1;
    const travel=Math.max(0,lane-78);
    const x=Math.round(row*lane+7+travel*(forward?progress:1-progress));
    const working=!manual&&((row===1&&time>=5000&&time<9500)||(row===0&&time>=12500&&time<15500)||(row===2&&time>=16500&&time<18500));
    const frame=moving?1+(Math.floor((time-start)/150)+row)%4:working?6+Math.floor(time/380)%2:(Math.floor((ambient+row*1600)/1400)%8===7?5:0);
    return {row,x:Math.min(Math.max(0,x),width-64),y:Math.ceil(paperBottom)+12,frame,facing:forward?1:-1,carrying:moving||working};
  });
}
