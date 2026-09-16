import {it,expect,vi} from 'vitest';
import {frameLoop} from '../components/studies/inktrace-living/frame-loop';
it('keeps one RAF even when a semantic tick synchronously asks to sync',()=>{
 let id=0;const pending=new Map<number,FrameRequestCallback>();
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{pending.set(++id,cb);return id;});vi.stubGlobal('cancelAnimationFrame',(key:number)=>pending.delete(key));
 try{const loop=frameLoop(()=>true,()=>loop.sync());loop.sync();expect(pending.size).toBe(1);const [key,callback]=[...pending][0];pending.delete(key);callback(100);expect(pending.size).toBe(1);loop.stop();expect(pending.size).toBe(0);}
 finally{vi.unstubAllGlobals();}
});
