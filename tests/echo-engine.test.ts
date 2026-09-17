import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function engine() {
  const file = resolve('components/terminal/echo-engine.ts');
  expect(existsSync(file), 'ECHO investigation engine exists').toBe(true);
  return import(/* @vite-ignore */ file);
}

async function recovered() {
  const e = await engine();
  let s = e.reduceEcho(e.initialEcho(), { type: 'wake' });
  for (const id of ['m04', 'f01']) s = e.reduceEcho(s, { type: 'open', id });
  for (const target of ['lab7','03:47','03:48']) s = e.reduceEcho(s, { type: 'inspect', target });
  s = e.reduceEcho(s, { type: 'correlate' });
  expect(s.stage).toBe(1);
  for (const [field, value] of Object.entries(e.SIGNAL_TARGET)) s = e.reduceEcho(s, { type: 'tune', field, value });
  s = e.reduceEcho(s, { type: 'recover' });
  expect(s.stage).toBe(2);
  return { e, s };
}

describe('ECHO investigation', () => {
  it('gates recovery, restricted records and the old password behind investigation', async () => {
    const e = await engine(); let s = e.reduceEcho(e.initialEcho(), { type: 'wake' });
    for (const action of [{type:'recover'},{type:'unlock',password:'3c5614'},{type:'correlate'},{type:'verify-link'},{type:'confirm-ending'}]) {
      s=e.reduceEcho(s,action); expect(s.stage).toBe(0); expect(s.ending).toBe(null);
    }
    s=e.reduceEcho(s,{type:'open',id:'f03'}); expect(s.openId).toBe(null); expect(s.readIds).not.toContain('f03');
  });
  it('preserves the open record while reading, scrolling and collecting evidence', async () => {
    const e = await engine(); let s=e.reduceEcho(e.initialEcho(),{type:'wake'});
    s=e.reduceEcho(s,{type:'open',id:'m04'});
    s=e.reduceEcho(s,{type:'scroll',delta:3}); expect(s.openId).toBe('m04'); expect(s.scroll).toBe(3);
    s=e.reduceEcho(s,{type:'back'}); expect(s.openId).toBe(null); expect(s.evidence).toContain('incident');
  });
  it('requires investigation of both log events even after the mail and map are understood',async()=>{
    const e=await engine();let s=e.reduceEcho(e.initialEcho(),{type:'wake'});
    for(const id of ['m04','f01'])s=e.reduceEcho(s,{type:'open',id});s=e.reduceEcho(s,{type:'inspect',target:'lab7'});
    s=e.reduceEcho(s,{type:'correlate'});expect(s.stage).toBe(0);
    s=e.reduceEcho(s,{type:'inspect',target:'03:47'});s=e.reduceEcho(s,{type:'correlate'});expect(s.stage).toBe(0);
    s=e.reduceEcho(s,{type:'inspect',target:'03:48'});s=e.reduceEcho(s,{type:'correlate'});expect(s.stage).toBe(1);
  });
  it('recovers locally after failed tuning and keeps collected evidence', async () => {
    const {e}=await recovered(); let s=e.reduceEcho(e.initialEcho(),{type:'wake'});
    for(const id of ['m04','f01'])s=e.reduceEcho(s,{type:'open',id});
    for(const target of ['lab7','03:47','03:48'])s=e.reduceEcho(s,{type:'inspect',target});s=e.reduceEcho(s,{type:'correlate'});
    s=e.reduceEcho(s,{type:'recover'});expect(s.fault).not.toBe(null);
    const evidence=[...s.evidence];s=e.reduceEcho(s,{type:'reset-module'});expect(s.fault).toBe(null);expect(s.evidence).toEqual(evidence);
    s=e.reduceEcho(s,{type:'unlock',password:'wrong'});expect(s.stage).toBe(1);
    s=e.reduceEcho(s,{type:'unlock',password:'3c5614'});expect(s.stage).toBe(1);
    for(const [field,value]of Object.entries(e.SIGNAL_TARGET))s=e.reduceEcho(s,{type:'tune',field,value});s=e.reduceEcho(s,{type:'recover'});s=e.reduceEcho(s,{type:'unlock',password:'3c5614'});expect(s.stage).toBe(2);expect(s.evidence).toContain('clearance');
  });
  it.each(['isolate','restore'])('requires a connected path and confirmation for the %s ending',async destination=>{
    const {e,s:base}=await recovered();let s=base;
    s=e.reduceEcho(s,{type:'verify-link'});expect(s.pendingEnding).toBe(false);
    const rotations=[0,1,2,3,1,2,2,1,0];
    for(let index=0;index<9;index++)for(let n=0;n<rotations[index];n++)s=e.reduceEcho(s,{type:'rotate',index});
    expect(e.linkConnected(s)).toBe(true);
    s=e.reduceEcho(s,{type:'destination',value:destination});s=e.reduceEcho(s,{type:'verify-link'});
    expect(s.pendingEnding).toBe(true);expect(s.ending).toBe(null);
    const cancelled=e.reduceEcho(s,{type:'cancel-ending'});expect(cancelled.ending).toBe(null);expect(cancelled.pendingEnding).toBe(false);
    s=e.reduceEcho(s,{type:'confirm-ending'});expect(s.ending).toBe(destination);expect(s.stage).toBe(3);
    expect(s.page).toBe('overview');expect(s.openId).toBe(null);expect(s.scroll).toBe(0);
    expect(e.restoreEcho(e.serializeEcho(s)).ending).toBe(destination);
  });
  it('invalidates a pending decision when wiring or destination changes',async()=>{
    const {e,s:base}=await recovered();let s=base;
    for(const [index,n]of [0,1,2,3,1,2,2,1,0].entries())for(let i=0;i<n;i++)s=e.reduceEcho(s,{type:'rotate',index});
    s=e.reduceEcho(s,{type:'verify-link'});s=e.reduceEcho(s,{type:'rotate',index:0});
    expect(s.pendingEnding).toBe(false);expect(e.reduceEcho(s,{type:'confirm-ending'}).ending).toBe(null);
  });
  it('parses documented commands to the same actions as controls and rejects unknown input',async()=>{
    const {e,s}=await recovered();
    expect(e.parseCommand(' tune frequency 147 ',s)).toEqual({type:'tune',field:'frequency',value:147});
    expect(e.parseCommand('open f03',s)).toEqual({type:'open',id:'f03'});
    expect(e.parseCommand('rotate 2',s)).toEqual({type:'rotate',index:1});
    expect(e.parseCommand('destination restore',s)).toEqual({type:'destination',value:'restore'});
    expect(e.parseCommand('unlock classified.doc 3c5614',s)).toEqual({type:'unlock',password:'3c5614'});
    expect(e.parseCommand('unlock 3c5614',s)).toEqual({type:'unlock',password:'3c5614'});
    const next=e.reduceEcho(s,e.parseCommand('sudo delete everything',s));expect(next.feedback).toMatch(/unknown command/i);expect(next.stage).toBe(2);
    const invalid=e.reduceEcho(s,e.parseCommand('tune phase NaN',s));expect(invalid.frequency).toBe(s.frequency);expect(invalid.feedback).toMatch(/number|usage/i);
  });
  it('rejects malformed and inconsistent saves without a crash or invented progress',async()=>{
    const {e,s}=await recovered();
    for(const raw of ['{','null','[]','{}',JSON.stringify({version:1,state:{...s,stage:99}}),JSON.stringify({version:1,state:{...s,rotations:[NaN]}}),JSON.stringify({version:1,state:{...s,evidence:['invented']}})]){
      expect(e.restoreEcho(raw).stage).toBe(0);
    }
    const restored=e.restoreEcho(e.serializeEcho(s));expect(restored.stage).toBe(2);expect(restored.evidence).toEqual(s.evidence);expect(restored.pendingEnding).toBe(false);
  });
  it('supplies finite hints, keeps records accessible after endings and starts a clean replay',async()=>{
    const {e,s}=await recovered();let current=s;
    for(let n=0;n<9;n++)current=e.reduceEcho(current,{type:'hint'});
    expect(current.hintLevel).toBeLessThanOrEqual(3);expect(e.hints(current).length).toBeGreaterThan(0);expect(e.objective(current)).toMatch(/route|link/i);
    expect(e.reduceEcho(current,{type:'new-game'})).toEqual(e.initialEcho());
  });
  it('rejects saves whose clearance or ending contradicts their investigation stage',async()=>{
    const {e,s}=await recovered();
    const premature={...s,stage:1,evidence:s.evidence.filter((id:string)=>id!=='recovered').concat('clearance')};
    const committed={...s,evidence:[...s.evidence,'committed']};
    const wrongDestination={...s,stage:3,ending:'restore',destination:'isolate',rotations:[...e.LINK_SOLUTION],evidence:[...s.evidence,'committed']};
    for(const state of [premature,committed,wrongDestination])expect(e.restoreEcho(JSON.stringify({version:1,state})).stage).toBe(0);
  });
});

describe('ECHO authored archive',()=>{
  it('contains the agreed archive and complete rectangular art',async()=>{
    const file=resolve('components/terminal/echo-content.ts');expect(existsSync(file),'ECHO content exists').toBe(true);
    const {records,logs,art}=await import(/* @vite-ignore */ file);
    expect(records.filter((r:{kind:string})=>r.kind==='mail')).toHaveLength(12);
    expect(records.filter((r:{kind:string})=>r.kind==='file')).toHaveLength(8);expect(logs).toHaveLength(36);
    expect(new Set(records.map((r:{id:string})=>r.id)).size).toBe(20);
    for(const picture of Object.values(art) as string[][]){expect(picture.length).toBeGreaterThan(2);expect(new Set(picture.map(row=>row.length)).size).toBe(1);}
    const words=records.flatMap((r:{body:string[]})=>r.body).join(' ').split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(1800);expect(words).toBeLessThanOrEqual(2200);
  });
});
