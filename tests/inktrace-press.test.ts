import {describe,it,expect} from 'vitest';
import {PW,PH,PLAY_MS,PRESS_FRAMES,QUESTION_CHARS,RUN_FRAMES,STEP_MS,drawPress,playhead,renderPress,stateAt,waysInOpen} from '../components/portfolio/inktrace-press/press';
import {BUTTONS} from '../components/portfolio/inktrace-press/ending';
import {fitScale} from '../components/portfolio/inktrace-press/InkTracePress';
import {measure,print,SMALL} from '../components/portfolio/inktrace-press/font';
import {Sheet} from '../components/portfolio/inktrace-press/pixels';

const inked=(px:Uint8Array,x0:number,y0:number,x1:number,y1:number)=>{let n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(px[y*PW+x])n++;return n;};

describe('the run',()=>{
 it('opens on the question, with nothing yet pasted up',()=>{
  const st=stateAt(0);
  expect(st).toMatchObject({headline:'question',set:QUESTION_CHARS,cut:0,who:0,where:0,when:0,date:0,links:0,ai:0,steps:0});
 });
 it('ends on the answer, with every piece down',()=>{
  const st=stateAt(1);
  expect(st).toMatchObject({headline:'answer',cut:1,who:1,where:1,when:1,date:1,links:1,ai:1,steps:5});
  expect(st.set).toBe('ALL OF IT.ONE SHEET.'.length);
 });
 it('only ever moves forward through the run',()=>{
  const keys=['cut','who','where','when','date','links','ai','steps','fold','fold2','slide','bloom','mark'] as const;
  let prev=stateAt(0);
  for(let f=1;f<=RUN_FRAMES;f++){const st=stateAt(f/RUN_FRAMES);for(const k of keys)expect(st[k]).toBeGreaterThanOrEqual(prev[k]);prev=st;}
 });
 it('holds a question that has not been set yet, wherever the run is',()=>{
  expect(stateAt(.5,0).set).toBe(0);
  expect(stateAt(.5,7).set).toBe(7);
 });
 it('prints the same sheet for the same position',()=>{
  expect(renderPress(97)).toEqual(renderPress(97));
  expect(renderPress(-5)).toEqual(renderPress(0));
  expect(renderPress(RUN_FRAMES+5)).toEqual(renderPress(RUN_FRAMES));
 });
});

describe('the sheet',()=>{
 it('prints the three key frames without a missing glyph, in palette inks only',()=>{
  for(const st of Object.values(PRESS_FRAMES)){const px=drawPress(st);expect(px.length).toBe(PW*PH);expect(px.every(c=>c<=3)).toBe(true);}
 });
 it('leaves the right of the question sheet blank until the run begins',()=>{
  expect(inked(drawPress(PRESS_FRAMES.ask),240,10,385,200)).toBe(0);
 });
 it('fills every quarter of the sheet by the answer',()=>{
  const px=drawPress(PRESS_FRAMES.answer);
  for(const [x0,y0] of [[0,0],[PW/2,0],[0,PH/2],[PW/2,PH/2]])expect(inked(px,x0,y0,x0+PW/2,y0+PH/2)).toBeGreaterThan(800);
 });
 it('refuses text it has no letters for, rather than printing a gap',()=>{
  expect(()=>measure('ZØ',SMALL)).toThrow();
  expect(()=>print(new Sheet(10,10),'@',0,0,1)).toThrow();
 });
});

describe('the ending',()=>{
 it('folds, opens and signs off only after the collage is complete',()=>{
  const collage=stateAt(.7);
  expect(collage).toMatchObject({fold:0,fold2:0,slide:0,bloom:0,mark:0,ai:1,steps:5});
  expect(stateAt(1)).toMatchObject({fold:1,fold2:1,slide:1,bloom:1,mark:1});
 });
 it('opens the two ways in only once they are printed',()=>{
  expect(waysInOpen(Math.round(RUN_FRAMES*.9))).toBe(false);
  expect(waysInOpen(RUN_FRAMES)).toBe(true);
 });
 it('lays both ways in on the sheet, side by side, pointing at the product and the write-up',()=>{
  expect(BUTTONS.map(b=>b.href)).toEqual(['https://inktrace.app','https://github.com/JackieNonSense/inktrace-showcase']);
  for(const b of BUTTONS){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.w).toBeLessThanOrEqual(PW);expect(b.y+b.h).toBeLessThan(PH);}
  expect(BUTTONS[0].x+BUTTONS[0].w).toBeLessThan(BUTTONS[1].x);
 });
 it('reprints only the hovered button, and lifts the pages of the mark',()=>{
  const rest=renderPress(RUN_FRAMES),hovered=renderPress(RUN_FRAMES,undefined,'try');
  const b=BUTTONS[1];
  let changedOutside=0;
  for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)if(rest[y*PW+x]!==hovered[y*PW+x])changedOutside++;
  expect(changedOutside).toBe(0);
  expect(rest).not.toEqual(hovered);
 });
 it('centres the mark and its name on the closing sheet',()=>{
  const px=drawPress(PRESS_FRAMES.end);
  expect(inked(px,140,14,260,120)).toBeGreaterThan(2000);
  expect(inked(px,20,20,110,170)).toBeLessThan(40);
 });
});

describe('the performance',()=>{
 it('sets the question letter by letter before the run begins',()=>{
  expect(playhead(0)).toEqual({set:1,frame:0});
  const set=playhead(QUESTION_CHARS*55-1);
  expect(set.frame).toBe(0);
  expect(set.set).toBeGreaterThan(QUESTION_CHARS-3);
 });
 it('plays the whole run once and ends on the mark, with the ways in open',()=>{
  expect(playhead(PLAY_MS)).toEqual({set:QUESTION_CHARS,frame:RUN_FRAMES});
  expect(playhead(PLAY_MS*3)).toEqual({set:QUESTION_CHARS,frame:RUN_FRAMES});
  expect(waysInOpen(playhead(PLAY_MS).frame)).toBe(true);
 });
 it('never runs backwards, and holds on the answer before folding it',()=>{
  let prev=playhead(0).frame;const held=new Map<number,number>();
  for(let ms=0;ms<=PLAY_MS;ms+=STEP_MS){const {frame}=playhead(ms);expect(frame).toBeGreaterThanOrEqual(prev);prev=frame;held.set(frame,(held.get(frame)??0)+1);}
  const answer=Math.round(.72*RUN_FRAMES);
  expect((held.get(answer)??0)*STEP_MS).toBeGreaterThanOrEqual(900);
 });
 it('moves in stop-motion steps, not continuously',()=>{
  expect(playhead(5000)).toEqual(playhead(5000+STEP_MS*.9));
 });
 it('lasts long enough to read, short enough to watch',()=>{
  expect(PLAY_MS).toBeGreaterThan(9000);
  expect(PLAY_MS).toBeLessThan(15000);
 });
});

describe('fitting',()=>{
 it('enlarges by whole numbers where it can, and shrinks only below one to one',()=>{
  expect(fitScale(820,600)).toBe(2);
  expect(fitScale(1300,600)).toBe(2);
  expect(fitScale(1300,900)).toBe(3);
  expect(fitScale(820,300)).toBe(1);
  expect(fitScale(340,900)).toBeCloseTo(.85);
 });

});
