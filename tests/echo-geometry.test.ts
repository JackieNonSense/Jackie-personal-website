import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Texture, Vector3 } from 'three';

// R3F places fallback inside the DOM canvas even when WebGL is available.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ fallback }: { fallback: ReactNode }) => createElement('canvas', null, fallback),
  useFrame: vi.fn(), useThree: vi.fn(),
}));
vi.mock('@react-three/drei', () => ({ RoundedBox: () => null }));
vi.mock('@react-three/postprocessing', () => ({ Bloom: () => null, EffectComposer: () => null }));

async function geometryModule() {
  const path = resolve('components/terminal/echo-geometry.ts');
  expect(existsSync(path), 'ECHO geometry implementation exists').toBe(true);
  return import(/* @vite-ignore */ path);
}

describe('reference-shaped ECHO machine', () => {
  it('does not report WebGL failure merely because the browser mounted canvas fallback children', async () => {
    const { default: EchoMachine } = await import('../components/terminal/EchoMachine');
    const onFailure = vi.fn(), texture = new Texture();
    const view = render(createElement(EchoMachine, {
      texture, awake: true, focused: false, still: true, phase: 0,
      onPointer: vi.fn(), onWheel: vi.fn(), onReady: vi.fn(), onFailure, onPower: vi.fn(),
    }));
    expect(view.container.querySelector('canvas')).not.toBeNull();
    expect(onFailure).not.toHaveBeenCalled();
    view.unmount(); texture.dispose();
  });
  it('keeps the display opening transparent to picking while the chassis catches edge rays', async () => {
    const { chassisGeometry } = await geometryModule();
    const geometry = chassisGeometry();
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    const ray = (x: number, y: number) => new Raycaster(new Vector3(x, y, 4), new Vector3(0, 0, -1));
    expect(ray(0, .25).intersectObject(mesh)).toHaveLength(0);
    expect(ray(2.55, .25).intersectObject(mesh).length).toBeGreaterThan(0);
    expect(ray(0, -1.27).intersectObject(mesh).length).toBeGreaterThan(0);
    geometry.dispose(); material.dispose();
  });

  it('uses a convex 1.6:1 screen with forward normals and consistent UV picking', async () => {
    const { glassGeometry } = await geometryModule();
    const geometry = glassGeometry();
    geometry.computeBoundingBox();
    const dimensions = geometry.boundingBox!.getSize(new Vector3());
    expect(dimensions.x / dimensions.y).toBeCloseTo(1.6, 2);
    const p = geometry.attributes.position, n = geometry.attributes.normal;
    const z = Array.from({ length: p.count }, (_, i) => p.getZ(i));
    expect(Math.max(...z) - Math.min(...z)).toBeGreaterThan(.035);
    expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
    expect(Array.from({ length: n.count }, (_, i) => n.getZ(i)).every(value => value > .9)).toBe(true);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material); mesh.updateMatrixWorld();
    const hit = new Raycaster(new Vector3(0, 0, 4), new Vector3(0, 0, -1)).intersectObject(mesh)[0];
    expect(hit.uv!.x).toBeCloseTo(.5, 3); expect(hit.uv!.y).toBeCloseTo(.5, 3);
    geometry.dispose(); material.dispose();
  });

  it('frames the complete machine on portrait and landscape displays and zooms into the screen', async () => {
    const { machineZoom, MACHINE } = await geometryModule();
    for (const [width, height] of [[384, 600], [1440, 760], [1920, 1080]]) {
      const zoom = machineZoom(width, height, false);
      expect(zoom * MACHINE.width).toBeLessThan(width);
      expect(zoom * MACHINE.height).toBeLessThan(height);
      expect(machineZoom(width, height, true)).toBeGreaterThan(zoom);
    }
  });

  it('enlarges the central workspace for focused phone games while keeping the complete machine in normal view', async () => {
    const { machineZoom, MACHINE } = await geometryModule();
    expect(machineZoom(390, 700, true)).toBeCloseTo(390 / 2.6, 3);
    expect(machineZoom(390, 700, false) * MACHINE.width).toBeLessThan(390);
    expect(machineZoom(1440, 900, true)).toBeCloseTo(Math.min(1440 / 4.14, 900 / 2.8), 3);
  });

  it('builds an inset with no triangles across the glass aperture', async () => {
    const { insetGeometry } = await geometryModule();
    const geometry = insetGeometry();
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const mesh = new Mesh(geometry, material); mesh.updateMatrixWorld();
    expect(new Raycaster(new Vector3(0, .25, 4), new Vector3(0, 0, -1)).intersectObject(mesh)).toHaveLength(0);
    expect(new Raycaster(new Vector3(-2.04, .25, 4), new Vector3(0, 0, -1)).intersectObject(mesh).length).toBeGreaterThan(0);
    geometry.dispose(); material.dispose();
  });
});
