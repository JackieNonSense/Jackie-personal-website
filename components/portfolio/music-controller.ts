export type MusicStatus = "idle" | "loading" | "playing" | "paused" | "stopped" | "switching" | "error";
/** Normalised mechanism position, resolved from the power clock alone. A reversal
 * mid-travel resumes from the partial value instead of restarting the traverse. */
export function deckDeployment(from: number, at: number, target: number, ms: number, now: number) {
  if (ms <= 0) return target;
  return Math.max(0, Math.min(1, from + Math.sign(target - from) * Math.min(Math.abs(target - from), (now - at) / ms)));
}
export type MusicSnapshot = {
  powered: boolean;
  status: MusicStatus; track: number; volume: number; muted: boolean;
  wantsPlaying: boolean; phase: "seated" | "out" | "in"; time: number; duration: number; error: string;
  exchangeStartedAt: number | null;
};
export interface MediaPort {
  readonly currentTime: number;
  /** Seconds, or 0 until the metadata has arrived. */
  readonly duration?: number;
  seek?(seconds: number): void;
  setSource(src: string): void;
  unlock(): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  gain(value: number, seconds: number): void;
  listen(listener: (event: string) => void): void;
  sample(): Uint8Array;
  /** Time-domain samples, -1..1: the mono mix and each channel, for the oscilloscope. */
  wave?(): Float32Array;
  stereo?(): readonly [Float32Array, Float32Array];
  dispose(): void;
}
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** One transport per homepage. Visual state never owns or starts the audio. */
export class MusicController {
  private deployFrom = 0; private deployAt = 0; private deployTarget = 0; private deployMs = 0;
  private deploying = false; private deployTimer?: ReturnType<typeof setTimeout>;
  private snapshot: MusicSnapshot = { powered:false,status: "idle", track: 0, volume: .25, muted: false, wantsPlaying: false, phase: "seated", time: 0, duration: 0, error: "", exchangeStartedAt:null };
  private listeners = new Set<() => void>();
  private media?: MediaPort;
  private serial = 0;
  private exchanging = false;
  private exchangeSerial=0;
  private disposed = false;
  private halted = false;
  private pauseTimer?: ReturnType<typeof setTimeout>;
  constructor(private tracks: readonly { id: string; src: string }[], private createMedia: () => MediaPort) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<MusicSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private level() { return this.snapshot.muted ? 0 : this.snapshot.volume; }
  // The mechanism's position comes from the power clock itself, never from a
  // separate animation timer, so an interrupted retraction resumes from where it
  // actually stopped and the audio waits only for the travel that is left.
  private deployed(now = performance.now()) { return deckDeployment(this.deployFrom, this.deployAt, this.deployTarget, this.deployMs, now); }
  private aimDeploy(target: 0 | 1) { const now = performance.now(); this.deployFrom = this.deployed(now); this.deployAt = now; this.deployTarget = target; }
  /** Milliseconds for a full traverse. Zero — the default — means no mechanism:
   * the non-WebGL fallback swaps a still poster and reduced motion jumps. */
  setDeployMotion = (milliseconds: number) => { const now = performance.now(); this.deployFrom = this.deployed(now); this.deployAt = now; this.deployMs = Math.max(0, milliseconds); };
  private ensureMedia() {
    if (!this.media) {
      this.media = this.createMedia();
      this.media.setSource(this.tracks[this.snapshot.track].src);
      this.media.listen(event => {
        if (this.disposed) return;
        if (event === "ended" && this.snapshot.wantsPlaying) void this.next();
        if (event === "error") this.fail();
        if (event === "timeupdate") this.update({ time: this.media?.currentTime || 0 });
        if (event === "durationchange" || event === "loadedmetadata") this.update({ duration: Number.isFinite(this.media?.duration) ? this.media!.duration! : 0 });
        // The warm-up play fires a real "playing" event; without the deploy guard
        // it would raise the gain and let the track sound behind a folded shell.
        if (!this.exchanging && !this.deploying && this.snapshot.wantsPlaying) {
          if (event === "waiting") this.update({ status: "loading" });
          if (event === "playing") { this.media?.gain(this.level(), .2); this.update({ status: "playing" }); }
        }
      });
    }
    return this.media;
  }
  private fail() {
    if (this.disposed) return;
    if (this.quiet) {
      ++this.serial; this.deploying = false; clearTimeout(this.deployTimer); this.media?.pause();
      this.update({ status: "idle", wantsPlaying: false, error: "" });
      return;
    }
    ++this.serial; ++this.exchangeSerial; this.exchanging=false; this.deploying=false; clearTimeout(this.deployTimer); this.media?.pause();
    this.update({ status: "error", wantsPlaying: false, phase: "seated", exchangeStartedAt:null, error: "Audio could not start. Retry, or skip this track." });
  }
  private async start(holdMs = 0) {
    const token = ++this.serial;
    try {
      const media = this.ensureMedia();
      media.gain(0, 0);
      // The element fires "playing" the moment it starts, which can beat this
      // function's own await, so the deploy guard goes up before the warm-up play
      // rather than after it. Otherwise the listener opens the gain and reports
      // PLAY while the mechanism is still travelling.
      this.deploying = holdMs > 0;
      // Both are invoked before any await: first playback stays in the click's
      // user-activation task. Resume failures are handled, never swallowed.
      const unlocked = media.unlock();
      const playback = media.play();
      await Promise.all([unlocked, playback]);
      if (this.disposed || token !== this.serial || !this.snapshot.wantsPlaying) {
        this.deploying = false;
        if (this.disposed || this.exchanging || !this.snapshot.wantsPlaying) media.pause();
        return;
      }
      if (holdMs > 0) {
        // The disc is warm and the element now carries user activation, but the
        // mechanism is still moving: hold the transport at the start rather than
        // letting the track run on behind a folded shell.
        media.pause();
        await new Promise<void>(resolve => { clearTimeout(this.deployTimer); this.deployTimer = setTimeout(resolve, holdMs); });
        this.deploying = false;
        if (this.disposed || token !== this.serial || !this.snapshot.wantsPlaying) { media.pause(); return; }
        await media.play();
        if (this.disposed || token !== this.serial || !this.snapshot.wantsPlaying) { media.pause(); return; }
      }
      media.gain(this.level(), .2);
      if (!this.exchanging) this.update({ status: "playing", error: "" });
    } catch {
      this.deploying = false;
      if (!this.disposed && token === this.serial && this.snapshot.wantsPlaying) this.fail();
    }
  }
  private quiet = false;
  /** Start without a gesture if the browser allows it; if it refuses, go back to
   * waiting with no error shown. */
  autoplay = async () => {
    if (this.disposed || this.snapshot.wantsPlaying || this.snapshot.status === "error") return;
    this.quiet = true;
    try { await this.play(); } finally { this.quiet = false; }
  };
  play = async () => {
    if (this.disposed || this.snapshot.wantsPlaying) return;
    if (this.snapshot.status === "error" && this.media) this.media.setSource(this.tracks[this.snapshot.track].src);
    const hold = this.exchanging ? 0 : Math.round((1 - this.deployed()) * this.deployMs);
    this.halted = false;
    this.aimDeploy(1);
    this.update({ powered:true,wantsPlaying: true, status: this.exchanging ? "switching" : "loading", error: "" });
    if (!this.exchanging) await this.start(hold);
  };
  pause = () => {
    if (this.disposed) return;
    const token = ++this.serial;
    this.update({ wantsPlaying: false, status: this.exchanging ? "switching" : "paused" });
    this.media?.gain(0, .2);
    clearTimeout(this.pauseTimer);
    this.pauseTimer = setTimeout(() => { if (token === this.serial) this.media?.pause(); }, 200);
  };
  toggle = () => { if (this.snapshot.wantsPlaying) this.pause(); else void this.play(); };
  /** Deploy the mechanism without requesting audio. A machine waking as it comes
   * into view is a visual event; sound stays something the user asks for. */
  powerOn = () => {
    if (this.disposed || this.snapshot.powered) return;
    this.aimDeploy(1);
    this.update({ powered: true });
  };
  powerOff = () => { this.pause();this.aimDeploy(0);this.update({powered:false}); };
  /** Like a tape transport's STOP: fade, halt, and rewind the disc to the start. */
  stop = () => {
    if (this.disposed) return;
    const token = ++this.serial;
    this.halted = true;
    this.update({ wantsPlaying: false, status: this.exchanging ? "switching" : "stopped", time: this.exchanging ? this.snapshot.time : 0 });
    this.media?.gain(0, .2);
    clearTimeout(this.pauseTimer);
    this.pauseTimer = setTimeout(() => { if (token === this.serial) { this.media?.pause(); this.media?.seek?.(0); } }, 200);
  };
  private seekTo(seconds: number) {
    if (!this.media?.seek) return;
    const end = this.snapshot.duration;
    const time = Math.max(0, end > 0 ? Math.min(end - .25, seconds) : seconds);
    this.media.seek(time);
    this.update({ time });
  }
  /** Held ◀◀ / ▶▶ cue through the track in steps, the way a CD scans. */
  scan = (seconds: number) => {
    if (this.disposed || this.exchanging || !this.media) return;
    this.seekTo(this.snapshot.time + seconds);
  };
  /** As on a real CD player: past the first three seconds ◀◀ returns to the top of
   * the track; pressed again from there, it steps back one track. */
  previous = async () => {
    if (this.disposed || this.exchanging) return;
    if (this.snapshot.time > 3 && this.media?.seek) { this.seekTo(0); return; }
    await this.exchange(-1);
  };
  next = () => this.exchange(1);
  private exchange = async (step: 1 | -1) => {
    if (this.disposed || this.exchanging) return;
    this.exchanging = true; ++this.serial;
    const exchange=++this.exchangeSerial;
    const cancelled=()=>this.disposed||exchange!==this.exchangeSerial;
    clearTimeout(this.pauseTimer);
    this.update({ status: "switching", phase: "seated", error: "",exchangeStartedAt:performance.now() });
    this.media?.gain(0, .18);
    await wait(180); if (cancelled()) return;
    this.media?.pause();
    this.update({ phase: "out" });
    await wait(450); if (cancelled()) return;
    const track = (this.snapshot.track + step + this.tracks.length) % this.tracks.length;
    this.media?.setSource(this.tracks[track].src);
    this.update({ track, time: 0, duration: 0, phase: "in" });
    await wait(220); if (cancelled()) return;
    this.update({ phase: "seated" });
    await wait(200); if (cancelled()) return;
    this.exchanging = false;
    this.update({exchangeStartedAt:null,status:this.snapshot.wantsPlaying?"loading":this.halted?"stopped":"paused"});
    // Audio cannot start until the rigid front is seated. Slow loading remains
    // cancellable: next / pause can supersede this promise without reopening it.
    if(this.snapshot.wantsPlaying)await this.start();
  };
  setVolume = (value: number) => {
    this.update({ volume: Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .25 });
    if (this.snapshot.status==="playing") this.media?.gain(this.level(), .03);
  };
  toggleMute = () => {
    this.update({ muted: !this.snapshot.muted });
    if (this.snapshot.status==="playing") this.media?.gain(this.level(), .03);
  };
  sample = () => this.media?.sample();
  wave = () => this.media?.wave?.();
  stereo = () => this.media?.stereo?.();
  dispose = () => {
    this.disposed = true; ++this.serial; ++this.exchangeSerial;clearTimeout(this.pauseTimer);this.deploying=false;clearTimeout(this.deployTimer);
    this.media?.dispose(); this.media = undefined;
    this.update({ powered:false,status: "idle", wantsPlaying: false, phase: "seated", time: 0,exchangeStartedAt:null });
    this.listeners.clear();
  };
}
