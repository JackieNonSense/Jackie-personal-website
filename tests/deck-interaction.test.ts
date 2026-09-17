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
  it('snaps a key down under the finger and lets it return more slowly',async()=>{
    const {keyResponse}=await api();
    const rest={press:0,glow:0};
    const down=keyResponse(rest,true,true,1/60,false);
    expect(down.press).toBeGreaterThan(.55);
    const seated=keyResponse(down,true,true,1/60,false);
    expect(seated.press).toBeGreaterThan(down.press);
    // The release is the slower half: one frame off the finger must not undo one frame on it.
    const lifted=keyResponse(down,false,true,1/60,false);
    expect(lifted.press).toBeGreaterThan(1-down.press);
    expect(lifted.press).toBeLessThan(down.press);
    // Attention fades rather than snapping, unlike the old hard emissive switch.
    expect(down.glow).toBeGreaterThan(0);expect(down.glow).toBeLessThan(.95);
  });
  it('holds a static pose under reduced motion and stays a bounded pure function',async()=>{
    const {keyResponse}=await api();
    expect(keyResponse({press:0,glow:0},true,true,1/60,true)).toEqual({press:1,glow:1});
    expect(keyResponse({press:1,glow:1},false,false,1/60,true)).toEqual({press:0,glow:0});
    const previous={press:.4,glow:.4};
    const next=keyResponse(previous,true,true,99,false);
    expect(previous).toEqual({press:.4,glow:.4});
    expect(next).toEqual(keyResponse({press:.4,glow:.4},true,true,.05,false));
    expect(keyResponse(previous,true,true,0,false)).toEqual(previous);
    for(const value of [next.press,next.glow]){expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);}
  });
  it('cannot invent spectrum activity from silence',async()=>{
    const {spectrumBands}=await api();
    expect(spectrumBands(undefined)).toEqual(Array(32).fill(0));
    expect(spectrumBands(new Uint8Array(128))).toEqual(Array(32).fill(0));
    expect(spectrumBands(new Uint8Array(128).fill(255))).toEqual(Array(32).fill(9));
  });
});
