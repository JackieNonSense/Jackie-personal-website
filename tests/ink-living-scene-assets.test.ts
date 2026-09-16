import {it,expect} from 'vitest';
import {SceneSelection} from '../components/studies/inktrace-living/scene-assets';
it('keeps the current scene until ready and only commits the latest request',async()=>{
 const gate=new SceneSelection(),commits:string[]=[];let first!:()=>void,last!:()=>void;
 gate.request('characters',new Promise<void>(r=>{first=r;}),s=>commits.push(s));
 gate.request('ai',new Promise<void>(r=>{last=r;}),s=>commits.push(s));
 expect(commits).toEqual([]);last();await Promise.resolve();first();await Promise.resolve();expect(commits).toEqual(['ai']);
});
it('closing cancels an in-flight scene load',async()=>{
 const gate=new SceneSelection(),commits:string[]=[];let ready!:()=>void;
 gate.request('wiki',new Promise<void>(r=>{ready=r;}),s=>commits.push(s));gate.cancel();ready();await Promise.resolve();expect(commits).toEqual([]);
});
