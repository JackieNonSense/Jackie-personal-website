"use client";
import { useEffect,useRef } from "react";
import { motion } from "framer-motion";
import type { MusicController, MusicSnapshot } from "./music-controller";
import { musicTracks } from "./music-tracks";
import { useObjectVisibility } from "./use-object-visibility";
import { whenUserHasEngaged } from "./user-engagement";
import Y2kDeck from "./y2k-deck/Y2kDeck";
import styles from "./Devices.module.css";

export default function MusicDeck({ player, state, still, onVisibility }: { player: MusicController; state: MusicSnapshot; still: boolean; onVisibility: (visible: boolean) => void }) {
  const { ref, near, visible, drawing } = useObjectVisibility();
  useEffect(() => onVisibility(visible), [visible, onVisibility]);
  // The deck wakes itself the first time it is actually on screen, so the page
  // demonstrates that its objects work instead of waiting for a click. Once only:
  // powering off is a decision, and scrolling away must not undo it.
  const woke = useRef(false);
  useEffect(() => {
    if (!visible || woke.current) return;
    woke.current = true;
    player.powerOn();
    // Scrolling cannot unlock audio, so the deck arms itself and sounds on the
    // first gesture the page receives. Until then the display reads READING DISC,
    // which is honest: the machine is trying, and waiting on permission.
    return whenUserHasEngaged(() => {
      const now = player.getSnapshot();
      // A deliberate power off or pause in the meantime outranks the armed intent.
      if (now.powered && !now.wantsPlaying && now.status !== "error") void player.play();
    });
  }, [visible, player]);
  const track = musicTracks[state.track];
  return <motion.div ref={ref} className={styles.deck} data-testid="music-deck" data-power={state.powered?'on':'off'} data-status={state.status} initial={false} whileInView={{opacity:1}}>
    <div className={styles.objectKicker}><span>PERSONAL SOUNDTRACK</span><span>CD / STEREO</span></div>
    <Y2kDeck near={near} active={drawing} player={player} state={state} still={still}/>
    <div className={styles.deckCaption}><span aria-live="polite">{state.status === "error" ? "READ ERROR" : state.status === "loading" ? "LOADING…" : state.status === "switching" ? "CHANGING DISC…" : state.status === "playing" ? "NOW PLAYING" : state.status === "paused" ? "PAUSED" : state.status === "stopped" ? "STOPPED" : "PRESS PLAY"}</span><span>{track.title}</span></div>
    {state.error && <p role="alert" className={styles.audioError}>{state.error} Use PLAY to retry, or ▶▶ to skip.</p>}
    <details className={styles.credits}><summary>MUSIC CREDITS</summary>{musicTracks.map(item=><div key={item.id}><p>{item.title} — {item.artist}</p></div>)}</details>
  </motion.div>;
}
