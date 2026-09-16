import type {SceneId} from './archive-runtime';
export class SceneSelection {
 private revision=0;
 request(scene:SceneId,ready:Promise<unknown>|null,commit:(scene:SceneId)=>void){const revision=++this.revision;const finish=()=>{if(revision===this.revision)commit(scene);};if(ready)ready.then(finish,finish);else finish();}
 cancel(){this.revision++;}
}
const loaded=new Map<SceneId,Promise<unknown>>();
export function prepareScene(scene:SceneId):Promise<unknown>|null{
 if(typeof Image==='undefined'||typeof Image.prototype.decode!=='function')return null;
 if(loaded.has(scene))return loaded.get(scene)!;
 const urls=scene==='wiki'?['wiki/workshop-v01.webp','wiki/coast-v01.webp','review/sprite-sheet.png']:[`scenes/${scene}-v01.webp`,'review/sprite-sheet.png','wiki/workshop-v01.webp'];
 const promise=Promise.all(urls.map(path=>{const image=new Image();image.src='/studies/inktrace/living-archive/'+path;return image.decode().catch(()=>undefined);}));
 loaded.set(scene,promise);return promise;
}
