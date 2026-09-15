import {describe,it,expect} from 'vitest';
import {initialPlayback,playback,beat,durations,type Playback} from '../components/studies/inktrace-pixel/playback';

const tick=(s:Playback,dt:number,active=true)=>playback(s,{type:'tick',dt,active});
const opened=()=>tick(playback(initialPlayback,{type:'open'}),700);
describe('pixel-window playback',()=>{
 it('opens once and starts the first film after 700 ms',()=>{
  const opening=playback(initialPlayback,{type:'open'});
  expect(opening.phase).toBe('opening');
  expect(playback(opening,{type:'open'})).toEqual(opening);
  expect(tick(opening,699).phase).toBe('opening');
  expect(opened()).toMatchObject({phase:'open',scene:0,elapsed:0});
 });
 it('pauses at the exact elapsed time and resumes without restarting',()=>{
  let s=tick(opened(),2400);s=playback(s,{type:'pause'});
  expect(tick(s,9000).elapsed).toBe(2400);
  expect(tick(playback(s,{type:'pause'}),100).elapsed).toBe(2500);
 });
 it('does not advance while offscreen or hidden',()=>{
  const s=tick(opened(),1700);
  expect(tick(s,90000,false)).toEqual(s);
  expect(tick(s,50).elapsed).toBe(1750);
 });
 it('latest scene wins without replaying the shell opening',()=>{
  let s=tick(opened(),5000);
  s=playback(s,{type:'select',scene:1});
  s=playback(s,{type:'select',scene:3});
  expect(s).toMatchObject({phase:'open',scene:3,elapsed:0});
  expect(tick(s,200).scene).toBe(3);
 });
 it('stops each film on its final frame without looping or changing scene',()=>{
  const s=playback(opened(),{type:'select',scene:3});
  const ended=tick(s,90000);
  expect(ended.scene).toBe(3);expect(ended.elapsed).toBe(durations[3]);
  expect(tick(ended,90000)).toEqual(ended);
  expect(playback(ended,{type:'replay'}).elapsed).toBe(0);
 });
 it('closing cancels playback; reopening starts with Timeline',()=>{
  const s=playback(playback(opened(),{type:'select',scene:2}),{type:'close'});
  expect(s.phase).toBe('closing');
  const closed=tick(s,350);
  expect(closed.phase).toBe('closed');
  expect(tick(closed,14000)).toEqual(closed);
  expect(playback(closed,{type:'open'})).toMatchObject({scene:0,elapsed:0});
 });
 it('still mode opens instantly and permits explicit static keyframes',()=>{
  let s=playback(initialPlayback,{type:'still',value:true});
  s=playback(s,{type:'open'});
  expect(s.phase).toBe('open');expect(tick(s,8000)).toEqual(s);
  s=playback(s,{type:'step'});expect(beat(s)).toBe(1);
  for(let i=0;i<8;i++)s=playback(s,{type:'step'});
  expect(beat(s)).toBe(3);
  expect(playback(s,{type:'close'}).phase).toBe('closed');
 });
 it('global still overrides local replay and mid-opening motion',()=>{
  let s=playback(initialPlayback,{type:'open'});
  s=playback(s,{type:'still',value:true});expect(s.phase).toBe('open');
  s=playback(s,{type:'replay'});expect(tick(s,5000).elapsed).toBe(0);
 });
 it('rejects negative time and preserves paused state when becoming visible',()=>{
  const s=playback(tick(opened(),1000),{type:'pause'});
  expect(tick(s,-100)).toEqual(s);expect(tick(s,100,false)).toEqual(s);
 });
});
