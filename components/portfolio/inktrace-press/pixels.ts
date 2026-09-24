import {PAPER} from './palette';

/** A sheet of paper, one byte per pixel: 0 is unprinted, 1–3 the inks. */
export class Sheet{
 readonly px:Uint8Array;readonly w:number;readonly h:number;
 constructor(w:number,h:number){this.w=w;this.h=h;this.px=new Uint8Array(w*h);}
 get(x:number,y:number){return x>=0&&y>=0&&x<this.w&&y<this.h?this.px[y*this.w+x]:PAPER;}
 set(x:number,y:number,ink:number){if(x>=0&&y>=0&&x<this.w&&y<this.h)this.px[y*this.w+x]=ink;}
 fill(x0:number,y0:number,x1:number,y1:number,ink:number){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)this.set(x,y,ink);}
 /** A 1px Bresenham line. */
 line(x0:number,y0:number,x1:number,y1:number,ink:number){
  const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
  let err=dx+dy;
  for(;;){
   this.set(x0,y0,ink);
   if(x0===x1&&y0===y1)return;
   const e=2*err;
   if(e>=dy){err+=dy;x0+=sx;}
   if(e<=dx){err+=dx;y0+=sy;}
  }
 }
}
