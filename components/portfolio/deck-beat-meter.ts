/** Peak-programme meter with per-band caps and a low-band onset detector.
 * Every value comes from the analyser; silence and pause produce a dead display. */
const BANDS=32,SCALE=8,KICK_LO=1,KICK_HI=9,TOP=.73;
// KICK_FLOOR and KICK_GAIN are calibrated against measured flux on real tracks,
// not against a synthetic step: a drum rises out of bass that is already sounding,
// so the floor discards the constant churn and the gain lets true hits reach full.
const RELEASE=.17,PEAK_HOLD=.42,PEAK_FALL=.26,KICK_DECAY=.13,KICK_FLOOR=.035,KICK_GAIN=10;
// A wide window with light smoothing: a kick owns its own bins instead of being
// averaged into a 172 Hz bucket, and the dB range keeps loud bass off the ceiling.
export const DECK_ANALYSER={fftSize:2048,smoothingTimeConstant:.12,minDecibels:-85,maxDecibels:-12};
export type DeckMeter={levels:number[];peaks:number[];holds:number[];bins:number[];kick:number};
export const createDeckMeter=():DeckMeter=>({levels:Array(BANDS).fill(0),peaks:Array(BANDS).fill(0),holds:Array(BANDS).fill(0),bins:Array(KICK_HI-KICK_LO).fill(0),kick:0});
// Log-spaced edges up to 16 kHz, forced strictly monotonic so the lowest columns
// each hold a single bin rather than collapsing onto the same one.
const edges=(len:number)=>{const top=Math.max(2,Math.min(len,Math.round(len*TOP))),out:number[]=[];
  for(let col=0,cut=1;col<=BANDS;col++,cut++){cut=Math.max(cut,Math.min(top,Math.round(Math.pow(top,col/BANDS))));out.push(cut);}return out;};
export function deckBands(data:Uint8Array|undefined):number[]{
  const len=data?.length??0;if(!len)return Array(BANDS).fill(0);const cut=edges(len);
  return Array.from({length:BANDS},(_,col)=>{const a=Math.min(cut[col],len-1),b=Math.min(Math.max(cut[col+1],a+1),len);
    let sum=0;for(let i=a;i<b;i++)sum+=data![i];return sum/(b-a)/255*SCALE;});
}
/** Instant attack, exponential release: the punch comes from how fast it falls,
 * never from overshoot, so a held tone rests exactly where its level maps. */
export function advanceDeckMeter(state:DeckMeter,data:Uint8Array|undefined,dt:number,status:string,exchangeMs:number|null,still:boolean):DeckMeter{
  if(still)return createDeckMeter();
  if(status==='switching'&&exchangeMs!==null&&exchangeMs<180)return state;
  if(status!=='playing')return createDeckMeter();
  const step=Math.min(Math.max(dt||0,0),.05);if(!step)return state;
  const target=deckBands(data),len=data?.length??0;
  const release=Math.exp(-step/RELEASE),fall=Math.exp(-step/PEAK_FALL);
  const levels=target.map((value,i)=>Math.max(value,state.levels[i]*release));
  const holds=target.map((value,i)=>value>=state.peaks[i]?PEAK_HOLD:Math.max(0,state.holds[i]-step));
  const peaks=target.map((value,i)=>Math.max(levels[i],value>=state.peaks[i]?value:holds[i]>0?state.peaks[i]:state.peaks[i]*fall));
  // Positive spectral flux over the kick band only: a sustained bass note settles
  // to zero, and percussion above it can never invent a beat.
  const bins=state.bins.map((_,i)=>KICK_LO+i<Math.min(KICK_HI,len)?data![KICK_LO+i]/255:0);
  const flux=bins.reduce((sum,value,i)=>sum+Math.max(0,value-state.bins[i]),0)/bins.length;
  return{levels,peaks,holds,bins,kick:Math.max(state.kick*Math.exp(-step/KICK_DECAY),Math.min(1,Math.max(0,flux-KICK_FLOOR)*KICK_GAIN))};
}
