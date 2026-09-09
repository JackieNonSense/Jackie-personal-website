/** Preserve the outgoing real measurement only while the display fades it.
 * No random signal, and no frozen bars in paused/error/static states. */
export function deckLevels(previous:readonly number[],sample:readonly number[],status:string,exchangeMs:number|null,still:boolean):number[]{
  if(still)return previous.map(()=>0);
  if(status==='switching'&&exchangeMs!==null&&exchangeMs<180)return [...previous];
  if(status!=='playing')return previous.map(()=>0);
  return previous.map((level,i)=>{const next=sample[i]??0;return level+(next-level)*(next>level?.68:.2);});
}
