"use client";
import { useEffect,useState,useCallback } from "react";
import { motion } from "framer-motion";
import type { MusicController, MusicSnapshot } from "./music-controller";
import { musicTracks } from "./music-tracks";
import { useObjectVisibility } from "./use-object-visibility";
import DeckSurface from "./DeployDeckSurface";
import styles from "./Devices.module.css";

export default function MusicDeck({ player, state, still, onVisibility }: { player: MusicController; state: MusicSnapshot; still: boolean; onVisibility: (visible: boolean) => void }) {
  const { ref, near, visible, drawing } = useObjectVisibility();
  const [displayMode,setDisplayMode]=useState(false);
  const switchDisplay=useCallback(()=>setDisplayMode(mode=>!mode),[]);
  useEffect(() => onVisibility(visible), [visible, onVisibility]);
  const track = musicTracks[state.track];
  return <motion.div ref={ref} className={styles.deck} data-testid="music-deck" data-power={state.powered?'on':'off'} data-status={state.status} initial={false} whileInView={{opacity:1}}>
    <div className={styles.objectKicker}><span>PERSONAL SOUNDTRACK</span><span>CD / STEREO</span></div>
    <DeckSurface near={near} active={drawing} player={player} state={state} still={still} displayMode={displayMode} onDisplay={switchDisplay}/>
    <div className={styles.deckCaption}><span aria-live="polite">{state.status === "error" ? "READ ERROR" : state.status === "loading" ? "LOADING…" : state.status === "switching" ? "CHANGING DISC…" : state.status === "playing" ? "NOW PLAYING" : state.status === "paused" ? "PAUSED" : "PRESS PLAY"}</span><span>{track.title}</span></div>
    {state.error && <p role="alert" className={styles.audioError}>{state.error} Use PLAY to retry, or SEEK to skip.</p>}
    <details className={styles.credits}><summary>MUSIC CREDITS</summary><p>Two licensed listening demos, not my work or final playlist.</p>{musicTracks.map(item=><div key={item.id}><p>{item.credit}</p><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Artist / source ↗</a><a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">CC BY 4.0 ↗</a></div>)}</details>
  </motion.div>;
}
