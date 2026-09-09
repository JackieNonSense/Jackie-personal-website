import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
async function api(){const file=resolve('components/portfolio/deck-interaction.ts');expect(existsSync(file),'shared tested rotary and mechanical logic exists').toBe(true);return import(file);}
describe('A deck physical controls',()=>{
  it('distinguishes a short press from a drag and clamps a 150px volume travel',async()=>{
    const {rotaryGesture}=await api();
    expect(rotaryGesture(.25,2,2)).toEqual({dragged:false,volume:.25});
    expect(rotaryGesture(.25,75,0)).toEqual({dragged:true,volume:.75});
    expect(rotaryGesture(.25,0,-150)).toEqual({dragged:true,volume:1});
    expect(rotaryGesture(.25,-150,0)).toEqual({dragged:true,volume:0});
  });
  it('opens the whole face before exchanging the disc and closes before playback',async()=>{
    const {transportPose}=await api();
    expect(transportPose(0)).toMatchObject({angle:0,discVisible:false});
    expect(transportPose(450)).toMatchObject({angle:28,discTravel:0,discVisible:true});
    expect(transportPose(630)).toMatchObject({angle:28,discTravel:1,discVisible:false});
    expect(transportPose(850)).toMatchObject({angle:28,discTravel:0,discVisible:true});
    expect(transportPose(1050)).toMatchObject({angle:0,discVisible:false});
    expect(transportPose(500,true)).toMatchObject({angle:0,discVisible:false});
  });
  it('cannot invent spectrum activity from silence',async()=>{
    const {spectrumBands}=await api();
    expect(spectrumBands(undefined)).toEqual(Array(32).fill(0));
    expect(spectrumBands(new Uint8Array(128))).toEqual(Array(32).fill(0));
    expect(spectrumBands(new Uint8Array(128).fill(255))).toEqual(Array(32).fill(9));
  });
});
