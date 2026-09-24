// The close of the run: the finished sheet folds into a booklet, the booklet opens,
// and the InkTrace mark blooms out of its spine, with the name and two ways in.
import {Sheet} from './pixels';
import {SMALL,measure,print} from './font';
import {BLUE,INK,PALE,PAPER,dotted,registration,typeWidth,woodType} from './craft';
import {LOGO} from './logo';

export const EW=400,EH=250;

export type Ending={
 /** First fold, right half over left, 0–1. */
 fold:number;
 /** Second fold, top over bottom, 0–1. */
 fold2:number;
 /** The booklet sliding to the middle of the sheet, 0–1. */
 slide:number;
 /** The booklet opening and the mark blooming out of it, 0–1. */
 bloom:number;
 /** The name and the two ways in, 0–1. */
 mark:number;
 hover:'try'|'built'|null;
};

// ——— The ways in ———
const BUTTON_SCALE=2,BUTTON_PAD=8,BUTTON_Y=188,BUTTON_GAP=14;
const LABELS={try:'TRY INKTRACE ↗',built:"HOW IT'S BUILT ↗"} as const;
const buttonW=(k:keyof typeof LABELS)=>measure(LABELS[k],SMALL,BUTTON_SCALE)+BUTTON_PAD*2;
const BUTTON_H=5*BUTTON_SCALE+BUTTON_PAD+4;
const firstX=Math.round((EW-buttonW('try')-BUTTON_GAP-buttonW('built'))/2);
/** Where each way in sits on the sheet, so the page can lay a real link over it. */
export const BUTTONS=[
 {id:'try' as const,href:'https://inktrace.app',label:'Try InkTrace — opens in a new tab',x:firstX,y:BUTTON_Y,w:buttonW('try'),h:BUTTON_H},
 {id:'built' as const,href:'https://github.com/JackieNonSense/inktrace-showcase',label:'How InkTrace is built — opens in a new tab',x:firstX+buttonW('try')+BUTTON_GAP,y:BUTTON_Y,w:buttonW('built'),h:BUTTON_H},
];

// ——— The booklet ———
/** A cover: a blue plate with the title knocked out of it. `back` is the plain back cover. */
function cover(s:Sheet,x:number,y:number,w:number,h:number,back:boolean){
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  const edge=i===0||j===0||i===w-1||j===h-1;
  s.set(x+i,y+j,edge?INK:BLUE);
 }
 if(back){print(s,'INKTRACE',x+8,y+h-12,PAPER);print(s,'P.02',x+w-8-measure('P.02'),y+h-12,PAPER);return;}
 print(s,'ISSUE 03',x+8,y+8,PAPER);
 if(h>60){print(s,'WHAT WORLD',x+8,y+h/2-6,PAPER);print(s,'IS IN YOUR HEAD?',x+8,y+h/2+2,PAPER);}
 print(s,'INKTRACE',x+w-8-measure('INKTRACE'),y+h-12,PAPER);
}

/** Paper seen at an angle darkens: a pale dither whose weight rises with `shade` (0–1). */
const shaded=(x:number,y:number,shade:number)=>dotted(x,y,shade*.5)?PALE:PAPER;

/** Folds the right half of `src` over the left, about x = EW/2. */
function firstFold(s:Sheet,src:Uint8Array,t:number){
 const mid=EW/2;
 for(let y=0;y<EH;y++)for(let x=0;x<mid;x++)s.px[y*EW+x]=src[y*EW+x];
 const width=Math.round(mid*Math.abs(Math.cos(Math.PI*t)));
 if(t<.5){
  // Still face up: the right half foreshortens toward the fold, darkening as it lifts.
  for(let y=0;y<EH;y++)for(let dx=0;dx<width;dx++){
   const sx=mid+Math.floor(dx*mid/Math.max(1,width)),c=src[y*EW+sx];
   s.set(mid+dx,y,c||shaded(mid+dx,y,t*1.6));
  }
  for(let y=0;y<EH;y++)s.set(mid+width,y,INK);
 }else{
  // Over the top: now its back, the cover, swings down across the left half.
  const back=new Sheet(mid,EH);cover(back,0,0,mid,EH,false);
  for(let y=0;y<EH;y++)for(let dx=0;dx<width;dx++){
   const sx=mid-1-Math.floor(dx*mid/Math.max(1,width));
   const c=back.px[y*mid+sx];
   s.set(mid-1-dx,y,c===BLUE&&dotted(mid-1-dx,y,(1-t)*.9)?INK:c);
  }
  for(let y=0;y<EH;y++)s.set(mid-width,y,INK);
 }
}

/** Folds the top half of the cover down over its bottom half, about y = EH/2. */
function secondFold(s:Sheet,t:number){
 const mid=EH/2,w=EW/2;
 const front=new Sheet(w,EH);cover(front,0,0,w,EH,false);
 for(let y=mid;y<EH;y++)for(let x=0;x<w;x++)s.set(x,y,front.px[y*w+x]);
 const height=Math.round(mid*Math.abs(Math.cos(Math.PI*t)));
 if(t<.5){
  for(let dy=0;dy<height;dy++)for(let x=0;x<w;x++){const sy=mid-1-Math.floor(dy*mid/Math.max(1,height));s.set(x,mid-1-dy,front.px[sy*w+x]);}
  for(let x=0;x<w;x++)s.set(x,mid-height,INK);
 }else{
  const back=new Sheet(w,mid);cover(back,0,0,w,mid,true);
  for(let dy=0;dy<height;dy++)for(let x=0;x<w;x++){const sy=Math.floor(dy*mid/Math.max(1,height));const c=back.px[sy*w+x];s.set(x,mid+dy,c===BLUE&&dotted(x,mid+dy,(1-t)*.9)?INK:c);}
  for(let x=0;x<w;x++)s.set(x,mid+height,INK);
 }
}

// ——— The mark ———
const LOGO_X=Math.round((EW-LOGO.w)/2),LOGO_Y=14,PIVOT:[number,number]=[LOGO_X+(LOGO.w>>1),LOGO_Y+LOGO.h];
const tone=(u:number,v:number)=>parseInt(LOGO.rows[v][u],16)/15;

/** The mark, screened: covers in black over a misregistered blue plate, pages in light dots.
 *  It blooms out from the foot of the spine: nothing prints beyond `reach` pixels from it. */
function logo(s:Sheet,reach:number,lift:number){
 const within=(u:number,v:number)=>Math.hypot(LOGO_X+u-PIVOT[0],LOGO_Y+v-PIVOT[1])<=reach;
 for(let v=0;v<LOGO.h;v++)for(let u=0;u<LOGO.w;u++){
  const t=tone(u,v);if(t>=.62&&within(u,v)&&dotted(LOGO_X+u+2,LOGO_Y+v+2,1))s.set(LOGO_X+u+2,LOGO_Y+v+2,BLUE);
 }
 for(let v=0;v<LOGO.h;v++)for(let u=0;u<LOGO.w;u++){
  const t=tone(u,v);if(!t||!within(u,v))continue;
  // On hover the pages lift a pixel; the covers stay put.
  const y=LOGO_Y+v-(t<.62?lift:0),x=LOGO_X+u;
  s.set(x,y,dotted(x,y,t)?INK:PAPER);
 }
}

function button(s:Sheet,b:typeof BUTTONS[number],hover:boolean){
 for(let j=0;j<b.h;j++)for(let i=0;i<b.w;i++){
  const edge=i===0||j===0||i===b.w-1||j===b.h-1;
  s.set(b.x+i,b.y+j,hover?INK:edge?INK:PAPER);
 }
 if(!hover)for(let i=2;i<b.w;i++)s.set(b.x+i,b.y+b.h,INK);// a printed drop shadow
 print(s,LABELS[b.id],b.x+BUTTON_PAD,b.y+BUTTON_PAD/2+2,hover?PAPER:INK,SMALL,BUTTON_SCALE);
}

export function drawEnding(st:Ending,collage:Uint8Array):Uint8Array{
 const s=new Sheet(EW,EH);
 for(const [x,y,dx,dy] of [[3,3,1,1],[396,3,-1,1],[3,246,1,-1],[396,246,-1,-1]])for(let i=0;i<7;i++){s.set(x+i*dx,y,INK);s.set(x,y+i*dy,INK);}
 if(st.fold<1){firstFold(s,collage,st.fold);return s.px;}
 if(st.fold2<1){secondFold(s,st.fold2);return s.px;}
 registration(s,393,108);registration(s,6,108);
 // The booklet slides to the middle and opens there.
 const bx=Math.round(100*st.slide),by=Math.round(125-63*st.slide);
 const open=Math.min(1,st.bloom/.35);
 if(open<1){
  const half=100,w=Math.round(half*Math.cos(open*Math.PI/2));
  const back=new Sheet(200,125);cover(back,0,0,200,125,true);
  for(let y=0;y<125;y++)for(let i=0;i<w;i++){
   const sx=Math.floor(i*half/Math.max(1,w));
   s.set(bx+i,by+y,back.px[y*200+sx]);// left cover, swinging open to the left edge
   s.set(bx+199-i,by+y,back.px[y*200+199-sx]);
  }
 }
 if(st.bloom>.3)logo(s,(st.bloom-.3)/.7*(LOGO.h+LOGO.w*.6),st.hover?1:0);
 if(st.mark>0){
  const name='INKTRACE',n=Math.round(name.length*Math.min(1,st.mark/.6));
  const nx=Math.round((EW-typeWidth(name))/2),ny=LOGO_Y+LOGO.h+8;
  woodType(s,name.slice(0,n),nx+3,ny+3,BLUE);
  woodType(s,name.slice(0,n),nx,ny,INK);
  if(st.mark>=.75)for(const b of BUTTONS)button(s,b,st.hover===b.id);
 }
 print(s,'INKTRACE / PRESS RUN 03',16,240,PALE);
 print(s,'P.02',384-measure('P.02'),240,PALE);
 return s.px;
}
