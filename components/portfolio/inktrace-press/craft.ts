// Print-shop craft for the press: wood type, halftone, torn paper, tape, stamps,
// marker. Every irregularity comes from a fixed hash of the pixel position, so a
// given state always prints exactly the same sheet.
import {BLUE,INK,PALE,PAPER} from './palette';
import type {Sheet} from './pixels';

/** A stable pseudo-random value in [0,1) for a pixel (and an optional salt). */
export const grain=(x:number,y:number,salt=0)=>{
 let h=(x*374761393+y*668265263+salt*2147483647)|0;
 h=Math.imul(h^(h>>>13),1274126177);
 return ((h^(h>>>16))>>>0)/4294967296;
};

// ——— Display type ———
// A condensed grotesque, drawn as strokes on a 4×10 grid and cut at print size:
// every letter is a set of capsules, so it stays clean at any stroke weight.
type Stroke=[number,number,number,number];
const LETTERS:Record<string,{w:number;strokes:Stroke[]}>={
 M:{w:4,strokes:[[0,10,0,0],[0,0,2,6],[2,6,4,0],[4,0,4,10]]},
 A:{w:4,strokes:[[0,10,0,1.4],[0,1.4,.9,0],[.9,0,3.1,0],[3.1,0,4,1.4],[4,1.4,4,10],[0,5.4,4,5.4]]},
 R:{w:4,strokes:[[0,10,0,0],[0,0,3,0],[3,0,4,1.1],[4,1.1,4,3.9],[4,3.9,3,5],[3,5,0,5],[2.2,5,4,10]]},
 L:{w:3.6,strokes:[[0,0,0,10],[0,10,3.6,10]]},
 E:{w:3.6,strokes:[[3.6,0,0,0],[0,0,0,10],[0,10,3.6,10],[0,5,3,5]]},
 F:{w:3.6,strokes:[[3.6,0,0,0],[0,0,0,10],[0,5,3,5]]},
 T:{w:4,strokes:[[0,0,4,0],[2,0,2,10]]},
 H:{w:4,strokes:[[0,0,0,10],[4,0,4,10],[0,5,4,5]]},
 C:{w:4,strokes:[[4,0,1,0],[1,0,0,1.4],[0,1.4,0,8.6],[0,8.6,1,10],[1,10,4,10]]},
 I:{w:0,strokes:[[0,0,0,10]]},
 V:{w:4,strokes:[[0,0,2,10],[2,10,4,0]]},
 K:{w:4,strokes:[[0,0,0,10],[4,0,.2,5.6],[1.5,4.2,4,10]]},
 W:{w:4.4,strokes:[[0,0,1,10],[1,10,2.2,4],[2.2,4,3.4,10],[3.4,10,4.4,0]]},
 O:{w:4,strokes:[[1,0,3,0],[3,0,4,1.4],[4,1.4,4,8.6],[4,8.6,3,10],[3,10,1,10],[1,10,0,8.6],[0,8.6,0,1.4],[0,1.4,1,0]]},
 D:{w:4,strokes:[[0,0,0,10],[0,0,2.8,0],[2.8,0,4,1.4],[4,1.4,4,8.6],[4,8.6,2.8,10],[2.8,10,0,10]]},
 S:{w:4,strokes:[[4,1,3,0],[3,0,1,0],[1,0,0,1.2],[0,1.2,0,3.8],[0,3.8,1,5],[1,5,3,5],[3,5,4,6.2],[4,6.2,4,8.8],[4,8.8,3,10],[3,10,1,10],[1,10,0,9]]},
 N:{w:4,strokes:[[0,10,0,0],[0,0,4,10],[4,10,4,0]]},
 Y:{w:4,strokes:[[0,0,2,5],[4,0,2,5],[2,5,2,10]]},
 U:{w:4,strokes:[[0,0,0,8.6],[0,8.6,1,10],[1,10,3,10],[3,10,4,8.6],[4,8.6,4,0]]},
 '?':{w:3.6,strokes:[[0,1.2,1,0],[1,0,2.6,0],[2.6,0,3.6,1.2],[3.6,1.2,3.6,3.6],[3.6,3.6,1.8,5.4],[1.8,5.4,1.8,7],[1.8,9.7,1.8,10]]},
 '.':{w:0,strokes:[[0,9.7,0,10]]},
 ' ':{w:1.4,strokes:[]},
};
export const TYPE_UX=3.4,TYPE_UY=3.6,TYPE_STROKE=2.3,TYPE_GAP=5;
const glyphW=(ch:string)=>Math.round(LETTERS[ch].w*TYPE_UX+TYPE_STROKE*2);
export const typeWidth=(text:string)=>[...text].reduce((w,ch,i)=>w+glyphW(ch)+(i?TYPE_GAP:0),0);
export const TYPE_H=Math.round(10*TYPE_UY+TYPE_STROKE*2);
/** Where the i-th character of a line starts. */
export const typeOffset=(text:string,i:number)=>typeWidth(text.slice(0,i))+(i?TYPE_GAP:0);

/** Cuts display type at (x,y). Ink wears a little at the edges, as metal type does. */
export function woodType(s:Sheet,text:string,x:number,y:number,ink:number,skip?:(i:number)=>boolean){
 [...text].forEach((ch,i)=>{
  const {strokes}=LETTERS[ch],w=glyphW(ch);
  if(!skip?.(i))for(let py=0;py<TYPE_H;py++)for(let px=0;px<w;px++){
   const gx=px+.5-TYPE_STROKE,gy=py+.5-TYPE_STROKE;
   let d=Infinity;
   for(const [ax,ay,bx,by] of strokes){
    const x0=ax*TYPE_UX,y0=ay*TYPE_UY,x1=bx*TYPE_UX,y1=by*TYPE_UY,dx=x1-x0,dy=y1-y0,len=dx*dx+dy*dy;
    const t=len?Math.max(0,Math.min(1,((gx-x0)*dx+(gy-y0)*dy)/len)):0;
    d=Math.min(d,Math.hypot(gx-x0-t*dx,gy-y0-t*dy));
   }
   if(d>TYPE_STROKE)continue;
   if(d>TYPE_STROKE-1&&grain(x+px,y+py,7)<.08)continue;
   s.set(x+px,y+py,ink);
  }
  x+=w+TYPE_GAP;
 });
}

// ——— Halftone ———
// A 45° clustered-dot screen: thresholds rank each pixel of a 6×6 cell by its distance
// to the nearest dot centre, so darker tones grow round dots, as an offset press does.
const SCREEN=(()=>{
 const centres=[[0,0],[6,0],[0,6],[6,6],[3,3]],cells:{i:number;d:number}[]=[];
 for(let y=0;y<6;y++)for(let x=0;x<6;x++)cells.push({i:y*6+x,d:Math.min(...centres.map(([cx,cy])=>Math.hypot(x+.5-cx,y+.5-cy)))+x*1e-4+y*1e-5});
 const t=new Float32Array(36);[...cells].sort((a,b)=>a.d-b.d).forEach((c,rank)=>{t[c.i]=(rank+.5)/36;});
 return t;
})();
export const dotted=(x:number,y:number,tone:number)=>tone>SCREEN[(((y%6)+6)%6)*6+(((x%6)+6)%6)];

/** Screens a tone field (0 paper … 1 solid) into the rectangle. `inside` can clip it. */
export function halftone(s:Sheet,x0:number,y0:number,w:number,h:number,ink:number,tone:(u:number,v:number)=>number,inside?:(x:number,y:number)=>boolean,develop=1){
 for(let v=0;v<h;v++)for(let u=0;u<w;u++){
  const x=x0+u,y=y0+v;
  if(inside&&!inside(x,y))continue;
  if(dotted(x,y,tone(u,v)*develop))s.set(x,y,ink);
 }
}

// ——— Paper, tape, stamps, marker ———

/** A torn-paper scrap: returns whether a pixel lies inside its ragged outline. */
export function scrap(x0:number,y0:number,w:number,h:number,salt:number){
 const ragged=(a:number,b:number)=>Math.floor(grain(a,b,salt)*3);
 return (x:number,y:number)=>x>=x0+ragged(y,1)&&x<x0+w-ragged(y,2)&&y>=y0+ragged(x,3)&&y<y0+h-ragged(x,4);
}
/** Clears a scrap to paper and gives it a pale shadow, pasted a little off the sheet. */
export function pasteUp(s:Sheet,inside:(x:number,y:number)=>boolean,x0:number,y0:number,w:number,h:number){
 for(let y=y0;y<y0+h+2;y++)for(let x=x0;x<x0+w+2;x++)if(!inside(x,y)&&inside(x-2,y-2))s.set(x,y,PALE);
 for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)if(inside(x,y))s.set(x,y,PAPER);
}

/** A strip of masking tape, laid on the diagonal: translucent, with torn ends. */
export function tape(s:Sheet,x:number,y:number,len:number,dir:1|-1,salt=0){
 for(let i=0;i<len;i++)for(let j=0;j<6;j++){
  const px=x+i,py=y+j+Math.floor(i/3)*dir;
  const torn=(i<2||i>len-3)&&grain(px,py,salt)<.5;
  if(!torn&&(px+py)%2===0)s.set(px,py,PALE);
 }
}

/** A rubber-stamp impression: uneven ink, with dropouts where the rubber missed. */
export function stamp(s:Sheet,x:number,y:number,w:number,h:number,ink:number,mark:(u:number,v:number)=>boolean,pressure=1){
 for(let v=0;v<h;v++)for(let u=0;u<w;u++){
  if(!mark(u,v))continue;
  const px=x+u,py=y+v;
  if(grain(px,py,11)<.18+(1-pressure)*.6)continue;
  s.set(px,py,ink);
 }
}

/** A felt-marker stroke along a quadratic curve: a 2px nib, thinning at the lift. */
export function marker(s:Sheet,a:[number,number],c:[number,number],b:[number,number],ink:number,progress=1,arrow=false){
 const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*1.5),shown=Math.floor(n*progress);
 let last:[number,number]=a,prev:[number,number]=a;
 for(let i=0;i<=shown;i++){
  const t=i/n,x=Math.round((1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0]),y=Math.round((1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]);
  s.set(x,y,ink);if(t<.92){s.set(x+1,y,ink);s.set(x,y+1,ink);}
  prev=last;last=[x,y];
 }
 if(arrow&&progress>=1){
  const dx=last[0]-prev[0],dy=last[1]-prev[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
  for(let k=1;k<=6;k++)for(const side of [-1,1]){
   const x=Math.round(last[0]-ux*k+(-uy)*side*k*.7),y=Math.round(last[1]-uy*k+ux*side*k*.7);
   s.set(x,y,ink);s.set(x+1,y,ink);
  }
 }
}

/** A registration target: the press's own crosshair-in-a-circle. */
export function registration(s:Sheet,cx:number,cy:number,ink=INK){
 for(let a=0;a<48;a++){const t=a/48*Math.PI*2;s.set(Math.round(cx+Math.cos(t)*4),Math.round(cy+Math.sin(t)*4),ink);}
 for(let d=-6;d<=6;d++){s.set(cx+d,cy,ink);s.set(cx,cy+d,ink);}
}

export {BLUE,INK,PALE,PAPER};
