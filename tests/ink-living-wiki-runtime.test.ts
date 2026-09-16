import {describe,it,expect} from 'vitest';
import {WikiRuntime,wikiActorPoses,WIKI_STEPS} from '../components/studies/inktrace-living/wiki-runtime';

const advance=(r:WikiRuntime,ms:number)=>{for(let t=0;t<ms;t+=50)r.tick(Math.min(50,ms-t));};
describe('complete Wiki demonstration clock',()=>{
 it('runs a22second sequence with a readable final3.5second hold',()=>{
  const r=new WikiRuntime();advance(r,5100);
  expect(r.getSnapshot().layout).toBe('right');
  expect(r.getFrame().width).toBeLessThan(100);
  expect(r.getFrame().width).toBeGreaterThan(44);
  advance(r,4400);expect(r.getFrame().width).toBe(44);
  advance(r,3000);expect(r.getSnapshot().quote).toBe('after');
  advance(r,3000);expect(r.getSnapshot().quote).toBe('between');
  advance(r,3000);expect(r.getSnapshot().reference).toBe('mara');
  advance(r,3500);expect(r.getSnapshot().mode).toBe('ended');
  expect(r.getFrame().time).toBe(22000);
  advance(r,3000);expect(r.getFrame().time).toBe(22000);
 });
 it('manual edits permanently stop the demo until explicit replay',()=>{
  const r=new WikiRuntime();advance(r,6000);r.layout('left');
  const stopped=r.getFrame().time;advance(r,18000);
  expect(r.getSnapshot().mode).toBe('manual');expect(r.getSnapshot().layout).toBe('left');
  expect(r.getFrame().time).toBe(stopped);
  r.pause(true);r.pause(false);advance(r,5000);expect(r.getSnapshot().mode).toBe('manual');
  r.replay();expect(r.getFrame().time).toBe(0);expect(r.getSnapshot().mode).toBe('demo');
  expect(r.getSnapshot().reference).toBeNull();expect(r.getSnapshot().quote).toBe('hidden');
 });
 it('freezes both clocks for pause, hidden/offscreen and reduced motion',()=>{
  const r=new WikiRuntime();advance(r,750);const frame=r.getFrame();
  r.pause(true);advance(r,300);expect(r.getFrame()).toEqual(frame);
  r.pause(false);r.tick(50,false);r.tick(50,true,true);expect(r.getFrame()).toEqual(frame);
  r.tick(50);expect(r.getFrame().time).toBe(frame.time+50);
 });
 it('discards nonfinite and suspended deltas instead of suddenly advancing',()=>{
  const r=new WikiRuntime();advance(r,500);const frame=r.getFrame();
  for(const value of [Infinity,NaN,-1,60000])r.tick(value);
  expect(r.getFrame()).toEqual(frame);
 });
 it('notifies React only at semantic changes, not every frame',()=>{
  const r=new WikiRuntime();let notifications=0;const unsubscribe=r.subscribe(()=>notifications++);
  const first=r.getSnapshot();advance(r,2000);
  expect(r.getSnapshot()).toBe(first);expect(notifications).toBe(0);
  advance(r,1000);expect(notifications).toBe(1);
  r.pause(true);expect(notifications).toBe(2);
  unsubscribe();r.pause(false);expect(notifications).toBe(2);
 });
 it('clamps resize; quote order and previews are real persistent choices',()=>{
  const r=new WikiRuntime();r.resize(500);expect(r.getSnapshot().width).toBe(100);
  r.resize(1);expect(r.getSnapshot().width).toBe(28);
  r.quote('before');r.reference('coast');advance(r,30000);
  expect(r.getSnapshot().quote).toBe('before');expect(r.getSnapshot().reference).toBe('coast');
  r.reference(null);expect(r.getSnapshot().reference).toBeNull();
 });
 it('key steps remain available when motion is held; closing cancels the old sequence',()=>{
  const r=new WikiRuntime();r.step(6);expect(r.getFrame().time).toBe(WIKI_STEPS[6]);
  expect(r.getSnapshot().reference).toBe('mara');expect(r.getSnapshot().mode).toBe('manual');
  r.close();advance(r,30000);expect(r.getSnapshot().open).toBe(false);
  r.open();expect(r.getSnapshot().step).toBe(0);expect(r.getFrame().time).toBe(0);
 });
});
describe('Wiki cast routes',()=>{
 it('changes actual gait and position with independent schedules',()=>{
  const a=wikiActorPoses(600,600,900,620),b=wikiActorPoses(800,800,900,620);
  expect(a).toHaveLength(3);expect(a[0].x).not.toBe(b[0].x);expect(a[0].frame).not.toBe(b[0].frame);
  expect(a[0].frame).not.toBe(a[1].frame);
 });
 it('never puts actors onto the editable manuscript, including mobile',()=>{
  for(const width of [350,720,1080])for(let t=0;t<=24000;t+=137){
   const actors=wikiActorPoses(t,t,width,760);
   expect(actors).toHaveLength(3);
   for(const actor of actors){expect(actor.x).toBeGreaterThanOrEqual(0);expect(actor.x+64).toBeLessThanOrEqual(width);expect(actor.y).toBeGreaterThanOrEqual(760);expect(Number.isInteger(actor.x)).toBe(true);expect(actor.frame).toBeGreaterThanOrEqual(0);expect(actor.frame).toBeLessThan(8);}
  }
 });
});
