import {describe,it,expect} from 'vitest';
import {ArchiveRuntime} from '../components/studies/inktrace-living/archive-runtime';
const advance=(r:ArchiveRuntime,ms:number)=>{for(let i=0;i<ms;i+=20)r.tick(20);};
describe('independent living scenes',()=>{
 it('expands actual timeline hierarchy and preserves visitor takeover',()=>{
  const r=new ArchiveRuntime();r.year(313);expect(r.getSnapshot().year).toBe(313);
  expect(r.getSnapshot().month).toBeNull();r.month('05');expect(r.getSnapshot().month).toBe('05');
  r.event('signal');expect(r.getSnapshot().event).toBe('signal');advance(r,20000);
  expect(r.getSnapshot().mode).toBe('manual');expect(r.getSnapshot().event).toBe('signal');
  r.year(312);expect(r.getSnapshot().event).toBeNull();expect(r.getSnapshot().month).toBeNull();
 });
 it('rejects events and months outside the displayed hierarchy',()=>{
  const r=new ArchiveRuntime();r.year(312);r.month('05');expect(r.getSnapshot().month).toBeNull();
  r.event('return');expect(r.getSnapshot().event).toBeNull();
 });
 it('never creates an AI canvas during autoplay or key stepping',()=>{
  const r=new ArchiveRuntime();r.select('ai');r.confirm();expect(r.getSnapshot().ai).not.toBe('created');
  advance(r,20000);expect(r.getSnapshot().ai).toBe('waiting');expect(r.getFrame().time).toBe(16000);
  advance(r,10000);expect(r.getSnapshot().ai).toBe('waiting');
  r.step(99);expect(r.getSnapshot().ai).toBe('waiting');r.confirm();expect(r.getSnapshot().ai).toBe('archiving');
  advance(r,2400);expect(r.getSnapshot().ai).toBe('created');
 });
 it('quiet confirmation is still explicit but does not require animation to finish',()=>{
  const r=new ArchiveRuntime();r.select('ai');r.step(5);r.confirm(true);expect(r.getSnapshot().ai).toBe('created');
 });
 it('pause, hidden and quiet gates preserve both clocks without catchup',()=>{
  const r=new ArchiveRuntime();advance(r,1200);r.pause(true);const before=r.getFrame();advance(r,500);expect(r.getFrame()).toEqual(before);
  r.pause(false);r.tick(20,false);r.tick(20,true,true);r.tick(4000);expect(r.getFrame()).toEqual(before);
  r.tick(20);expect(r.getFrame().time).toBe(1220);
 });
 it('selecting a character takes control without automatically changing the selection',()=>{
  const r=new ArchiveRuntime();r.select('characters');r.person('sen');advance(r,16000);
  expect(r.getSnapshot().person).toBe('sen');expect(r.getSnapshot().mode).toBe('manual');
  r.replay();expect(r.getSnapshot().person).toBeNull();expect(r.getFrame().time).toBe(0);
 });
 it('rapid scene changes cancel old actions, close stops clocks, open starts timeline',()=>{
  const r=new ArchiveRuntime();r.select('ai');r.step(5);r.confirm();r.select('characters');r.select('timeline');advance(r,2500);
  expect(r.getSnapshot().scene).toBe('timeline');expect(r.getSnapshot().ai).toBe('gathering');
  r.close();const time=r.getFrame().time;advance(r,5000);expect(r.getFrame().time).toBe(time);
  r.open();expect(r.getSnapshot().scene).toBe('timeline');expect(r.getFrame().time).toBe(0);
 });
 it('does not notify React every frame, only at semantic boundaries',()=>{
  const r=new ArchiveRuntime();let n=0;r.subscribe(()=>n++);advance(r,1000);expect(n).toBe(0);
  advance(r,3000);expect(n).toBe(1);
 });
});
