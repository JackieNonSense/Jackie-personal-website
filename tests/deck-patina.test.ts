import {existsSync} from 'node:fs';
import {expect,it} from 'vitest';

type Maps={width:number;height:number;surface:Uint8Array;roughness:Uint8Array};
async function generate(width=128,height=64,seed=74):Promise<Maps>{
  expect(existsSync('components/portfolio/deck-patina.ts'),'procedural material generator exists').toBe(true);
  const modulePath='../components/portfolio/deck-patina';
  const {createDeckPatina}=await import(/* @vite-ignore */ modulePath);
  return createDeckPatina(width,height,seed);
}

it('returns tightly packed rectangular RGBA maps of the requested size',async()=>{
  const maps=await generate(128,64);
  expect(maps.width).toBe(128);expect(maps.height).toBe(64);
  expect(maps.surface).toBeInstanceOf(Uint8Array);expect(maps.roughness).toBeInstanceOf(Uint8Array);
  expect(maps.surface.length).toBe(128*64*4);expect(maps.roughness.length).toBe(128*64*4);
});

it('reproduces both material channels for the same seed',async()=>{
  const a=await generate(64,64,17),b=await generate(64,64,17);
  expect(a.surface).toEqual(b.surface);expect(a.roughness).toEqual(b.roughness);
});

it('changes the irregular material pattern for a different seed',async()=>{
  const a=await generate(64,64,17),b=await generate(64,64,18);
  expect(a.surface).not.toEqual(b.surface);expect(a.roughness).not.toEqual(b.roughness);
});

it('keeps opaque neutral maps within restrained multiplication and roughness ranges',async()=>{
  const maps=await generate();
  for(const [bytes,minimum,maximum] of [[maps.surface,179,255],[maps.roughness,102,217]] as const){
    for(let i=0;i<bytes.length;i+=4){
      expect(bytes[i]).toBeGreaterThanOrEqual(minimum);expect(bytes[i]).toBeLessThanOrEqual(maximum);
      expect(bytes[i+1]).toBe(bytes[i]);expect(bytes[i+2]).toBe(bytes[i]);expect(bytes[i+3]).toBe(255);
    }
  }
});

it('contains both soft large-area variation and subtle non-repeating fine grain',async()=>{
  const {width,height,surface,roughness}=await generate(128,128,101);
  const tileMeans:number[]=[];
  let adjacent=0,count=0,repeated=0;
  for(let ty=0;ty<8;ty++)for(let tx=0;tx<8;tx++){
    let sum=0;
    for(let y=ty*16;y<(ty+1)*16;y++)for(let x=tx*16;x<(tx+1)*16;x++)sum+=surface[(y*width+x)*4];
    tileMeans.push(sum/256);
  }
  for(let y=0;y<height;y++)for(let x=1;x<width;x++){
    adjacent+=Math.abs(roughness[(y*width+x)*4]-roughness[(y*width+x-1)*4]);count++;
    if(x<width/2&&surface[(y*width+x)*4]===surface[(y*width+x+width/2)*4])repeated++;
  }
  expect(Math.max(...tileMeans)-Math.min(...tileMeans)).toBeGreaterThan(2);
  expect(Math.max(...tileMeans)-Math.min(...tileMeans)).toBeLessThan(32);
  expect(adjacent/count).toBeGreaterThan(.5);expect(adjacent/count).toBeLessThan(12);
  expect(repeated/(height*(width/2-1))).toBeLessThan(.3);
});

it('rejects invalid or unbounded texture allocations',async()=>{
  for(const [width,height] of [[0,64],[-1,64],[16.5,64],[64,Infinity],[4096,64]]){
    await expect(generate(width,height)).rejects.toThrow(RangeError);
  }
});

it('gives the moulded key caps and their seats a real finish, not bare plastic',async()=>{
  const {deckFinish}=await import(/* @vite-ignore */ '../components/portfolio/deck-patina');
  // Four of the five key bodies are Graphite and the seats are Gasket; without an
  // entry they render flat beside the finished silver paddle and chrome lips.
  for(const name of ['Graphite','Gasket']){
    const finish=deckFinish[name];
    expect(finish,name+' has a finish profile').toBeDefined();
    expect(finish.roughness).toBeGreaterThan(.2);expect(finish.roughness).toBeLessThanOrEqual(1);
    expect(finish.variation).toBeGreaterThan(0);expect(finish.variation).toBeLessThan(.1);
    expect(finish.bump).toBeGreaterThan(0);expect(finish.bump).toBeLessThan(.02);
    expect(finish.clearcoat).toBeGreaterThanOrEqual(0);expect(finish.clearcoat).toBeLessThan(.3);
  }
  // A lit emissive bar must not be dulled by a roughness map.
  expect(deckFinish.KeyLight).toBeUndefined();
});
