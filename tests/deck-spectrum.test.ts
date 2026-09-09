import {expect,it} from 'vitest';
import {deckLevels} from '../components/portfolio/deck-spectrum';
it('retains only the last real sample during the first 180ms of a track exchange',()=>{
 expect(deckLevels([3,6],[0,0],'switching',90,false)).toEqual([3,6]);
 expect(deckLevels([3,6],[9,9],'switching',180,false)).toEqual([0,0]);
});
it('clears all meters for paused, failed, reading and static modes',()=>{
 for(const status of ['paused','error','loading','idle'])expect(deckLevels([3,6],[9,9],status,null,false)).toEqual([0,0]);
 expect(deckLevels([3,6],[9,9],'playing',null,true)).toEqual([0,0]);
});
it('smooths real input without inventing meter energy',()=>{
 expect(deckLevels([0,0],[0,0],'playing',null,false)).toEqual([0,0]);
 expect(deckLevels([0,5],[5,0],'playing',null,false)).toEqual([3.4000000000000004,4]);
});
