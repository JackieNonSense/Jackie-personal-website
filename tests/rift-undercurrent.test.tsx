import { existsSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import SignalRift from '../components/portfolio/SignalRift';
async function model() {
  expect(existsSync('components/portfolio/rift-undercurrent.ts')).toBe(true);
  const path='../components/portfolio/rift-undercurrent';
  return import(/* @vite-ignore */ path);
}
it('opens only near the pointer and shares asymmetric displacements for all layers', async()=>{
  const {riftOffset}=await model();
  expect(riftOffset(500,500,320,1)).toEqual({upper:-16,lower:10});
  expect(riftOffset(660,500,320,1)).toEqual({upper:0,lower:0});
  expect(riftOffset(0,500,320,1)).toEqual({upper:0,lower:0});
  expect(riftOffset(520,500,320,0)).toEqual({upper:0,lower:0});
});
it('keeps the aperture inside its local support with a continuous feather',async()=>{
  const {riftOffset,stepRift}=await model();
  expect(Math.abs(riftOffset(659,500,320,1).upper)).toBeLessThan(.01);
  expect(stepRift(0,1,5,false)).toBeLessThan(.6);
  expect(stepRift(0,1,.016,true)).toBe(1);
});
it('uses stable irregular groups rather than uniform seven-symbol columns',async()=>{
  const {riftSymbols}=await model();const a=riftSymbols(1440);
  expect(a).toEqual(riftSymbols(1440));expect(a.length).toBeLessThan(100);
  expect(new Set(a.map((g:{text:string})=>g.text.length)).size).toBeGreaterThan(1);
});
it('supports pin, second-click close and Escape with a truthful prompt',()=>{
  render(<SignalRift paused reducedMotion/>);const button=screen.getByRole('button',{name:'探索裂隙'});
  expect(screen.getAllByText('EXPLORE THE RIFT').length).toBeGreaterThan(0);
  fireEvent.click(button);expect(button).toHaveAttribute('aria-pressed','true');
  fireEvent.click(button);expect(button).toHaveAttribute('aria-pressed','false');
  fireEvent.click(button);fireEvent.keyDown(window,{key:'Escape'});expect(button).toHaveAttribute('aria-pressed','false');
});
it('keeps a static paper surface when the material cannot load',()=>{
  const {container}=render(<SignalRift paused reducedMotion/>);
  fireEvent.error(container.querySelector('[data-rift-bed] img')!);
  expect(screen.getByTestId('rift-paper-fallback')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'探索裂隙'})).toBeEnabled();
});
