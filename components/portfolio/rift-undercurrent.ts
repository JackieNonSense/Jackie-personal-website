export function riftOffset(x:number,center:number,width:number,amount:number){
  const t=Math.min(1,Math.abs(x-center)/(width/2));
  const feather=(1-t*t)**3*Math.max(0,Math.min(1,amount));
  return feather?{upper:-16*feather,lower:10*feather}:{upper:0,lower:0};
}
export function stepRift(value:number,target:number,dt:number,still:boolean){
  if(still)return target;
  const next=value+(target-value)*(1-Math.exp(-Math.min(.05,Math.max(0,dt))*(target>value?11:7)));
  return Math.abs(next-target)<.001?target:next;
}
const seam=[[0,.577],[.035,.568],[.078,.573],[.12,.57],[.17,.58],[.215,.57],[.258,.561],[.3,.567],[.342,.563],[.392,.559],[.44,.565],[.489,.569],[.53,.555],[.58,.547],[.627,.549],[.67,.55],[.718,.541],[.767,.553],[.81,.56],[.855,.576],[.901,.567],[.95,.55],[1,.534]];
export function seamY(x:number,width:number,height:number){
  const u=Math.max(0,Math.min(1,x/width));let i=1;while(i<seam.length-1&&seam[i][0]<u)i++;
  const a=seam[i-1],b=seam[i],t=(u-a[0])/(b[0]-a[0]);
  return (a[1]+(b[1]-a[1])*t)*height+(Math.sin(x*1.731)+Math.sin(x*3.173+.8))*.42;
}
export function riftSymbols(width:number){
  let seed=27183;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const alphabet=['01','/ :','ナ','+','10 /','リ : 0','·','001','//'];
  return Array.from({length:Math.max(10,Math.floor(width/31))},(_,i)=>({x:(i+.15+random()*.65)*31/width,phase:random()*Math.PI*2,speed:(i%2?-1:1)*(2+random()*4),text:alphabet[Math.floor(random()*alphabet.length)],layer:i%3}));
}
