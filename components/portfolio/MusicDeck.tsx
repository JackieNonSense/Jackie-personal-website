"use client";
import { useEffect,useRef } from "react";
import { motion } from "framer-motion";
import type { MusicController, MusicSnapshot } from "./music-controller";
import { musicTracks } from "./music-tracks";
import { useObjectVisibility } from "./use-object-visibility";
import { whenUserHasEngaged } from "./user-engagement";
import { audioAllowed } from "./browser-audio";
import Y2kDeck from "./y2k-deck/Y2kDeck";
import styles from "./Devices.module.css";

export default function MusicDeck({ player, state, still, onVisibility }: { player: MusicController; state: MusicSnapshot; still: boolean; onVisibility: (visible: boolean) => void }) {
  const { ref, near, visible, drawing } = useObjectVisibility();
  useEffect(() => onVisibility(visible), [visible, onVisibility]);
  // The deck wakes itself the first time it is actually on screen, so the page
  // demonstrates that its objects work instead of waiting for a click. Once only:
  // powering off is a decision, and scrolling away must not undo it.
  const woke = useRef(false), disarm = useRef<() => void>(() => {});
  useEffect(() => {
    if (!visible || woke.current) return;
    woke.current = true;
    player.powerOn();
    const ready = () => { const now = player.getSnapshot(); return now.powered && !now.wantsPlaying && now.status !== "error"; };
    // If the browser already lets this page make sound, the music comes up with the
    // machine. Otherwise the deck stays armed - through scrolling away and back - and
    // sounds on the first real gesture anywhere on the page.
    const arm = () => {
      disarm.current = whenUserHasEngaged(event => {
        // A first press on the deck's own keys means the visitor is working it themselves.
        if (event?.target instanceof Element && event.target.closest("[data-deck-controls]")) return;
        if (ready()) void player.play();
      });
    };
    if (!audioAllowed()) { arm(); return; }
    // Allowed on paper; if the browser still refuses, the start fails quietly and waits.
    void player.autoplay().then(() => { if (player.getSnapshot().status === "idle") arm(); });
  }, [visible, player]);
  useEffect(() => () => disarm.current(), []);
  const track = musicTracks[state.track];
  return <motion.div ref={ref} className={styles.deck} data-testid="music-deck" data-power={state.powered?'on':'off'} data-status={state.status} initial={false} whileInView={{opacity:1}}>
    <div className={styles.objectKicker}><span>PERSONAL SOUNDTRACK</span><span>CD / STEREO</span></div>
    <Y2kDeck near={near} active={drawing} player={player} state={state} still={still}/>
    <div className={styles.deckCaption}><span aria-live="polite">{state.status === "error" ? "READ ERROR" : state.status === "loading" ? "LOADING…" : state.status === "switching" ? "CHANGING DISC…" : state.status === "playing" ? "NOW PLAYING" : state.status === "paused" ? "PAUSED" : state.status === "stopped" ? "STOPPED" : "PRESS PLAY"}</span><span>{track.title}</span></div>
    {state.error && <p role="alert" className={styles.audioError}>{state.error} Use PLAY to retry, or ▶▶ to skip.</p>}
    <details className={styles.credits}><summary>MUSIC CREDITS</summary>{musicTracks.map(item=><div key={item.id}><p>{item.title} — {item.artist}</p></div>)}</details>
  </motion.div>;
}
