import {readFileSync,existsSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
const base='app/reference/production/cd-deck-v07-wide-study';
function report(){expect(existsSync(`${base}/mechanism.json`),'Blender must evaluate and export the proposed mechanism').toBe(true);return JSON.parse(readFileSync(`${base}/mechanism.json`,'utf8'));}
describe('wide display Blender mechanism study',()=>{
 it('extends the carriage before rotating and keeps the panel clear of the body',()=>{
  const r=report();expect(r.samples.length).toBeGreaterThan(60);
  for(const s of r.samples){if(s.angle>1)expect(s.extension).toBeCloseTo(1.4,4);expect(s.panelMinZ).toBeGreaterThan(.2);}
  expect(r.samples.at(-1).angle).toBeCloseTo(108,2);
 });
 it('replaces the rotary with a linear control and makes the screen dominant',()=>{
  const r=report();expect(r.screen.width/r.front.width).toBeGreaterThan(.75);
  expect(r.screen.height/r.front.height).toBeGreaterThan(.60);
  expect(r.nodes).toContain('VolumeFader');expect(r.nodes).not.toContain('VolumePivot');
 });
 it('exports a genuine animated GLB with separate translation and hinge rotation',()=>{
  report();const buf=readFileSync(`${base}/wide-display-study.glb`);
  const g=JSON.parse(buf.subarray(20,20+buf.readUInt32LE(12)).toString('utf8'));
  const targets=g.animations.flatMap((a:{channels:{target:{node:number;path:string}}[]})=>a.channels.map(c=>`${g.nodes[c.target.node].name}:${c.target.path}`));
  expect(targets).toContain('PanelCarriage:translation');expect(targets).toContain('PanelHinge:rotation');
 });
});
