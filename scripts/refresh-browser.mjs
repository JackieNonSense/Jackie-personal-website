import {writeFile,mkdir} from 'node:fs/promises';
export async function browser(existing){
 const target=existing?(await fetch('http://127.0.0.1:9333/json/list').then(r=>r.json())).find(t=>t.id===existing):await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error(method+' timed out'));},45000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});
 const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async expression=>{for(let i=0;i<120;i++){if(await run(expression))return;await delay(250);}throw Error(expression);};
 const shot=async(path,clip)=>{await mkdir(path.substring(0,path.lastIndexOf('/')),{recursive:true});const options={captureBeyondViewport:!!clip,...(clip?{clip}:{})};const r=await send('Page.captureScreenshot',{format:'png',...options});await writeFile(path,Buffer.from(r.data,'base64'));const preview=await send('Page.captureScreenshot',{format:'jpeg',quality:85,...options});await writeFile(path.replace('.png','.jpg'),Buffer.from(preview.data,'base64'));};
 await send('Page.enable');await send('Runtime.enable');
 return{send,run,until,delay,shot,errors,close:async()=>{ws.close();if(!existing)await fetch('http://127.0.0.1:9333/json/close/'+target.id,{signal:AbortSignal.timeout(5000)}).catch(()=>{});}};
}
if(process.argv.includes('--inktrace')){
 const b=await browser();try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'https://inktrace.app/'});await b.delay(8000);
 console.log(await b.run('document.body.innerText.slice(0,20000)'));
 console.log(await b.run('Array.from(document.images).map(i=>({src:i.src,alt:i.alt,w:i.naturalWidth,h:i.naturalHeight}))'));
 await b.shot('.cache/inktrace-public.png');
 }finally{b.close();}
}
