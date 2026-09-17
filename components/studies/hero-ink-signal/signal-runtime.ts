export interface BinaryStream {id:number; direction:1|-1; x:number; speed:number; offset:number; length:number;}

export const streams:BinaryStream[]=Array.from({length:32},(_,id)=>({
 id,direction:id%2?1:-1,x:540+id*18,speed:.024+(id%7)*.003,
 offset:((id*83)%211)+430,length:4+(id%4),
}));

/** Fixed binary alphabet and seed: playback never depends on Math.random(). */
export function glyphAt(id:number,index:number):'0'|'1'{
 let seed=Math.imul(id+1,374761393)^Math.imul(index+11,668265263);
 seed=Math.imul(seed^(seed>>>13),1274126177);
 return ((seed^(seed>>>16))&1)?'1':'0';
}
export function streamHead(stream:BinaryStream,time:number){
 return stream.offset+time*stream.speed*stream.direction;
}
export function advanceClock(elapsed:number,delta:number,active:boolean){
 return elapsed+(active&&Number.isFinite(delta)?Math.max(0,Math.min(50,delta)):0);
}
export function demoState(elapsed:number|null){
 return {hover:elapsed!==null&&elapsed>=3200&&elapsed<4700,
  open:elapsed!==null&&elapsed>=4700&&elapsed<8100,
  done:elapsed!==null&&elapsed>=8600};
}
