"use client";
/* eslint-disable @next/next/no-img-element */
import {Component,lazy,Suspense,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {motion,useReducedMotion} from 'framer-motion';
import styles from './study.module.css';
const Scene=lazy(()=>import('./WideDeckScene'));
class StudyBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return{failed:true};}
 render(){return this.state.failed?<p role="alert">3D 不可用；下方 Blender 原图仍可查看。</p>:this.props.children;}
}
export default function WideDeckStudy(){
 const [loaded,setLoaded]=useState(false),[position,setPosition]=useState(0),[scrubbing,setScrubbing]=useState(false);
 const reduced=useReducedMotion();
 const move=(value:number)=>{setLoaded(true);setScrubbing(false);setPosition(value);};
 const press=reduced?undefined:{y:1};
 return <main className={styles.page}>
  <Link href="/#about">← RETURN TO PORTFOLIO</Link>
  <p className={styles.kicker}>BLENDER / WIDE DISPLAY — MECHANISM STUDY 01</p>
  <h1>屏幕成为主角。</h1>
  <p>独立设计研究，未接入首页。屏幕内容为静态示意，没有播放音乐；这里检查的是 Blender 导出的真实导轨与翻转动画。</p>
  <div className={styles.controls}>
   <motion.button onClick={()=>move(1)} whileHover={reduced?undefined:{backgroundColor:'#314349'}} whileTap={press} transition={{duration:.1}}>打开面板</motion.button>
   <motion.button onClick={()=>move(0)} whileHover={reduced?undefined:{backgroundColor:'#314349'}} whileTap={press} transition={{duration:.1}}>关闭面板</motion.button>
   <label>检查开合进度<input aria-label="检查开合进度" type="range" min="0" max="100" value={Math.round(position*100)} onChange={e=>{setLoaded(true);setScrubbing(true);setPosition(Number(e.target.value)/100);}}/></label>
  </div>
  <div className={styles.stage} data-wide-study data-position={position}>
   {loaded?<StudyBoundary><Suspense fallback={<p>加载 Blender 动画模型…</p>}><Scene target={position} instant={!!reduced||scrubbing}/></Suspense></StudyBoundary>:<img src="/review/wide-deck-v01/01-front.png" width="1920" height="1280" alt="Blender 大屏音乐台：香槟银机身、彩色显示、侧键和底部音量推杆"/>}
  </div>
  <p className={styles.note}>上方首次显示 Blender 静帧；点击后切换实时 Three.js 机构预览。两者照明不同，实时预览不作为最终材质验收图。打开约 1.3 秒：先推出 14mm，再翻开 108°；减少动态效果时直接切到目标姿态。</p>
  <h2>Blender 原始渲染 / 非网页效果截图</h2>
  <div className={styles.frames}>{[['01-front','01 · 正面闭合'],['02-extended','02 · 导轨推出'],['03-turning','03 · 绕轴翻开'],['04-open','04 · 碟仓露出'],['05-hinge-inspection','05 · 侧向机构检查']].map(([file,title])=><figure key={file}><a href={`/review/wide-deck-v01/${file}.png`} target="_blank" rel="noreferrer"><img loading="lazy" src={`/review/wide-deck-v01/${file}.png`} width="1920" height="1280" alt={title}/></a><figcaption>{title} · 点击查看原尺寸</figcaption></figure>)}</div>
  <h2>下一步接入逻辑</h2>
  <p>横向推杆调音量，独立静音；PLAY / NEXT 保持直接操作。OPEN 只检查机构、不启动声音。屏幕圆弧将展示真实音频，不作为旋钮。最终曲名、音量和状态需按首页实际尺寸重新校准，不能把这张大图直接缩小当完成。</p>
 </main>;
}
