export type MusicStatus = "idle" | "loading" | "playing" | "paused" | "switching" | "error";
export type MusicSnapshot = {
  powered: boolean;
  status: MusicStatus; track: number; volume: number; muted: boolean;
  wantsPlaying: boolean; phase: "seated" | "out" | "in"; time: number; error: string;
  exchangeStartedAt: number | null;
};
export interface MediaPort {
  readonly currentTime: number;
  setSource(src: string): void;
  unlock(): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  gain(value: number, seconds: number): void;
  listen(listener: (event: string) => void): void;
  sample(): Uint8Array;
  dispose(): void;
}
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** One transport per homepage. Visual state never owns or starts the audio. */
export class MusicController {
  private snapshot: MusicSnapshot = { powered:false,status: "idle", track: 0, volume: .25, muted: false, wantsPlaying: false, phase: "seated", time: 0, error: "", exchangeStartedAt:null };
  private listeners = new Set<() => void>();
  private media?: MediaPort;
  private serial = 0;
  private exchanging = false;
  private exchangeSerial=0;
  private disposed = false;
  private pauseTimer?: ReturnType<typeof setTimeout>;
  constructor(private tracks: readonly { id: string; src: string }[], private createMedia: () => MediaPort) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<MusicSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private level() { return this.snapshot.muted ? 0 : this.snapshot.volume; }
  private ensureMedia() {
    if (!this.media) {
      this.media = this.createMedia();
      this.media.setSource(this.tracks[this.snapshot.track].src);
      this.media.listen(event => {
        if (this.disposed) return;
        if (event === "ended" && this.snapshot.wantsPlaying) void this.next();
        if (event === "error") this.fail();
        if (event === "timeupdate") this.update({ time: this.media?.currentTime || 0 });
        if (!this.exchanging && this.snapshot.wantsPlaying) {
          if (event === "waiting") this.update({ status: "loading" });
          if (event === "playing") { this.media?.gain(this.level(), .2); this.update({ status: "playing" }); }
        }
      });
    }
    return this.media;
  }
  private fail() {
    if (this.disposed) return;
    ++this.serial; ++this.exchangeSerial; this.exchanging=false; this.media?.pause();
    this.update({ status: "error", wantsPlaying: false, phase: "seated", exchangeStartedAt:null, error: "Audio could not start. Retry, or skip this track." });
  }
  private async start() {
    const token = ++this.serial;
    try {
      const media = this.ensureMedia();
      media.gain(0, 0);
      // Both are invoked before any await: first playback stays in the click's
      // user-activation task. Resume failures are handled, never swallowed.
      const unlocked = media.unlock();
      const playback = media.play();
      await Promise.all([unlocked, playback]);
      if (this.disposed || token !== this.serial || !this.snapshot.wantsPlaying) {
        if (this.disposed || this.exchanging || !this.snapshot.wantsPlaying) media.pause();
        return;
      }
      media.gain(this.level(), .2);
      if (!this.exchanging) this.update({ status: "playing", error: "" });
    } catch {
      if (!this.disposed && token === this.serial && this.snapshot.wantsPlaying) this.fail();
    }
  }
  play = async () => {
    if (this.disposed || this.snapshot.wantsPlaying) return;
    if (this.snapshot.status === "error" && this.media) this.media.setSource(this.tracks[this.snapshot.track].src);
    this.update({ powered:true,wantsPlaying: true, status: this.exchanging ? "switching" : "loading", error: "" });
    if (!this.exchanging) await this.start();
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
  powerOff = () => { this.pause();this.update({powered:false}); };
  next = async () => {
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
    const track = (this.snapshot.track + 1) % this.tracks.length;
    this.media?.setSource(this.tracks[track].src);
    this.update({ track, time: 0, phase: "in" });
    await wait(220); if (cancelled()) return;
    this.update({ phase: "seated" });
    await wait(200); if (cancelled()) return;
    this.exchanging = false;
    this.update({exchangeStartedAt:null,status:this.snapshot.wantsPlaying?"loading":"paused"});
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
  dispose = () => {
    this.disposed = true; ++this.serial; ++this.exchangeSerial;clearTimeout(this.pauseTimer);
    this.media?.dispose(); this.media = undefined;
    this.update({ powered:false,status: "idle", wantsPlaying: false, phase: "seated", time: 0,exchangeStartedAt:null });
    this.listeners.clear();
  };
}
