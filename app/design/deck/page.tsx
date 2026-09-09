"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import DeckSurface from "../../../components/portfolio/DeckSurface";
import type { DeckView } from "../../../components/portfolio/DeckScene";
import styles from "../../../components/portfolio/Deck.module.css";
const views: [DeckView,string][]=[["closed","01 / 闭合"],["open","02 / 开仓 28°"],["knob","03 / 旋钮细节"],["glass","04 / 黑玻璃"]];
export default function DeckReview(){
  const [view,setView]=useState<DeckView>("closed");const reduced=useReducedMotion();
  return <main className={styles.review}>
    <Link href="/#about">← BACK TO PORTFOLIO</Link>
    <h1>A / FLIP COCKPIT — MATERIAL REVIEW 01</h1>
    <p>实际 GLB / Three.js 模型。此页用于造型与静态姿态校准；首页已接入旋钮拖动、实体按键、真实音频频谱和整块面板换碟动画。返回网站即可试听，HTML 控制同时保留。</p>
    <div className={styles.views}>{views.map(([id,label])=><motion.button key={id} onClick={()=>setView(id)} aria-pressed={view===id} whileTap={reduced?undefined:{y:1}} transition={{duration:.1}}>{label}</motion.button>)}</div>
    <div className={styles.reviewStage} data-deck-review={view}><DeckSurface near active review view={view}/></div>
    <p>固定正视角 · 银色折面 / 深色玻璃 / 冰蓝键沿 · 开仓时整块面板围绕下缘铰链翻转。没有加入设备署名。</p>
  </main>;
}
