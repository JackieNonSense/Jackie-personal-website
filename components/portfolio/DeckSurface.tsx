"use client";
/* eslint-disable @next/next/no-img-element */
import { Component, lazy, Suspense, useState, useCallback, type ReactNode } from "react";
import type { DeckSceneProps } from "./DeckScene";
import styles from "./Deck.module.css";
const Scene=lazy(()=>import("./DeckScene"));
class Boundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(error:Error){console.error("Deck model failed",error);this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}
export default function DeckSurface(props:Omit<DeckSceneProps,"onReady"|"onFailure">&{near:boolean}){
  const [ready,setReady]=useState(false);
  const onReady=useCallback(()=>setReady(true),[]);
  const onFailure=useCallback(()=>setReady(false),[]);
  return <div className={styles.surface} data-deck-renderer={ready?"three":"fallback"} aria-hidden="true">
    <img src="/portfolio/deck-a-standby-v02.png" width={1200} height={620} alt="" draggable={false} data-device-fallback="deck" hidden={ready}/>
    <div className={styles.stage} style={{visibility:ready?"visible":"hidden"}}>
      {props.near&&<Boundary onFailure={onFailure}><Suspense fallback={null}><Scene {...props} onReady={onReady} onFailure={onFailure}/></Suspense></Boundary>}
    </div>
  </div>;
}
