import {describe,it,expect,vi} from 'vitest';
import {safeCanvasContext} from '../components/studies/inktrace-living/WikiCanvas';
describe('canvas failure is a local decoration failure',()=>{
 it('accepts unavailable2D without blocking HTML',()=>{
  const canvas=document.createElement('canvas');vi.spyOn(canvas,'getContext').mockReturnValue(null);
  expect(safeCanvasContext(canvas)).toBeNull();
 });
 it('contains a rejected graphics context',()=>{
  const canvas=document.createElement('canvas');vi.spyOn(canvas,'getContext').mockImplementation(()=>{throw new Error('Context denied');});
  expect(safeCanvasContext(canvas)).toBeNull();
 });
});
