export const durations = [12000, 10000, 14000, 12000] as const;
export type SceneIndex = 0 | 1 | 2 | 3;
export type Playback = {
  phase: 'closed' | 'opening' | 'open' | 'closing';
  scene: SceneIndex;
  elapsed: number;
  transition: number;
  paused: boolean;
  still: boolean;
  closingPose?: WindowPose;
};
export type PlaybackAction =
  | {type: 'open' | 'close' | 'pause' | 'replay' | 'step'}
  | {type: 'select'; scene: SceneIndex}
  | {type: 'still'; value: boolean}
  | {type: 'tick'; dt: number; active: boolean};
export const initialPlayback: Playback = {phase:'closed',scene:0,elapsed:0,transition:0,paused:false,still:false};
export function playback(state: Playback, action: PlaybackAction): Playback {
  switch(action.type){
    case 'open': return state.phase==='closed' ? {...initialPlayback,still:state.still,phase:state.still?'open':'opening'} : state;
    case 'close': return state.phase==='closed'||state.phase==='closing' ? state : {...state,closingPose:windowPose(state),phase:state.still?'closed':'closing',transition:0,paused:true};
    case 'select': return state.phase!=='open'||state.scene===action.scene ? state : {...state,scene:action.scene,elapsed:0,paused:false};
    case 'pause': return state.phase==='open' ? {...state,paused:!state.paused} : state;
    case 'replay': return state.phase==='open' ? {...state,elapsed:0,paused:false} : state;
    case 'step': return state.phase==='open' ? {...state,elapsed:Math.min(durations[state.scene],(beat(state)+1)*durations[state.scene]/4),paused:true} : state;
    case 'still': return {...state,still:action.value,phase:action.value?(state.phase==='opening'?'open':state.phase==='closing'?'closed':state.phase):state.phase};
    case 'tick': {
      if(!action.active || state.still || !Number.isFinite(action.dt) || action.dt<=0)return state;
      if(state.phase==='opening' || state.phase==='closing'){
        const transition=state.transition+action.dt;
        const complete=transition>=(state.phase==='opening'?700:350);
        return {...state,transition,phase:complete?(state.phase==='opening'?'open':'closed'):state.phase};
      }
      if(state.phase!=='open'||state.paused||state.elapsed===durations[state.scene])return state;
      return {...state,elapsed:Math.min(durations[state.scene],state.elapsed+action.dt)};
    }
  }
}
export function beat(state: Playback): number { return Math.min(3,Math.floor(state.elapsed/durations[state.scene]*4)); }

export type WindowPose = {width:number;height:number;frameOpacity:number;contentOpacity:number;bookOpacity:number;bookScale:number};
const closedPose:WindowPose={width:.25,height:.06,frameOpacity:0,contentOpacity:0,bookOpacity:1,bookScale:1};
const openedPose:WindowPose={width:1,height:1,frameOpacity:1,contentOpacity:1,bookOpacity:0,bookScale:.92};
const curve=(time:number,from:number,to:number)=>{
 const x=Math.max(0,Math.min(1,(time-from)/(to-from)));
 return x*x*(3-2*x);
};
// A shared clock keeps the book, frame and readable ink in order, including
// interrupted closes. No independent timers can reveal an obsolete window.
export function windowPose(state:Playback):WindowPose {
 if(state.phase==='closed')return closedPose;
 if(state.phase==='open')return openedPose;
 const time=Number.isFinite(state.transition)?Math.max(0,state.transition):0;
 if(state.phase==='opening')return {
  width:.25+.75*curve(time,140,380),height:.06+.94*curve(time,300,620),
  frameOpacity:curve(time,140,220),contentOpacity:curve(time,430,700),
  bookOpacity:1-curve(time,100,240),bookScale:1-.08*curve(time,0,180),
 };
 const from=state.closingPose??openedPose;
 return {
  width:from.width+(.25-from.width)*curve(time,110,350),
  height:from.height+(.06-from.height)*curve(time,60,290),
  frameOpacity:from.frameOpacity*(1-curve(time,230,350)),
  contentOpacity:from.contentOpacity*(1-curve(time,0,110)),
  bookOpacity:from.bookOpacity+(1-from.bookOpacity)*curve(time,190,350),
  bookScale:from.bookScale+(1-from.bookScale)*curve(time,190,350),
 };
}
