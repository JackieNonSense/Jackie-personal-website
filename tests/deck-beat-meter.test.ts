import { expect, it } from 'vitest';
import * as meter from '../components/portfolio/deck-beat-meter';

it('resolves bass transients without the old analyser saturation and heavy smoothing', () => {
  expect(meter.DECK_ANALYSER).toEqual({ fftSize:2048, smoothingTimeConstant:.12, minDecibels:-85, maxDecibels:-12 });
});

it('does not produce activity from silence or missing samples', () => {
  for (const data of [undefined, new Uint8Array(1024)]) {
    const state = meter.advanceDeckMeter(meter.createDeckMeter(), data, 1/30, 'playing', null, false);
    expect(state.levels.every(value => value === 0)).toBe(true);
    expect(state.peaks.every(value => value === 0)).toBe(true);
    expect(state.kick).toBe(0);
  }
});

const bass = (value:number) => { const data = new Uint8Array(1024); data.fill(value,1,9); return data; };

it('attacks on a bass hit within one display frame and falls between hits', () => {
  const hit = meter.advanceDeckMeter(meter.createDeckMeter(), bass(220), 1/30, 'playing', null, false);
  expect(hit.kick).toBeGreaterThan(.65);
  expect(Math.max(...hit.levels)).toBeGreaterThan(6);
  let tail = hit;
  for (let i=0;i<7;i++) tail=meter.advanceDeckMeter(tail,bass(0),1/30,'playing',null,false);
  expect(tail.kick).toBeLessThan(.25);
  expect(Math.max(...tail.levels)).toBeLessThan(Math.max(...hit.levels)*.45);
  const next=meter.advanceDeckMeter(tail,bass(220),1/30,'playing',null,false);
  expect(next.kick).toBeGreaterThan(.65);
});

it('shows a brief peak cap rather than leaving every electrode permanently full', () => {
  const hit=meter.advanceDeckMeter(meter.createDeckMeter(),bass(220),1/30,'playing',null,false);
  const tail=meter.advanceDeckMeter(hit,bass(0),1/30,'playing',null,false);
  expect(Math.max(...tail.peaks)).toBeGreaterThan(Math.max(...tail.levels));
  let silence=tail;
  for(let i=0;i<90;i++)silence=meter.advanceDeckMeter(silence,bass(0),1/30,'playing',null,false);
  expect(Math.max(...silence.peaks)).toBeLessThan(.01);
  expect(Math.max(...silence.levels)).toBeLessThan(.01);
});

it('does not retrigger a held bass tone or invent bass hits from high-frequency percussion', () => {
  let held=meter.createDeckMeter();
  for(let i=0;i<45;i++)held=meter.advanceDeckMeter(held,bass(220),1/30,'playing',null,false);
  expect(held.kick).toBeLessThan(.01);
  expect(Math.max(...held.levels)).toBeLessThan(7);
  const high=new Uint8Array(1024);high.fill(230,150,300);
  const hats=meter.advanceDeckMeter(meter.createDeckMeter(),high,1/30,'playing',null,false);
  expect(hats.kick).toBe(0);
  expect(Math.max(...hats.levels)).toBeGreaterThan(5);
});

it('clears meters for pause, loading, failures and reduced motion; only preserves the outgoing exchange fade', () => {
  const hit=meter.advanceDeckMeter(meter.createDeckMeter(),bass(220),1/30,'playing',null,false);
  for(const status of ['paused','idle','loading','error']) {
    expect(meter.advanceDeckMeter(hit,bass(220),1/30,status,null,false)).toEqual(meter.createDeckMeter());
  }
  expect(meter.advanceDeckMeter(hit,bass(220),1/30,'playing',null,true)).toEqual(meter.createDeckMeter());
  expect(meter.advanceDeckMeter(hit,undefined,1/30,'switching',90,false)).toEqual(hit);
  expect(meter.advanceDeckMeter(hit,undefined,1/30,'switching',180,false)).toEqual(meter.createDeckMeter());
});

it('is deterministic, frame-rate independent and bounded after a background gap', () => {
  const start=meter.createDeckMeter();const hit=meter.advanceDeckMeter(start,bass(220),1/30,'playing',null,false);
  expect(start).toEqual(meter.createDeckMeter());
  expect(meter.advanceDeckMeter(start,bass(220),1/30,'playing',null,false)).toEqual(hit);
  expect(meter.advanceDeckMeter(hit,bass(0),99,'playing',null,false)).toEqual(meter.advanceDeckMeter(hit,bass(0),.05,'playing',null,false));
  expect(meter.advanceDeckMeter(hit,bass(0),0,'playing',null,false)).toEqual(hit);
});
