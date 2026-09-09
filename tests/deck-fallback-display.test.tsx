import {existsSync} from 'node:fs';
import {createElement} from 'react';
import {render} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {MusicSnapshot} from '../components/portfolio/music-controller';
import {drawVfd} from '../components/portfolio/deck-vfd';
import {musicTracks} from '../components/portfolio/music-tracks';
import panel from '../components/portfolio/deck-panel.json';

// The canvas painter is the rendering boundary, not the component under test.
vi.mock('../components/portfolio/deck-vfd',()=>({drawVfd:vi.fn()}));
const painter=vi.mocked(drawVfd);
const initial:MusicSnapshot={powered:true,status:'playing',track:0,volume:.25,muted:false,wantsPlaying:true,phase:'seated',time:0,error:'',exchangeStartedAt:null};
async function component(){
  expect(existsSync('components/portfolio/DeckFallbackDisplay.tsx'),'state-driven fallback screen exists').toBe(true);
  const path='../components/portfolio/DeckFallbackDisplay';
  return (await import(/* @vite-ignore */ path)).default;
}
beforeEach(()=>painter.mockClear());
afterEach(()=>vi.restoreAllMocks());

it('draws the selected second track and current elapsed time instead of the poster contents',async()=>{
  const Display=await component();render(createElement(Display,{state:{...initial,track:1,time:86.3}}));
  expect(painter).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement),expect.objectContaining({title:musicTracks[1].title,track:2,time:86.3,status:'playing'}));
});

it('redraws pause and volume updates from the shared player snapshot',async()=>{
  const Display=await component();const {rerender}=render(createElement(Display,{state:initial}));
  rerender(createElement(Display,{state:{...initial,status:'paused',wantsPlaying:false,volume:.73,time:21}}));
  expect(painter).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement),expect.objectContaining({status:'paused',volume:.73,time:21}));
});

it('uses static motion and zero spectrum without starting audio or a frame loop',async()=>{
  const Display=await component(),audio=vi.spyOn(window,'Audio'),raf=vi.spyOn(window,'requestAnimationFrame');
  const {container}=render(createElement(Display,{state:initial}));
  const state=painter.mock.lastCall![1];
  expect(state.levels).toEqual(Array(32).fill(0));
  expect(state.motion).toEqual({reveal:1,levelGain:1,titleAlpha:1,titleOffset:0,needsFrame:false});
  expect(audio).not.toHaveBeenCalled();expect(raf).not.toHaveBeenCalled();
  expect(container.querySelector('audio')).toBeNull();
});

it('has no screen or draw call while powered off',async()=>{
  const Display=await component();const {container}=render(createElement(Display,{state:{...initial,powered:false}}));
  expect(container.firstChild).toBeNull();expect(painter).not.toHaveBeenCalled();
});

it('covers only the projected glass using a crisp inaccessible-to-pointer canvas',async()=>{
  const Display=await component();const {container}=render(createElement(Display,{state:initial}));
  const canvas=container.querySelector('canvas')!;
  expect(canvas).toHaveAttribute('width','2048');expect(canvas).toHaveAttribute('height','832');
  expect(canvas).toHaveAttribute('aria-hidden','true');
  expect(canvas.style.position).toBe('absolute');expect(canvas.style.pointerEvents).toBe('none');expect(canvas.style.zIndex).toBe('1');
  expect(parseFloat(canvas.style.left)).toBeCloseTo((.5+(panel.screenX-7.2)/panel.stage.width)*100);
  expect(parseFloat(canvas.style.top)).toBeCloseTo((.5-((.65+2.93)-panel.stage.cameraY)/panel.stage.height)*100);
  expect(parseFloat(canvas.style.width)).toBeCloseTo(14.4/panel.stage.width*100);
  expect(parseFloat(canvas.style.height)).toBeCloseTo(5.86/panel.stage.height*100);
});

it('does not turn an audio failure or pending load into a fake PLAY state',async()=>{
  const Display=await component();const {rerender}=render(createElement(Display,{state:{...initial,status:'loading'}}));
  expect(painter.mock.lastCall![1].status).toBe('loading');
  rerender(createElement(Display,{state:{...initial,status:'error',wantsPlaying:false,error:'Audio unavailable'}}));
  expect(painter.mock.lastCall![1].status).toBe('error');
});
