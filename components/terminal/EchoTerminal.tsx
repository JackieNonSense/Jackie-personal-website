'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Component, useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import * as THREE from 'three';
import { initialEcho, reduceEcho, restoreEcho, serializeEcho, parseCommand, objective, hints, type EchoAction, type EchoState } from './echo-engine';
import { newProgram, programAction, tickProgram, mirrorPadAt, PROGRAMS, type ProgramState, type ProgramAction } from './echo-programs';
import { SCREEN_W, SCREEN_H, NAV, PROGRAM_RECT, drawEcho, terminalView, hitControl, scrollLimit, type UIAction } from './echo-display';
import styles from './EchoTerminal.module.css';
const Machine=dynamic(()=>import('./EchoMachine'),{ssr:false});
const SAVE_KEY='jr-echo-chapter-1-v2',SCORE_KEY='jr-echo-program-scores-v2';
class MachineBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onFailure();}render(){return this.state.failed?null:this.props.children;}
}
function loadScores():Record<string,number>{try{const r=JSON.parse(localStorage.getItem(SCORE_KEY)||'{}');return Object.fromEntries(['survivor','packet','mirror'].map(k=>[k,typeof r?.[k]==='number'&&Number.isFinite(r[k])?Math.max(0,r[k]):0]));}catch{return {};}}
export default function EchoTerminal(){
  const [state,rawDispatch]=useReducer((s:EchoState,a:EchoAction|{type:'hydrate';state:EchoState})=>a.type==='hydrate'?a.state:reduceEcho(s,a),undefined,initialEcho);
  const [surface,setSurface]=useState<{canvas:HTMLCanvasElement;texture:THREE.CanvasTexture}|null>(null),[loaded,setLoaded]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const [focused,setFocused]=useState(false),[reader,setReader]=useState(false),[settings,setSettings]=useState({sound:false,motion:true}),[settingsOpen,setSettingsOpen]=useState(false);
  const [program,setProgram]=useState<ProgramState|null>(null),[scores,setScores]=useState<Record<string,number>>({}),[command,setCommand]=useState(''),[commandOpen,setCommandOpen]=useState(false),[confirmNew,setConfirmNew]=useState(false),[storageError,setStorageError]=useState(false);
  const [rewardIndex,setRewardIndex]=useState(-1);
  const rewardRef=useRef(-1),hintOpen=useRef(false);
  const reduced=useReducedMotion(),still=!!reduced||!settings.motion;
  const root=useRef<HTMLDivElement>(null),commandInput=useRef<HTMLInputElement>(null),stateRef=useRef(state),programRef=useRef(program),scoresRef=useRef(scores),hover=useRef<string|null>(null),selection=useRef(0),bootStarted=useRef(0),audio=useRef<AudioContext|null>(null),readerRef=useRef(reader);
  useEffect(()=>{stateRef.current=state;},[state]);useEffect(()=>{programRef.current=program;},[program]);useEffect(()=>{scoresRef.current=scores;},[scores]);useEffect(()=>{readerRef.current=reader;},[reader]);
  const pause=useCallback(()=>{setProgram(p=>p&&p.status==='playing'?programAction(p,{type:'pause'}):p);},[]);
  const beep=useCallback(()=>{if(!settings.sound)return;try{const ctx=audio.current||(audio.current=new AudioContext());void ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=540;gain.gain.setValueAtTime(.025,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.065);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.07);}catch{/* Optional audio. */}},[settings.sound]);
  const dispatch=useCallback((a:EchoAction)=>{if(a.type==='wake'&&window.innerWidth<700)setReader(true);if(a.type==='navigate'||a.type==='sleep'||a.type==='new-game')pause();if(a.type==='scroll'){const s=stateRef.current,limit=scrollLimit(s,programRef.current,scoresRef.current,rewardRef.current);a={...a,delta:Math.max(0,Math.min(limit,s.scroll+a.delta))-s.scroll};}selection.current=0;hover.current=null;hintOpen.current=a.type==='hint';if(a.type==='navigate'||a.type==='new-game'){rewardRef.current=-1;setRewardIndex(-1);}rawDispatch(a);beep();},[pause,beep]);
  const commitProgram=useCallback((next:ProgramState)=>{
    programRef.current=next;setProgram(next);
    if(next.status==='result'&&next.score>(scoresRef.current[next.id]||0)){
      const saved={...scoresRef.current,[next.id]:next.score};scoresRef.current=saved;setScores(saved);
      try{localStorage.setItem(SCORE_KEY,JSON.stringify(saved));}catch{setStorageError(true);}
    }
  },[]);
  const game=useCallback((a:ProgramAction)=>{const p=programRef.current;if(p)commitProgram(programAction(p,a));if(a.type!=='key')root.current?.focus({preventScroll:true});},[commitProgram]);
  const act=useCallback((a:UIAction)=>{
    if(a.type==='story')dispatch(a.action);
    else if(a.type==='program-select'){setProgram(newProgram(a.id));setFocused(true);beep();}
    else if(a.type==='program-action')game(a.action);
    else if(a.type==='program-exit'){pause();setProgram(null);}
    else if(a.type==='reward-select'){rewardRef.current=a.index;setRewardIndex(a.index);rawDispatch({type:'scroll',delta:-500});}
    else if(a.type==='command-focus'){pause();setCommandOpen(true);setTimeout(()=>commandInput.current?.focus(),0);return;}
    root.current?.focus({preventScroll:true});
  },[dispatch,game,pause,beep]);
  useEffect(()=>{
    let active=true;const canvas=document.createElement('canvas');canvas.width=SCREEN_W;canvas.height=SCREEN_H;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
    const font=new FontFace('Echo Mono',"url('/fonts/fusion-pixel/fusion-pixel-8px-monospaced-latin.otf.woff2')");
    void font.load().then(f=>{if(active)document.fonts.add(f);}).catch(()=>{}).finally(()=>{
      if(!active)return;bootStarted.current=performance.now();setSurface({canvas,texture});
      try{const restored=restoreEcho(localStorage.getItem(SAVE_KEY));rawDispatch({type:'hydrate',state:restored});setScores(loadScores());if(restored.awake&&window.innerWidth<700)setReader(true);}catch{setStorageError(true);}
      setLoaded(true);root.current?.focus({preventScroll:true});
    });
    return()=>{active=false;texture.dispose();void audio.current?.close();};
  },[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(SAVE_KEY,serializeEcho(state));}catch{queueMicrotask(()=>setStorageError(true));}},[state,loaded]);
  useEffect(()=>{const blur=()=>pause(),visibility=()=>{if(document.hidden)pause();};window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};},[pause]);
  useEffect(()=>{
    if(!surface)return;const ctx=surface.canvas.getContext('2d');if(!ctx)return;let handle=0,last=performance.now(),lastDraw=0;
    const frame=(now:number)=>{handle=requestAnimationFrame(frame);const s=stateRef.current,p=programRef.current,running=s.awake&&s.page==='programs'&&p?.status==='playing'&&!readerRef.current;if(now-lastDraw<(running?30:70))return;const dt=Math.min((now-last)/1000,.1);last=now;lastDraw=now;let current=p;if(running&&p){current=tickProgram(p,dt);commitProgram(current);}drawEcho(ctx,s,current,{time:now/1000,boot:Math.min(1,(now-bootStarted.current)/1700),hover:hover.current,scores:scoresRef.current,still,hintOpen:hintOpen.current,rewardIndex:rewardRef.current});surface.texture.needsUpdate=true;};
    handle=requestAnimationFrame(frame);return()=>cancelAnimationFrame(handle);
  },[surface,still,commitProgram]);
  const pointer=useCallback((u:number,v:number)=>{if(hintOpen.current){hintOpen.current=false;return;}const s=stateRef.current,p=programRef.current,x=u*SCREEN_W,y=(1-v)*SCREEN_H;if(s.awake&&s.page==='programs'&&p?.id==='mirror'&&p.status==='playing'){const pad=mirrorPadAt(x,y,PROGRAM_RECT);if(pad!==null){game({type:'pad',index:pad});root.current?.focus();return;}}const c=hitControl(terminalView(s,p,scoresRef.current,rewardRef.current).controls,x,y);if(c){hover.current=c.id;act(c.action);}},[act,game]);
  const wheel=useCallback((delta:number)=>{if(delta)dispatch({type:'scroll',delta:delta>0?3:-3});},[dispatch]);
  const onReady=useCallback(()=>setReady(true),[]),onFailure=useCallback(()=>{setFailed(true);setReader(true);rawDispatch({type:'wake'});pause();},[pause]),onPower=useCallback(()=>dispatch({type:stateRef.current.awake?'sleep':'wake'}),[dispatch]);
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(e.ctrlKey||e.metaKey||e.altKey||!root.current?.contains(document.activeElement))return;
      const target=e.target;if(target instanceof HTMLElement&&target.matches('input,textarea,select'))return;if(target instanceof HTMLElement&&target.closest('button,a')&&(e.key==='Enter'||e.key===' '))return;
      const s=stateRef.current,p=programRef.current;
      if(settingsOpen||commandOpen||confirmNew)return;
      if(s.awake&&s.page==='programs'&&p&&!readerRef.current){
        if(e.repeat&&(e.key==='Escape'||e.key==='Enter'))return;
        if(e.key==='Escape'){e.preventDefault();game({type:p.status==='playing'?'pause':'resume'});return;}
        if(e.key==='Enter'&&(p.status==='ready'||p.status==='result'||p.status==='paused')){e.preventDefault();game({type:p.status==='ready'?'start':p.status==='result'?'retry':'resume'});return;}
        if(p.status==='playing'){if([' ','w','a','s','d','j','1','2','3','4','5','6','7','8','9'].includes(e.key.toLowerCase())||e.key.startsWith('Arrow')){e.preventDefault();game({type:'key',key:e.key,down:true});}return;}
      }
      if(e.key==='Escape'){e.preventDefault();dispatch({type:'back'});setCommandOpen(false);return;}
      if(e.key==='/'||e.key===':'){e.preventDefault();act({type:'command-focus'});return;}
      if(e.key==='Enter'&&!s.awake){e.preventDefault();dispatch({type:'wake'});return;}
      if(/^[1-9]$/.test(e.key)){e.preventDefault();dispatch({type:'navigate',page:NAV[Number(e.key)-1].id});return;}
      const controls=terminalView(s,p,scoresRef.current,rewardRef.current).controls.filter(c=>!c.disabled&&!c.id.startsWith('nav-'));
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(s.openId){dispatch({type:'scroll',delta:e.key==='ArrowDown'?1:-1});return;}selection.current=(selection.current+(e.key==='ArrowDown'?1:-1)+controls.length)%controls.length;hover.current=controls[selection.current]?.id;}
      if(e.key==='Enter'&&controls.length){e.preventDefault();act(controls[selection.current%controls.length].action);}
    };
    const up=(e:KeyboardEvent)=>{if(programRef.current)game({type:'key',key:e.key,down:false});};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[dispatch,act,game,settingsOpen,commandOpen,confirmNew]);
  const openReader=()=>{pause();setReader(v=>failed?true:!v);if(!state.awake)dispatch({type:'wake'});};
  const sendCommand=(e:React.FormEvent)=>{e.preventDefault();if(!command.trim())return;const action=parseCommand(command,state);dispatch(action);setCommand('');setCommandOpen(action.type==='message');if(action.type!=='message')root.current?.focus({preventScroll:true});};
  const view=terminalView(state,program,scores,rewardIndex),revealedHints=hints(state),hint=revealedHints.at(-1);
  const buttonMotion={whileHover:{backgroundColor:'#17312d'},whileTap:still?undefined:{scale:.98},transition:{duration:still?0:.12}};
  const touch=(key:string,label:string)=><motion.button {...buttonMotion} key={key} className={styles.key} aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game({type:'key',key,down:true});}} onPointerUp={()=>game({type:'key',key,down:false})} onPointerCancel={()=>game({type:'key',key,down:false})} onLostPointerCapture={()=>game({type:'key',key,down:false})}>{label}</motion.button>;
  return <div ref={root} tabIndex={-1} className={styles.root} data-testid="echo-terminal" data-page={state.page} data-stage={state.stage} data-ending={state.ending||''} data-renderer={failed?'reading':'three'} data-program-status={program?.status||'none'} data-program-score={program?.score||0} data-mirror-phase={program?.id==='mirror'?program.mirror.phase:''} data-mirror-round={program?.id==='mirror'?program.mirror.round:0}>
    <header className={styles.header}><Link href="/#experiments" className={styles.back}>← RETURN TO PORTFOLIO</Link><span className={styles.identity}>JR INDUSTRIES <span>/</span> FIELD TERMINAL 07</span><div className={styles.tools}><motion.button {...buttonMotion} onClick={()=>setFocused(v=>!v)} aria-pressed={focused}>{focused?'FULL MACHINE':'FOCUS'}</motion.button><motion.button {...buttonMotion} onClick={openReader} aria-pressed={reader}>READING MODE</motion.button><motion.button {...buttonMotion} onClick={()=>{pause();setSettingsOpen(v=>!v);}} aria-expanded={settingsOpen}>SETTINGS</motion.button></div></header>
    <div className={styles.stage}>{!ready&&!failed&&<div className={styles.loading}>JR / TERMLINK<br/><small>RESTORING LOCAL DISPLAY</small></div>}{surface&&<MachineBoundary onFailure={onFailure}><Machine texture={surface.texture} awake={state.awake} focused={focused} still={still} phase={state.stage} onPointer={pointer} onWheel={wheel} onReady={onReady} onFailure={onFailure} onPower={onPower}/></MachineBoundary>}</div>
    <footer className={styles.footer}><div><span className={styles.statusDot}/>{state.ending?'CHAPTER COMPLETE':state.awake?'RECOVERY SESSION / 777':'A SIGNAL REMAINS'}<small>{state.awake?objective(state):'AN ECHO INVESTIGATION · 10–15 MINUTES'}</small></div><div className={styles.footerActions}><motion.button {...buttonMotion} onClick={()=>act({type:'command-focus'})}>COMMAND /</motion.button><motion.button {...buttonMotion} onClick={onPower}>{state.awake?'⏻ STANDBY':'↵ WAKE TERMINAL'}</motion.button></div></footer>
    {state.awake&&state.page==='programs'&&program&&!reader&&<div className={styles.gameControls}><span>{program.id==='mirror'?'USE KEYS 1–9 OR TOUCH THE GRID':program.id==='packet'?'ARROWS / WASD':'A D MOVE · W JUMP · J FIRE'}</span>{program.id==='survivor'&&<>{touch('a','LEFT')}{touch('w','JUMP')}{touch('d','RIGHT')}{touch('j','FIRE')}</>}{program.id==='packet'&&<>{touch('ArrowLeft','LEFT')}{touch('ArrowUp','UP')}{touch('ArrowDown','DOWN')}{touch('ArrowRight','RIGHT')}</>}<motion.button {...buttonMotion} onClick={()=>game({type:program.status==='playing'?'pause':program.status==='ready'?'start':program.status==='result'?'retry':'resume'})}>{program.status==='playing'?'PAUSE':program.status==='ready'?'START':program.status==='result'?'RETRY':'RESUME'}</motion.button><motion.button {...buttonMotion} onClick={()=>act({type:'program-exit'})}>EXIT GAME</motion.button></div>}
    {reader&&<motion.section className={styles.reader} initial={{opacity:0,y:still?0:8}} animate={{opacity:1,y:0}} transition={{duration:still?0:.2}} aria-label="Terminal reading mode"><div className={styles.readerTop}><div><small>JR / ACCESSIBLE DISPLAY</small><h1>{view.title}</h1></div>{!failed&&<motion.button {...buttonMotion} onClick={()=>setReader(false)}>RETURN TO CRT</motion.button>}</div><nav aria-label="Terminal applications">{NAV.map(n=><motion.button {...buttonMotion} key={n.id} aria-current={state.page===n.id?'page':undefined} onClick={()=>dispatch({type:'navigate',page:n.id})}>{n.label}</motion.button>)}</nav><div className={styles.readerContent}><small>{view.subtitle}</small>{view.art&&<pre className={styles.art}>{view.art.join('\n')}</pre>}{view.text.map((p,i)=><p key={i}>{p||'\u00a0'}</p>)}{state.page==='signal'&&!state.openId&&<div className={styles.readValues}>CHANNEL {state.channel} · {state.frequency} kHz · {state.phase}°</div>}{state.page==='link'&&!state.openId&&<div className={styles.readValues}>CELL ROTATIONS: {state.rotations.map(v=>`${v*90}°`).join(' / ')}</div>}{program&&state.page==='programs'&&<div className={styles.programReader}><strong>{program.status.toUpperCase()} / SCORE {program.score}</strong><p>Return to the CRT to play. Opening this display pauses the simulation.</p>{!failed&&<motion.button {...buttonMotion} onClick={()=>{setReader(false);setFocused(true);game({type:program.status==='ready'?'start':program.status==='result'?'retry':'resume'});}}>PLAY ON CRT</motion.button>}</div>}{Object.entries(scores).some(([,score])=>score>0)&&state.page==='programs'&&<p>LOCAL RECORDS: {PROGRAMS.map(p=>`${p.title} ${scores[p.id]||0}`).join(' · ')}</p>}</div><div className={styles.readerActions}>{view.controls.filter(c=>!c.id.startsWith('nav-')&&c.id!=='command'&&c.id!=='hint'&&c.id!=='program-play').map(c=><motion.button {...buttonMotion} key={c.id} disabled={c.disabled} aria-pressed={c.active===undefined?undefined:c.active} onClick={()=>act(c.action)}>{c.label}</motion.button>)}</div><div className={styles.readerStatus} role="status"><p>{state.feedback}</p><strong>{objective(state)}</strong>{state.hintLevel>0&&<p>HINT {state.hintLevel}: {hint}</p>}<motion.button {...buttonMotion} onClick={()=>dispatch({type:'hint'})}>REQUEST HINT</motion.button></div></motion.section>}
    {commandOpen&&<motion.form className={styles.command} onSubmit={sendCommand} initial={{opacity:0,y:still?0:6}} animate={{opacity:1,y:0}}><label htmlFor="echo-command">TERMLINK / COMMAND</label><div><span>777 &gt;</span><input ref={commandInput} id="echo-command" value={command} onChange={e=>setCommand(e.target.value)} placeholder="help" autoComplete="off" spellCheck={false} onKeyDown={e=>{if(e.key==='Escape'){setCommandOpen(false);root.current?.focus();}}}/><motion.button {...buttonMotion} type="submit">RUN</motion.button><button type="button" onClick={()=>setCommandOpen(false)}>CLOSE</button></div><p className={styles.commandFeedback}>{state.feedback}</p><small>Type help to see available commands. Commands operate inside the recovered terminal.</small></motion.form>}
    {settingsOpen&&<motion.aside className={styles.settings} initial={{opacity:0,y:still?0:-6}} animate={{opacity:1,y:0}} aria-label="Terminal settings"><h2>TERMINAL SETTINGS</h2><motion.button {...buttonMotion} aria-pressed={settings.sound} onClick={()=>setSettings(v=>({...v,sound:!v.sound}))}>SOUND {settings.sound?'ON':'OFF'}</motion.button><motion.button {...buttonMotion} aria-pressed={!still} onClick={()=>setSettings(v=>({...v,motion:!v.motion}))}>MOTION {still?'REDUCED':'ON'}</motion.button><motion.button {...buttonMotion} onClick={()=>{setConfirmNew(true);setSettingsOpen(false);}}>NEW INVESTIGATION</motion.button><motion.button {...buttonMotion} onClick={()=>setSettingsOpen(false)}>CLOSE SETTINGS</motion.button><p>Story progress and program records stay on this device.</p></motion.aside>}
    {confirmNew&&<div className={styles.modalBackdrop}><motion.section className={styles.modal} initial={{opacity:0,scale:still?1:.98}} animate={{opacity:1,scale:1}} role="dialog" aria-modal="true" aria-labelledby="new-title"><h2 id="new-title">START A NEW INVESTIGATION?</h2><p>This replaces your chapter progress. Program high scores remain.</p><button onClick={()=>{dispatch({type:'new-game'});setProgram(null);setConfirmNew(false);setReader(false);bootStarted.current=performance.now();}}>START NEW</button><button onClick={()=>setConfirmNew(false)}>KEEP EXPLORING</button></motion.section></div>}
    <div className={styles.sr} role="status" aria-live="polite">{state.feedback}</div>{storageError&&<p className={styles.storageNotice}>Device storage is unavailable. This session remains playable; progress cannot be saved.</p>}
  </div>;
}
