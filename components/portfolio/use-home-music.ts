"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MusicController } from "./music-controller";
import { musicTracks } from "./music-tracks";
import { createBrowserAudio } from "./browser-audio";
export function useHomeMusic() {
  const [player] = useState(() => new MusicController(musicTracks, createBrowserAudio));
  const mounted = useRef(false);
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // StrictMode replays setup/cleanup in one task. Actual route departure
      // disposes before the next frame, but the replay cannot kill transport.
      queueMicrotask(() => { if (!mounted.current) player.dispose(); });
    };
  }, [player]);
  return { player, state };
}
