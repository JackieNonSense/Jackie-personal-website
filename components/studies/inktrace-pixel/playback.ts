export const durations = [12000, 10000, 14000, 12000] as const;
export type SceneIndex = 0 | 1 | 2 | 3;
export type Playback = {
  phase: 'closed' | 'opening' | 'open' | 'closing';
  scene: SceneIndex;
  elapsed: number;
  transition: number;
  paused: boolean;
  still: boolean;
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
    case 'close': return state.phase==='closed' ? state : {...state,phase:state.still?'closed':'closing',transition:0,paused:true};
    case 'select': return state.phase!=='open' ? state : {...state,scene:action.scene,elapsed:0,paused:false};
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
