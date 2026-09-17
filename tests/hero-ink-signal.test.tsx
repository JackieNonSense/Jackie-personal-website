import {act,fireEvent, render, screen,waitFor} from '@testing-library/react';
import {describe, expect, it,vi} from 'vitest';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';

const componentPath=resolve('components/studies/hero-ink-signal/HeroInkSignal.tsx');
const runtimePath=resolve('components/studies/hero-ink-signal/signal-runtime.ts');

describe('Hero binary signal: independent proof',()=>{
 it.each([false,true])('has no folded-paper entry, password strip or discovery demo (embedded=%s)',async(embedded)=>{
  const {default:HeroInkSignal}=await import('../components/studies/hero-ink-signal/HeroInkSignal');
  const {container}=render(<HeroInkSignal embedded={embedded} still/>);
  expect(screen.queryByRole('button',{name:'Open hidden paper'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Replay discovery demo'})).not.toBeInTheDocument();
  const stage=container.querySelector('[data-hero-proof]')!;
  fireEvent.click(stage);
  fireEvent.keyDown(stage,{key:'Enter'});
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByText('3c5614')).not.toBeInTheDocument();
  expect(stage).not.toHaveAttribute('data-paper-open');
  expect(container.querySelector('canvas')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'About'})).toBeInTheDocument();
 });
 it('embeds one accessible heading and in-page navigation without a nested main, study controls or duplicate fault',async()=>{
  const {default:HeroInkSignal}=await import('../components/studies/hero-ink-signal/HeroInkSignal');
  const {container}=render(<main><HeroInkSignal embedded still/></main>);
  expect(container.querySelectorAll('main')).toHaveLength(1);
  expect(container.querySelector('section#signal')).toBeInTheDocument();
  expect(screen.getByRole('heading',{level:1,name:'Yuchao Wang'})).toBeInTheDocument();
  for(const name of ['Work','About','Contact']){
   expect(screen.getByRole('link',{name})).toHaveAttribute('href',`#${name.toLowerCase()}`);
  }
  expect(screen.queryByRole('button',{name:'Pause motion'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Replay discovery demo'})).not.toBeInTheDocument();
  expect(container.querySelector('svg')).toBeNull();
  expect(container.querySelector('img')).toHaveAttribute('src','/studies/hero-ink-signal/approved-hero.png');
 expect(container.querySelector('img')).toHaveAttribute('alt','');
 });
 it('retains readable fallback lettering and navigation when the approved artwork cannot load',async()=>{
  const {default:HeroInkSignal}=await import('../components/studies/hero-ink-signal/HeroInkSignal');
  const {container}=render(<HeroInkSignal embedded still/>);
  fireEvent.error(container.querySelector('img')!);
  expect(screen.getByRole('heading',{level:1,name:'Yuchao Wang'})).toHaveAttribute('data-artwork-fallback','true');
  expect(container.querySelector('img')).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:'About'})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Open hidden paper'})).not.toBeInTheDocument();
 });
 it.each([false,true])('starts with a cached image and suspends the actual RAF queue (embedded=%s)',async(embedded)=>{
  const {default:HeroInkSignal}=await import('../components/studies/hero-ink-signal/HeroInkSignal');
  const callbacks=new Map<number,FrameRequestCallback>();let frame=0;
  let onView:IntersectionObserverCallback=()=>{};
  class ControllableIntersectionObserver {
   constructor(callback:IntersectionObserverCallback){onView=callback;}
   observe(){} disconnect(){} unobserve(){} takeRecords(){return [];}
  }
  const originalObserver=globalThis.IntersectionObserver;
  globalThis.IntersectionObserver=ControllableIntersectionObserver as unknown as typeof IntersectionObserver;
  const fakeContext={drawImage:vi.fn(),getImageData:()=>({data:new Uint8ClampedArray(1586*992*4)}),putImageData:vi.fn(),setTransform:vi.fn(),clearRect:vi.fn(),fillText:vi.fn()};
  const mocks=[
   vi.spyOn(window,'matchMedia').mockImplementation(query=>({matches:false,media:query,onchange:null,addListener:()=>{},removeListener:()=>{},addEventListener:()=>{},removeEventListener:()=>{},dispatchEvent:()=>false})),
   vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true),
   vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(1586),
   vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(fakeContext as never),
   vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{callbacks.set(++frame,callback);return frame;}),
   vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{callbacks.delete(id);}),
  ];
  const flush=(time:number)=>act(()=>{const pending=[...callbacks.values()];callbacks.clear();pending.forEach(callback=>callback(time));});
  try{
   const {container,rerender,unmount}=render(<HeroInkSignal embedded={embedded}/>);
   const host=container.querySelector('[data-hero-proof]');
   await waitFor(()=>expect(host).toHaveAttribute('data-time','0'));
   flush(100);flush(116);
   expect(Number(host?.getAttribute('data-time'))).toBeGreaterThan(0);
   if(embedded)rerender(<HeroInkSignal embedded still/>);
   else fireEvent.click(screen.getByRole('button',{name:'Pause motion'}));
   expect(callbacks.size).toBe(0);
   const painted=fakeContext.clearRect.mock.calls.length;
   flush(16000);
   expect(fakeContext.clearRect).toHaveBeenCalledTimes(painted);
   if(embedded)rerender(<HeroInkSignal embedded/>);
   else fireEvent.click(screen.getByRole('button',{name:'Resume motion'}));
   expect(callbacks.size).toBeGreaterThan(0);
   flush(17000);flush(17016);
   expect(Number(host?.getAttribute('data-time'))).toBe(32);
   rerender(<HeroInkSignal embedded={embedded} still/>);
   expect(callbacks.size).toBe(0);
   flush(30000);
   expect(host).toHaveAttribute('data-time','32');
   rerender(<HeroInkSignal embedded={embedded}/>);
   flush(30000);flush(30016);
   expect(host).toHaveAttribute('data-time','48');
   act(()=>onView([{isIntersecting:false} as IntersectionObserverEntry],{} as IntersectionObserver));
   expect(callbacks.size).toBe(0);
   flush(80000);
   act(()=>onView([{isIntersecting:true} as IntersectionObserverEntry],{} as IntersectionObserver));
   flush(81000);flush(81016);
   expect(host).toHaveAttribute('data-time','64');
   unmount();expect(callbacks.size).toBe(0);
  }finally{mocks.reverse().forEach(mock=>mock.mockRestore());globalThis.IntersectionObserver=originalObserver;}
 });
 it('has an independent runtime and accessible study component',()=>{
  expect(existsSync(runtimePath)).toBe(true);
  expect(existsSync(componentPath)).toBe(true);
 });
 it('uses deterministic binary streams moving in opposite directions',async()=>{
  const {streams,glyphAt,streamHead}=await import('../components/studies/hero-ink-signal/signal-runtime');
  expect(streams.length).toBeGreaterThan(10);
  expect(new Set(streams.map(s=>s.direction))).toEqual(new Set([-1,1]));
  for(const stream of streams){
   expect(Math.sign(streamHead(stream,100)-streamHead(stream,0))).toBe(stream.direction);
   for(let index=0;index<40;index++){
    expect(['0','1']).toContain(glyphAt(stream.id,index));
    expect(glyphAt(stream.id,index)).toBe(glyphAt(stream.id,index));
   }
  }
 });
 it('pauses at the current frame, and clamps a background gap without fast forwarding',async()=>{
  const {advanceClock}=await import('../components/studies/hero-ink-signal/signal-runtime');
  expect(advanceClock(1200,16,true)).toBe(1216);
  expect(advanceClock(1200,16000,false)).toBe(1200);
  expect(advanceClock(1200,16000,true)).toBe(1250);
  expect(advanceClock(1200,-30,true)).toBe(1200);
  expect(advanceClock(1200,NaN,true)).toBe(1200);
 });
 it('offers a real pause/resume control and remains silent',async()=>{
  const {default:HeroInkSignal}=await import('../components/studies/hero-ink-signal/HeroInkSignal');
  const {container}=render(<HeroInkSignal still/>);
  fireEvent.click(screen.getByRole('button',{name:'Pause motion'}));
  expect(screen.getByRole('button',{name:'Resume motion'})).toBeVisible();
  expect(container.querySelector('audio,video,iframe')).toBeNull();
  expect(readFileSync(componentPath,'utf8')).not.toMatch(/playSound|AudioContext|new Audio\(/);
 });
});
