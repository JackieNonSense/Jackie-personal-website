import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('uses a convex glass surface with a seated perimeter and continuous texture coordinates', async () => {
  const path = resolve('components/portfolio/monitor-crt-optics.ts');
  expect(existsSync(path)).toBe(true);
  const { createCrtGlass } = await import(/* @vite-ignore */ path);
  const g = createCrtGlass();
  const p = g.getAttribute('position'), uv = g.getAttribute('uv');
  const depths = Array.from({ length:p.count },(_,i)=>p.getZ(i));
  expect(Math.max(...depths)-Math.min(...depths)).toBeGreaterThan(.08);
  for(let i=0;i<uv.count;i++){
    expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
    expect(uv.getX(i)).toBeLessThanOrEqual(1);
  }
  g.dispose();
});

it('separates a crisp phosphor core from two bounded halo scales and legible scanlines', async () => {
  const path=resolve('components/portfolio/monitor-crt-optics.ts');
  const { CRT_PHOSPHOR }=await import(/* @vite-ignore */ path);
  expect(CRT_PHOSPHOR).toBeDefined();
  expect(CRT_PHOSPHOR.scanDepth).toBeGreaterThanOrEqual(.2);
  expect(CRT_PHOSPHOR.scanDepth).toBeLessThanOrEqual(.3);
  expect(CRT_PHOSPHOR.core).toBeGreaterThan(.9);
  expect(CRT_PHOSPHOR.nearHalo).toBeGreaterThan(CRT_PHOSPHOR.farHalo);
  expect(CRT_PHOSPHOR.farRadius).toBeGreaterThan(CRT_PHOSPHOR.nearRadius);
});
