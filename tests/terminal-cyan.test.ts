import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Raycaster, Vector3, Mesh, MeshBasicMaterial, DoubleSide } from 'three';

async function implementation(name: string) {
  const path = resolve(`components/terminal/${name}.ts`);
  expect(existsSync(path), `${name} implementation exists`).toBe(true);
  return import(/* @vite-ignore */ path);
}

describe('cyan terminal interaction', () => {
  it('opens a selected mail, marks it read, and returns to the same inbox row', async () => {
    const { initialSession, transition } = await implementation('terminal-session');
    let state = initialSession();
    state = transition(state, { type: 'wake' });
    state = transition(state, { type: 'select', index: 2 });
    state = transition(state, { type: 'open' });
    expect(state.view).toBe('mail-read');
    expect(state.selected).toBe(2);
    expect(state.readIds).toContain(3);
    state = transition(state, { type: 'back' });
    expect(state.view).toBe('mail');
    expect(state.selected).toBe(2);
  });
  it('keeps encrypted files locked and clamps list navigation', async () => {
    const { initialSession, transition, contentFor } = await implementation('terminal-session');
    let state = transition(initialSession(), { type: 'wake' });
    state = transition(state, { type: 'navigate', view: 'files' });
    state = transition(state, { type: 'select', index: 99 });
    expect(state.selected).toBe(2);
    state = transition(state, { type: 'open' });
    expect(contentFor(state).body.join(' ')).toContain('ACCESS DENIED');
    state = transition(state, { type: 'sleep' });
    expect(state.awake).toBe(false);
  });
});
describe('physical terminal composition', () => {
  it('leaves an actual opening through the housing and catches rays on the frame', async () => {
    const { housingGeometry } = await implementation('terminal-geometry');
    const geometry = housingGeometry();
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
    mesh.updateMatrixWorld();
    const center = new Raycaster(new Vector3(0, .16, 4), new Vector3(0, 0, -1));
    const edge = new Raycaster(new Vector3(2.2, 0, 4), new Vector3(0, 0, -1));
    expect(center.intersectObject(mesh)).toHaveLength(0);
    expect(edge.intersectObject(mesh).length).toBeGreaterThan(0);
    geometry.dispose();
  });
  it('keeps the glass convex with finite normals and frames the entire device on narrow displays', async () => {
    const { screenGeometry, cameraZoom } = await implementation('terminal-geometry');
    const geometry = screenGeometry();
    const p = geometry.attributes.position;
    let middle = -Infinity, corner = Infinity;
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(p.getX(i)) < .05 && Math.abs(p.getY(i)) < .05) middle = Math.max(middle, p.getZ(i));
      if (Math.abs(p.getX(i)) > 1.6 && Math.abs(p.getY(i)) > 1) corner = Math.min(corner, p.getZ(i));
    }
    expect(middle - corner).toBeGreaterThan(.035);
    expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    const zoom = cameraZoom(390, 600, false);
    expect(zoom * 4.8).toBeLessThan(390);
    expect(cameraZoom(1440, 760, true)).toBeGreaterThan(cameraZoom(1440, 760, false));
    geometry.dispose();
  });
});
