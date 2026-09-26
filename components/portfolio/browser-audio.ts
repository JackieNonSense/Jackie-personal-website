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
  let splitter: ChannelSplitterNode | undefined;
  let left: AnalyserNode | undefined, right: AnalyserNode | undefined;
  let mono = new Float32Array(2048);
  let channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [new Float32Array(1024), new Float32Array(1024)];
  let listener: (event: string) => void = () => {};
  let data = new Uint8Array(128);
  const events = ["ended", "error", "waiting", "playing", "timeupdate", "durationchange", "loadedmetadata"];
  const relay = (event: Event) => listener(event.type);
  events.forEach(event => audio.addEventListener(event, relay));
  return {
    get currentTime() { return audio.currentTime; },
    get duration() { return Number.isFinite(audio.duration) ? audio.duration : 0; },
    seek(seconds) { audio.currentTime = seconds; },
    setSource(src) { audio.src = src; audio.load(); },
    unlock() {
      if (!context && typeof AudioContext !== "undefined") {
        context = new AudioContext();
        gain = context.createGain(); gain.gain.value = 0;
        // Wide window, light smoothing: bass transients survive as their own bins
        // instead of being averaged flat by the analyser before the meter sees them.
        analyser = Object.assign(context.createAnalyser(), DECK_ANALYSER);
        data = new Uint8Array(analyser.frequencyBinCount);
        mono = new Float32Array(analyser.fftSize);
        // The channels are read on a side branch for the scope's X-Y mode; the
        // playback path is untouched, so a mono file still plays in both ears.
        splitter = context.createChannelSplitter(2);
        left = Object.assign(context.createAnalyser(), { fftSize: 1024, smoothingTimeConstant: 0 });
        right = Object.assign(context.createAnalyser(), { fftSize: 1024, smoothingTimeConstant: 0 });
        channels = [new Float32Array(left.fftSize), new Float32Array(right.fftSize)];
        source = context.createMediaElementSource(audio);
        source.connect(analyser); analyser.connect(gain); gain.connect(context.destination);
        source.connect(splitter); splitter.connect(left, 0); splitter.connect(right, 1);
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
    wave() { analyser?.getFloatTimeDomainData(mono); return mono; },
    stereo() { left?.getFloatTimeDomainData(channels[0]); right?.getFloatTimeDomainData(channels[1]); return channels; },
    dispose() {
      audio.pause(); events.forEach(event => audio.removeEventListener(event, relay));
      audio.removeAttribute("src"); audio.load(); audio.remove();
      source?.disconnect(); splitter?.disconnect(); left?.disconnect(); right?.disconnect(); analyser?.disconnect(); gain?.disconnect();
      if (context && context.state !== "closed") void context.close().catch(() => {});
    },
  };
}

/** Whether sound may start without a gesture: after any earlier interaction, or when
 * the browser has decided this site may autoplay (Chrome does for sites where the
 * visitor often plays media). A throwaway AudioContext says so by starting running. */
export function audioAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (navigator.userActivation?.hasBeenActive) return true;
  const policy = (navigator as Navigator & { getAutoplayPolicy?: (type: string) => string }).getAutoplayPolicy?.("audiocontext");
  if (policy) return policy === "allowed";
  if (typeof AudioContext === "undefined") return false;
  try { const probe = new AudioContext(); const running = probe.state === "running"; void probe.close(); return running; } catch { return false; }
}
