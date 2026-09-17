import type { MediaPort } from "./music-controller";
import { DECK_ANALYSER } from "./deck-beat-meter";

/** Created only by a user playback gesture, not by mounting or scrolling. */
export function createBrowserAudio(): MediaPort {
  const audio = document.createElement("audio");
  audio.preload = "none"; audio.hidden = true; audio.dataset.jackieAudio = "true";
  document.body.appendChild(audio);
  let context: AudioContext | undefined;
  let source: MediaElementAudioSourceNode | undefined;
  let gain: GainNode | undefined;
  let analyser: AnalyserNode | undefined;
  let listener: (event: string) => void = () => {};
  let data = new Uint8Array(128);
  const events = ["ended", "error", "waiting", "playing", "timeupdate"];
  const relay = (event: Event) => listener(event.type);
  events.forEach(event => audio.addEventListener(event, relay));
  return {
    get currentTime() { return audio.currentTime; },
    setSource(src) { audio.src = src; audio.load(); },
    unlock() {
      if (!context && typeof AudioContext !== "undefined") {
        context = new AudioContext();
        gain = context.createGain(); gain.gain.value = 0;
        // Wide window, light smoothing: bass transients survive as their own bins
        // instead of being averaged flat by the analyser before the meter sees them.
        analyser = Object.assign(context.createAnalyser(), DECK_ANALYSER);
        data = new Uint8Array(analyser.frequencyBinCount);
        source = context.createMediaElementSource(audio);
        source.connect(analyser); analyser.connect(gain); gain.connect(context.destination);
      }
      // Restore the native element's gain: volume lives in the GainNode when
      // Web Audio is available, avoiding two multiplied volume controls.
      if (context) audio.volume = 1;
      return context?.state === "suspended" ? context.resume() : Promise.resolve();
    },
    play() { return audio.play(); },
    pause() { audio.pause(); },
    gain(value, seconds) {
      if (gain && context) {
        const now = context.currentTime;
        gain.gain.cancelAndHoldAtTime(now);
        gain.gain.linearRampToValueAtTime(value, now + seconds);
      } else audio.volume = value;
    },
    listen(callback) { listener = callback; },
    sample() { analyser?.getByteFrequencyData(data); return data; },
    dispose() {
      audio.pause(); events.forEach(event => audio.removeEventListener(event, relay));
      audio.removeAttribute("src"); audio.load(); audio.remove();
      source?.disconnect(); analyser?.disconnect(); gain?.disconnect();
      if (context && context.state !== "closed") void context.close().catch(() => {});
    },
  };
}
