"use client";
/* eslint-disable @next/next/no-img-element */
import {Component,lazy,Suspense,useState,useCallback,useEffect,type ReactNode} from 'react';
import {motion} from 'framer-motion';
import type {DeployProps} from './DeployDeckScene';
import styles from './Deck.module.css';
import panel from './deck-panel.json';
import DeckFallbackDisplay from './DeckFallbackDisplay';
const Scene=lazy(()=>import('./DeployDeckScene'));
class Boundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}
export default function DeployDeckSurface(props:Omit<DeployProps,'onReady'|'onFailure'|'attentionKey'|'pressedKey'>&{near:boolean;onDisplay:()=>void}){
  const [ready,setReady]=useState(false);const onReady=useCallback(()=>setReady(true),[]),onFailure=useCallback(()=>setReady(false),[]);
  const [attentionKey,setAttention]=useState(''),[pressedKey,setPressed]=useState('');
  const {state,player}=props;
  // Only a mounted, moving mechanism may hold the audio back. The still poster
  // fallback and reduced motion have no travel, so they must never wait.
  useEffect(()=>player.setDeployMotion(ready&&!props.still?1600:0),[ready,props.still,player]);
  const top=(y:number)=>`${(0.5-(y-panel.stage.cameraY)/panel.stage.height)*100}%`;
  const actions:Record<string,{label:string;face:string;legend:string;action:()=>void;selected?:boolean;disabled?:boolean}>={
    power:{label:state.powered?'关闭音乐台':'开启音乐台',face:'⏻',legend:'POWER',action:()=>state.powered?player.powerOff():void player.play(),selected:state.powered},
    play:{label:state.wantsPlaying?'暂停音乐':state.status==='error'?'重试播放':'播放音乐',face:state.status==='loading'?'…':state.wantsPlaying?'Ⅱ':'▶',legend:state.wantsPlaying?'PAUSE':'PLAY',action:player.toggle},
    next:{label:'下一首',face:'▸▸',legend:'SEEK',action:()=>void player.next(),disabled:state.status==='switching'},
    mute:{label:state.muted?'取消静音':'静音音乐',face:'ATT',legend:state.muted?'MUTED':'MUTE',action:player.toggleMute,selected:state.muted},
    display:{label:'切换显示模式',face:'DISP',legend:'MODE',action:props.onDisplay,selected:props.displayMode},
  };
  return <motion.div className={`${styles.surface} ${styles.deploySurface}`} style={{aspectRatio:panel.stage.width/panel.stage.height}} data-deck-renderer={ready?'three':'fallback'} initial={false}>
    <img src={state.powered?'/portfolio/deploy-powered-v03.png':'/portfolio/deploy-standby-v03.png'} width={1200} height={945} alt="" draggable={false} data-device-fallback="deck" hidden={ready}/>
    {!ready&&<DeckFallbackDisplay state={state} alternate={props.displayMode}/>}
    <div className={styles.stage} aria-hidden="true" style={{visibility:ready?'visible':'hidden'}}>{props.near&&<Boundary onFailure={onFailure}><Suspense fallback={null}><Scene {...props} attentionKey={attentionKey} pressedKey={pressedKey} onReady={onReady} onFailure={onFailure}/></Suspense></Boundary>}</div>
    <div className={styles.integratedPanel} data-deck-controls="integrated" role="group" aria-label="音乐台机身控制">
      {panel.keys.map(key=>{const a=actions[key.id];return <motion.button key={key.id} type="button" className={styles.modelKey} data-model-key={key.node} data-pressed={pressedKey===key.node?'true':undefined} style={{left:`${(0.5+key.x/panel.stage.width)*100}%`,top:top(key.y),width:`${(key.width+2*Math.abs(key.skew))/panel.stage.width*100}%`,height:`${key.height/panel.stage.height*100}%`}} aria-label={a.label} aria-pressed={a.selected} disabled={a.disabled} onClick={a.action}
        onPointerEnter={()=>setAttention(key.node)} onPointerLeave={()=>{setAttention('');setPressed('');}} onPointerDown={()=>setPressed(key.node)} onPointerUp={()=>setPressed('')} onPointerCancel={()=>setPressed('')}
        onFocus={()=>setAttention(key.node)} onBlur={()=>{setAttention('');setPressed('');}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setPressed(key.node);}} onKeyUp={()=>setPressed('')}
        whileHover={props.still?undefined:{color:'#e2f69c'}} transition={{duration:.09}}>
        <span aria-hidden="true" className={styles.keyFace}>{a.face}</span><small aria-hidden="true">{a.legend}</small>
      </motion.button>;})}
      <label className={styles.modelVolume} style={{left:`${(0.5+panel.volume.x/panel.stage.width)*100}%`,top:top(panel.volume.y),width:`${panel.volume.width/panel.stage.width*100}%`}}>
        <input type="range" min="0" max="100" value={Math.round(state.volume*100)} aria-label="音乐音量" aria-valuetext={`${Math.round(state.volume*100)}%${state.muted?'，已静音':''}`} onChange={e=>player.setVolume(Number(e.target.value)/100)}/>
        <span aria-hidden="true">VOLUME <b>{String(Math.round(state.volume*100)).padStart(2,'0')}</b></span>
      </label>
    </div>
  </motion.div>;
}
