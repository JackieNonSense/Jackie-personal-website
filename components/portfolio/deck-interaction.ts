const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
export function rotaryGesture(volume:number,dx:number,dy:number){
  const dragged=Math.hypot(dx,dy)>=5;
  return {dragged,volume:dragged?clamp(volume+(dx-dy)/150):volume};
}
/** Milliseconds on the audio transport's clock, not a separate animation timer. */
export function transportPose(ms:number,still=false){
  if(still||ms<180||ms>=1050)return {angle:0,discTravel:0,discVisible:false};
  const opening=smooth((ms-180)/270),closing=smooth((ms-850)/200);
  const discTravel=ms<630?smooth((ms-450)/180):1-smooth((ms-630)/220);
  return {angle:28*opening*(1-closing),discTravel,discVisible:ms>=430&&ms<870&&discTravel<.995};
}
export function spectrumBands(sample:Uint8Array|undefined){
  return Array.from({length:32},(_,col)=>{
    if(!sample?.length)return 0;
    const start=Math.floor(Math.pow(col/32,1.7)*sample.length);
    const end=Math.min(sample.length,Math.max(start+1,Math.floor(Math.pow((col+1)/32,1.7)*sample.length)));
    let sum=0;for(let i=start;i<end;i++)sum+=sample[i];
    return Math.round(sum/(end-start)/255*9);
  });
}
/** A key snaps down under the finger and returns more slowly, the way a sprung
 * console key does. Attention fades in rather than switching on. */
export function keyResponse(previous:{press:number;glow:number},pressed:boolean,attentive:boolean,dt:number,still:boolean){
  if(still)return{press:pressed?1:0,glow:attentive?1:0};
  const step=Math.min(Math.max(dt,0),.05),ease=(from:number,to:number,rate:number)=>from+(to-from)*(1-Math.exp(-step*rate));
  const press=pressed?1:0,glow=attentive?1:0;
  return{press:clamp(ease(previous.press,press,press>previous.press?55:20)),glow:clamp(ease(previous.glow,glow,18))};
}
