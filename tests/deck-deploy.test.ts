import {existsSync,readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('builds five real keys and a volume rail from the shared panel layout',()=>{
 const r=JSON.parse(readFileSync('app/reference/production/cd-deck-v09-edgy/mechanism.json','utf8'));
 for(const name of ['PowerKey','PlayKey','NextKey','MuteKey','DisplayKey','VolumeFader'])expect(r.nodes).toContain(name);
 expect(r.panel).toBeDefined();
 const {stage,keys,volume}=r.panel;
 const targets=[...keys.map((k:{x:number;y:number;width:number;height:number;skew:number})=>({x:k.x,y:k.y,width:Math.max(k.width+2*Math.abs(k.skew),stage.width*44/346),height:Math.max(k.height,stage.width*44/346)})),{x:volume.x,y:volume.y,width:volume.width,height:stage.width*44/346}];
 for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
  const a=targets[i],b=targets[j];expect(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2,'44 px phone targets do not overlap').toBe(true);
 }
});
it('provides texture coordinates for the satin bezel instead of undefined bump derivatives',()=>{
 const b=readFileSync('public/portfolio/deploy-deck-v03.glb');const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
 expect(g.meshes.find((m:{name:string})=>m.name==='DisplayBezel').primitives[0].attributes.TEXCOORD_0).toBeTypeOf('number');
});
it('stores the screen horizontally inside the base then extracts before raising',()=>{
 const file='app/reference/production/cd-deck-v09-edgy/mechanism.json';expect(existsSync(file),'corrected Blender deployment export exists').toBe(true);
 const r=JSON.parse(readFileSync(file,'utf8'));expect(r.samples[0]).toMatchObject({angle:90,z:-7});
 const last=r.samples.at(-1);expect(last.angle).toBe(0);expect(last.z).toBe(1.5);
 for(const p of r.samples){if(p.angle<89)expect(p.z).toBe(1.5);}
 expect(r.nodes).toContain('DisplaySurface');expect(r.nodes).not.toContain('VolumePivot');
});
it('exports an offset screen and differentiated sculpted keys, not a repeated five-tile bank',()=>{
 const r=JSON.parse(readFileSync('app/reference/production/cd-deck-v09-edgy/mechanism.json','utf8'));
 expect(r.panel.screenX).toBeLessThan(0);
 expect(new Set(r.panel.keys.map((k:{width:number})=>k.width)).size).toBeGreaterThan(2);
 expect(r.panel.keys.find((k:{id:string})=>k.id==='play').skew).toBeGreaterThan(0);
 expect(r.nodes).toEqual(expect.arrayContaining(['CobaltShoulder','OffsetSpine','PlaybackSeam']));
 const b=readFileSync('public/portfolio/deploy-deck-v03.glb');const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
 expect(g.materials.map((m:{name:string})=>m.name)).toEqual(expect.arrayContaining(['DarkAnodized','CobaltEnamel']));
});
