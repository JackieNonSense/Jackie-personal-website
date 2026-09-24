// "Press run": the page asks the visitor what world is in their head, cuts the word
// WORLD out of its own question, and pastes that world up piece by piece: who, where,
// when, how it connects, and the words. Then it answers itself: all of it, one sheet.
import {Sheet} from './pixels';
import {SMALL,BOOK,measure,print} from './font';
import {drawEnding,type Ending} from './ending';
import {BLUE,INK,PALE,PAPER,TYPE_H,grain,halftone,marker,pasteUp,registration,scrap,stamp,tape,typeOffset,typeWidth,woodType} from './craft';

export const PW=400,PH=250;

/** The collage; once `fold` begins, the ending takes over the sheet. */
export type PressState=Ending&{
 /** Which headline is on the sheet, and how many of its characters are set. */
 headline:'question'|'answer';set:number;
 /** WORLD cut from the question: 0 in place, 0–.2 peeling up, then in flight, 1 pasted as the hub. */
 cut:number;scissors:boolean;
 /** Each piece's development, 0–1. */
 who:number;where:number;when:number;
 /** The date stamp's pressure, 0–1. */
 date:number;
 /** Marker links from the hub, 0–1. */
 links:number;
 ai:number;
 /** How many of the step stamps (WHO, WHERE, WHEN, HOW IT CONNECTS, AND THE WORDS) are down. */
 steps:number;
 hint:boolean;
};

// ——— Layout ———
const QUESTION=['WHAT WORLD','IS IN YOUR','HEAD?'],ANSWER=['ALL OF IT.','ONE SHEET.'];
const HEAD_X=16,HEAD_Y=12,LEAD=46;
const WORD_I=5,WORD_X=HEAD_X+typeOffset(QUESTION[0],WORD_I);
const PIECE={w:typeWidth('WORLD')+10,h:TYPE_H+8};
const PIECE_FROM:[number,number]=[WORD_X-5,HEAD_Y-4];
const HUB:[number,number]=[152,110];
const CARD={x0:282,y0:12,x1:386,y1:140};
const ARK={x:16,y:156,w:128,h:74};
const TICKET={x0:176,y0:206,x1:392,y1:236};
const CYCLE_AT=(c:number)=>TICKET.x0+24+(c-409)*32;
const AI_AT:[number,number]=[246,166];
const AI_LINE='The ark did not wait for her.';

// ——— Tone fields (0 paper … 1 solid) ———
const inEllipse=(u:number,v:number,cx:number,cy:number,rx:number,ry:number)=>((u-cx)/rx)**2+((v-cy)/ry)**2<=1;

/** The last pilot, helmeted, three-quarter view: shell lit from the left, a dark visor
 *  catching one long reflection, the neck ring and suit below. */
function pilotTone(u:number,v:number){
 const suit=v>=98&&Math.abs(u-56)<22+(v-98)*1.8;
 if(suit){
  if(u>=26&&u<=38&&v>=110&&v<=119)return inEllipse(u,v,32,114.5,2.5,2.5)?.95:.06;
  if(v>=106&&v<=107)return .92;
  return u>60?.82:.62;
 }
 if(inEllipse(u,v,56,95,26,7))return inEllipse(u,v,56,95,20,4)?.85:.5;
 if(u>=84&&u<=85&&v>=8&&v<=26)return .85;
 if(inEllipse(u,v,56,50,34,40)){
  if(inEllipse(u,v,62,55,24,16)){
   if(Math.abs((u-50)+(v-46)*.9)<2.4)return .12;
   if(Math.abs((u-56)+(v-44)*.9)<1)return .35;
   return .9-Math.max(0,(62-u)/24)*.14;
  }
  if(v>=28&&v<=30)return .62;
  if(inEllipse(u,v,56,50,31,37)&&u<40)return .08;
  return .22+Math.max(0,(u-56)/34)*.38;
 }
 return 0;
}

/** The orbital ark over a planet's limb: space in solid ink, stars knocked out, the ring
 *  lit on its near side, spokes to the hub. */
function arkTone(u:number,v:number){
 if(Math.hypot(u-64,v-176)<128){const d=128-Math.hypot(u-64,v-176);return d<2?.08:Math.min(.7,.2+d/40);}
 const e=Math.hypot((u-64)/40,(v-30)/11);
 if(Math.abs(e-1)<.18)return v>=30?.08:.42;
 if(Math.hypot(u-64,(v-30)*2.2)<6)return .08;
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const dx=Math.cos(a)*40,dy=Math.sin(a)*11,t=((u-64)*dx+(v-30)*dy)/(dx*dx+dy*dy);
  if(t>.12&&t<.85&&Math.hypot(u-64-t*dx,v-30-t*dy)<.8)return .25;
 }
 if(grain(u,v,21)<.012)return 0;
 return .88;
}

// ——— Pieces ———
function scissors(s:Sheet,x:number,y:number){
 const loop=(cx:number,cy:number)=>{for(let a=0;a<64;a++){const t=a/64*Math.PI*2;for(const r of [0,.8])s.set(Math.round(cx+Math.cos(t)*(6-r)),Math.round(cy+Math.sin(t)*(4.5-r)),INK);}};
 loop(x+6,y+5);loop(x+6,y+21);
 for(const [a,b] of [[[11,8],[19,12]],[[11,18],[19,14]]] as const){s.line(x+a[0],y+a[1],x+b[0],y+b[1],INK);s.line(x+a[0],y+a[1]+1,x+b[0],y+b[1]+1,INK);}
 for(const [dy,ty] of [[12,-4],[15,26]] as const)for(let w=0;w<3;w++)s.line(x+19,y+dy+w,x+48,y+ty+(ty<0?w:-w),INK);
 s.fill(x+18,y+12,x+20,y+15,BLUE);
}

/** A small step stamp in the margin: the page telling the visitor what they are seeing. */
function stepStamp(s:Sheet,text:string,x:number,y:number){
 const w=measure(text)+8,h=11;
 stamp(s,x,y,w,h,BLUE,(u,v)=>{
  if((u===0||u===w-1||v===0||v===h-1)&&!((u===0||u===w-1)&&(v===0||v===h-1)))return true;
  if(v>=3&&v<8){let cx=4;for(const ch of text){const g=SMALL.glyphs[ch];if(u>=cx&&u<cx+g[0].length)return g[v-3][u-cx]==='#';cx+=g[0].length+1;}}
  return false;
 });
}

function headline(s:Sheet,st:PressState){
 const lines=st.headline==='question'?QUESTION:ANSWER;
 let left=st.set;
 const shown=lines.map(t=>{const n=Math.max(0,Math.min(t.length,left));left-=t.length;return t.slice(0,n);});
 const gone=(l:number)=>(i:number)=>st.headline==='question'&&l===0&&i>=WORD_I&&st.cut>0;
 shown.forEach((t,l)=>woodType(s,t,HEAD_X+3,HEAD_Y+l*LEAD+3,BLUE,gone(l)));
 shown.forEach((t,l)=>woodType(s,t,HEAD_X,HEAD_Y+l*LEAD,INK,gone(l)));
 if(st.headline==='question'&&st.cut>0){
  const [x,y]=PIECE_FROM;
  for(let i=x;i<=x+PIECE.w;i++)if(i%4<2){s.set(i,y,PALE);s.set(i,y+PIECE.h,PALE);}
  for(let j=y;j<=y+PIECE.h;j++)if(j%4<2){s.set(x,j,PALE);s.set(x+PIECE.w,j,PALE);}
 }
}

function who(s:Sheet,st:PressState){
 if(st.who<=0)return;
 const rows=Math.round((CARD.y1-CARD.y0+1)*Math.min(1,st.who*1.6));
 s.fill(CARD.x0,CARD.y0,CARD.x1,CARD.y0+rows-1,BLUE);
 halftone(s,CARD.x0-8,CARD.y0+4,112,132,INK,pilotTone,(_,y)=>y<=CARD.y1+2,st.who);
 if(st.who>=1){
  print(s,'CAST 01',CARD.x0+5,CARD.y0+5,PAPER);
  s.fill(CARD.x0,CARD.y1-12,CARD.x1,CARD.y1,INK);
  print(s,'THE LAST PILOT',CARD.x0+5,CARD.y1-8,PAPER);
 }
}

function where(s:Sheet,st:PressState){
 if(st.where<=0)return;
 const inside=scrap(ARK.x,ARK.y,ARK.w,ARK.h,5);
 pasteUp(s,inside,ARK.x,ARK.y,ARK.w,ARK.h);
 halftone(s,ARK.x,ARK.y,ARK.w,ARK.h,BLUE,arkTone,inside,st.where);
 if(st.where>=1){
  const label='THE ORBITAL ARK',w=measure(label)+8;
  s.fill(ARK.x+4,ARK.y+ARK.h-14,ARK.x+4+w,ARK.y+ARK.h-5,PAPER);
  print(s,label,ARK.x+8,ARK.y+ARK.h-11,INK);
  tape(s,ARK.x-7,ARK.y-4,18,1,1);tape(s,ARK.x+ARK.w-14,ARK.y+ARK.h-8,18,-1,2);
 }
}

function when(s:Sheet,st:PressState){
 if(st.when>0){
  const t=TICKET,cy=(t.y0+t.y1)/2;
  const inside=(x:number,y:number)=>x>=t.x0&&x<=t.x1&&y>=t.y0&&y<=t.y1&&(x-t.x0)**2+(y-cy)**2>=25&&(x-t.x1)**2+(y-cy)**2>=25;
  for(let y=t.y0;y<=t.y1;y++)for(let x=t.x0;x<=t.x1;x++){
   if(!inside(x,y))continue;
   s.set(x,y,!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1)?INK:PAPER);
  }
  for(let y=t.y0+3;y<=t.y1-3;y+=3)s.set(t.x1-20,y,INK);
  print(s,'TIMELINE',t.x0+9,t.y0+5,INK);
  for(let x=t.x0+14;x<=t.x1-28;x++)s.set(x,t.y1-11,INK);
  for(let c=409;c<=414;c++){const x=CYCLE_AT(c);s.fill(x,t.y1-13,x,t.y1-9,INK);print(s,`0${c}`,x-7,t.y1-7,PALE);}
 }
 if(st.date>0){
  const w=58,h=32,x=CYCLE_AT(412)-(w>>1),y=TICKET.y0-20;
  stamp(s,x,y,w,h,BLUE,(u,v)=>{
   if((u<2||u>w-3||v<2||v>h-3)&&!((u<3||u>w-4)&&(v<3||v>h-4)))return true;
   if(v>=5&&v<10){let cx=Math.floor((w-measure('CYCLE'))/2);for(const ch of 'CYCLE'){const g=SMALL.glyphs[ch];if(u>=cx&&u<cx+g[0].length)return g[v-5][u-cx]==='#';cx+=g[0].length+1;}}
   if(v>=13&&v<28){const col=Math.floor((u-5)/12),k=(u-5)%12;if(col<0||col>3||k>=9)return false;return SMALL.glyphs['0412'[col]][Math.floor((v-13)/3)][Math.floor(k/3)]==='#';}
   return false;
  },st.date);
 }
}

function words(s:Sheet,st:PressState){
 if(st.ai<=0)return;
 const [x,y]=AI_AT,w=measure(AI_LINE,BOOK)+12;
 for(let j=0;j<15;j++)for(let i=0;i<w;i++)s.set(x+i,y+j,j===0||j===14||i===0||i===w-1?INK:PAPER);
 const n=Math.round(AI_LINE.length*Math.min(1,st.ai));
 print(s,AI_LINE.slice(0,n),x+7,y+3,INK,BOOK);
 s.fill(x-9,y+8,x+3,y+16,BLUE);print(s,'AI',x-6,y+10,PAPER);
 if(st.ai>=1)tape(s,x+w-10,y-4,14,1,4);
}

function links(s:Sheet,st:PressState){
 if(st.links<=0)return;
 const [hx,hy]=HUB,cx=hx+(PIECE.w>>1);
 const routes:[[number,number],[number,number],[number,number]][]=[
  [[hx+PIECE.w+2,hy+10],[262,70],[CARD.x0-6,62]],
  [[hx-2,hy+(PIECE.h>>1)+8],[120,150],[ARK.x+ARK.w+2,ARK.y+18]],
  [[cx+20,hy+PIECE.h+2],[260,176],[CYCLE_AT(412)-34,TICKET.y0-8]],
 ];
 routes.forEach((r,i)=>{const p=Math.max(0,Math.min(1,st.links*3-i));if(p>0)marker(s,r[0],r[1],r[2],INK,p,true);});
}

function world(s:Sheet,st:PressState){
 if(st.cut<=0)return;
 // First the word peels up in place; then it travels, lifted, to the middle of the sheet.
 const t=Math.min(1,st.cut),peel=Math.min(1,t/.2),travel=Math.max(0,(t-.2)/.8),ease=1-(1-travel)**2,lift=Math.sin(travel*Math.PI)*30;
 const x=Math.round(PIECE_FROM[0]+peel*4+(HUB[0]-PIECE_FROM[0]-4)*ease),y=Math.round(PIECE_FROM[1]-peel*5+(HUB[1]-PIECE_FROM[1]+5)*ease-lift);
 const inside=scrap(x,y,PIECE.w,PIECE.h,9),drop=Math.round(2+peel*4);
 if(t<1)for(let j=0;j<PIECE.h;j++)for(let i=0;i<PIECE.w;i++)if(inside(x+i,y+j)&&(x+i+y+j)%2===0)s.set(x+i+drop,y+j+drop+1,PALE);
 pasteUp(s,inside,x,y,PIECE.w,PIECE.h);
 woodType(s,'WORLD',x+5,y+4,INK);
 if(t>=1){tape(s,x-6,y-3,14,1,6);tape(s,x+PIECE.w-9,y+PIECE.h-7,14,-1,7);}
 if(st.scissors)scissors(s,x+PIECE.w-14,y+PIECE.h-12);
}

let finished:Uint8Array|null=null;
export function drawPress(st:PressState):Uint8Array{
 if(st.fold>0)return drawEnding(st,finished??=drawCollage(stateAt(COLLAGE_END)));
 return drawCollage(st);
}

function drawCollage(st:PressState):Uint8Array{
 const s=new Sheet(PW,PH);
 for(const [x,y,dx,dy] of [[3,3,1,1],[396,3,-1,1],[3,246,1,-1],[396,246,-1,-1]])for(let i=0;i<7;i++){s.set(x+i*dx,y,INK);s.set(x,y+i*dy,INK);}
 registration(s,393,108);registration(s,6,108);
 headline(s,st);
 who(s,st);where(s,st);when(s,st);links(s,st);words(s,st);world(s,st);
 const STEPS:[string,number,number][]=[['WHO',CARD.x1-24,CARD.y1+4],['WHERE',ARK.x+4,ARK.y-15],['WHEN',TICKET.x0+2,TICKET.y0-15],['HOW IT CONNECTS',HUB[0]+8,HUB[1]+PIECE.h+6],['AND THE WORDS',AI_AT[0]+30,AI_AT[1]-15]];
 STEPS.slice(0,st.steps).forEach(([t,x,y])=>stepStamp(s,t,x,y));
 if(st.hint){print(s,'SCROLL TO PRINT',384-measure('SCROLL TO PRINT'),222,INK);for(let i=0;i<5;i++)s.fill(380-(4-i),230+i,380+(4-i),230+i,INK);}
 print(s,'INKTRACE / PRESS RUN 03',16,240,PALE);
 print(s,'P.01',384-measure('P.01'),240,PALE);
 return s.px;
}

// ——— The run ———
/** Steps in one full scroll through the run. Progress is quantised to these, so the
 *  sheet moves in printed, stepped increments and every scroll position is repeatable. */
export const RUN_FRAMES=320;
/** Characters in the question, set one by one when the sheet is first seen. */
export const QUESTION_CHARS=QUESTION.join('').length;
const span=(p:number,a:number,b:number)=>Math.max(0,Math.min(1,(p-a)/(b-a)));
/** Where each step stamp lands, in scroll progress. */
const STEP_AT=[.12,.3,.44,.56,.68];

/** The share of the run the collage takes; the fold, the bloom and the sign-off follow. */
const COLLAGE_END=.72;

/** The sheet at scroll progress `p` (0–1), with `set` letters of the question already set. */
export function stateAt(run:number,set=QUESTION_CHARS):PressState{
 const p=Math.min(1,run/COLLAGE_END);
 const answering=p>=.8;
 return {
  headline:answering?'answer':'question',
  set:answering?Math.round(ANSWER.join('').length*span(p,.8,.9)):Math.round(Math.min(set,QUESTION_CHARS)*(1-span(p,.76,.8))),
  // It peels slowly, then crosses the question quickly, so it is never read into it.
  cut:span(p,.04,.12)*.2+span(p,.12,.19)*.8,
  scissors:p>=.03&&p<.12,
  who:span(p,.1,.26),where:span(p,.26,.38),when:span(p,.38,.46),
  // A stamp comes down hard: it goes from nothing to a full impression in a few steps.
  date:span(p,.46,.49),
  links:span(p,.5,.64),ai:span(p,.64,.76),
  steps:STEP_AT.filter(at=>p>=at).length,
  hint:p<.02,
  fold:span(run,.73,.79),fold2:span(run,.79,.84),slide:span(run,.84,.87),bloom:span(run,.87,.94),mark:span(run,.93,.98),
  hover:null,
 };
}
export const renderPress=(frame:number,set=QUESTION_CHARS,hover:PressState['hover']=null)=>drawPress({...stateAt(Math.max(0,Math.min(RUN_FRAMES,frame))/RUN_FRAMES,set),hover});
/** Whether the two ways in are printed, and so clickable, at this frame. */
export const waysInOpen=(frame:number)=>stateAt(Math.max(0,Math.min(RUN_FRAMES,frame))/RUN_FRAMES).mark>=.75;

const still=(run:number):PressState=>stateAt(run);
export const PRESS_FRAMES:Record<'ask'|'cut'|'answer'|'fold'|'bloom'|'end',PressState>={
 ask:still(0),
 cut:{...still(.1*COLLAGE_END),cut:.14,scissors:true,who:.4,steps:1},
 answer:still(COLLAGE_END),
 fold:still(.765),
 bloom:still(.915),
 end:still(1),
};
