export function frameLoop(active:()=>boolean,render:(delta:number)=>void){
 let frame=0,previous=0,rendering=false;
 const schedule=()=>{if(active()&&!frame&&!rendering)frame=requestAnimationFrame(run);};
 const stop=()=>{cancelAnimationFrame(frame);frame=0;previous=0;};
 const run=(now:number)=>{frame=0;if(!active()){previous=0;return;}rendering=true;const delta=previous?now-previous:0;previous=now;try{render(delta);}finally{rendering=false;}schedule();};
 return {sync(){if(!active())stop();else schedule();},stop};
}
