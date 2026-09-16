import {describe,it,expect} from 'vitest';
import {ArchiveRuntime} from '../components/studies/inktrace-living/archive-runtime';
import {actorPoses,aiNode} from '../components/studies/inktrace-living/scene-geometry';
import {EVENTS,PEOPLE} from '../components/studies/inktrace-living/archive-data';
describe('shared story and safe scene coordinates',()=>{
 it('keeps chapter appearances consistent with the six events',()=>{
  expect(EVENTS).toHaveLength(6);
  for(const person of PEOPLE){const appearances=EVENTS.filter(e=>(e.people as readonly string[]).includes(person.id)).map(e=>e.chapter);expect(person.chapters.split(' / ')).toEqual(appearances);}
 });
 it('walking changes both actor position and sprite gait, not just opacity',()=>{
  const state=new ArchiveRuntime().getSnapshot();
  // Sample the gait rather than comparing two instants that can alias one full cycle.
  for(const scene of ['timeline','characters','ai'] as const){const start=scene==='timeline'?11000:1000;const poses=Array.from({length:6},(_,i)=>actorPoses(scene,start+i*100,start+i*100,1000,812,{...state,scene})[0]);expect(new Set(poses.map(p=>`${p.x}:${p.y}`)).size).toBeGreaterThan(1);expect(new Set(poses.map(p=>p.frame)).size).toBeGreaterThan(1);}
 });
 it('places all AI result cards inside the drafting bed at every supported width',()=>{
  for(const [width,height] of [[358,620],[700,872],[1000,812],[1110,812]])for(let row=0;row<3;row++){const node=aiNode(row,16000,width,height);expect(node.x-40).toBeGreaterThan(0);expect(node.x+40).toBeLessThan(width);expect(node.y).toBeGreaterThan(height*.35);expect(node.y+62).toBeLessThan(height*.66);}
 });
 it('turns the selected character instead of always turning Mara',()=>{
  const r=new ArchiveRuntime();r.select('characters');r.person('sen');const poses=actorPoses('characters',14000,0,1000,812,r.getSnapshot());expect(poses[2].frame).toBe(5);expect(poses[0].frame).toBe(0);
 });
});
