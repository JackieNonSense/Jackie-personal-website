import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// The only double is the browser's media boundary; the real controller owns
// intent, sequencing, cancellation, timing and all observable state.
class MediaBoundary {
  src = ""; currentTime = 0; paused = true; volume = .25; duration = 200;
  listener = (_event: string) => {};
  seek(seconds: number) { this.currentTime = seconds; }
  pending: (() => void) | null = null;
  rejection: Error | null = null;
  deferred = false; disposed = false;
  setSource(src: string) { this.src = src; this.currentTime = 0; }
  unlock() { return Promise.resolve(); }
  play() {
    if (this.rejection) return Promise.reject(this.rejection);
    if (this.deferred) return new Promise<void>(resolve => { this.pending = () => { this.paused = false; resolve(); }; });
    this.paused = false; return Promise.resolve();
  }
  pause() { this.paused = true; }
  gain(value: number) { this.volume = value; }
  listen(listener: (event: string) => void) { this.listener = listener; }
  sample() { return new Uint8Array(128); }
  dispose() { this.pause(); this.disposed = true; }
}
async function setup() {
  const file = resolve("components/portfolio/music-controller.ts");
  expect(existsSync(file), "a real, testable homepage audio controller exists").toBe(true);
  const { MusicController } = await import(file);
  const media = new MediaBoundary();
  let creations = 0;
  const tracks = [{ id: "a", src: "/a.mp3" }, { id: "b", src: "/b.mp3" }];
  const player = new MusicController(tracks, () => { creations++; return media; });
  return { player, media, creations: () => creations };
}
afterEach(() => vi.useRealTimers());
describe("homepage music transport", () => {
  it("deploys on play, stays deployed when paused and retracts only on power off",async()=>{
    vi.useFakeTimers();const {player,media}=await setup();
    expect(player.getSnapshot().powered).toBe(false);await player.play();
    expect(player.getSnapshot().powered).toBe(true);player.pause();
    expect(player.getSnapshot().powered).toBe(true);player.powerOff();
    await vi.advanceTimersByTimeAsync(250);expect(media.paused).toBe(true);
    expect(player.getSnapshot()).toMatchObject({powered:false,wantsPlaying:false});
  });
  it("power off cancels a pending audio start without redeploying",async()=>{
    vi.useFakeTimers();const {player,media}=await setup();media.deferred=true;
    const start=player.play();player.powerOff();media.pending!();await start;
    expect(player.getSnapshot()).toMatchObject({powered:false,wantsPlaying:false});expect(media.paused).toBe(true);
  });
  it("keeps a late previous play resolution silent during an open exchange", async () => {
    vi.useFakeTimers(); const {player,media}=await setup(); media.deferred=true;
    const first=player.play(); void player.next();
    await vi.advanceTimersByTimeAsync(400); media.pending!(); await first;
    expect(media.paused).toBe(true); expect(player.getSnapshot().status).toBe('switching');
    player.dispose();
  });
  it("applies volume changed during buffering when media resumes", async () => {
    const {player,media}=await setup();await player.play();media.listener('waiting');
    player.setVolume(.7);media.listener('playing');expect(media.volume).toBe(.7);
    player.dispose();
  });
  it("cancels exchange timers after a native media error", async () => {
    vi.useFakeTimers();const {player,media}=await setup();await player.play();void player.next();
    await vi.advanceTimersByTimeAsync(300);media.listener('error');
    await vi.advanceTimersByTimeAsync(1500);
    expect(player.getSnapshot()).toMatchObject({status:'error',track:0,exchangeStartedAt:null});
    expect(media.paused).toBe(true);player.dispose();
  });
  it("keeps new audio silent until the 1050ms face closure and exposes the exchange clock", async () => {
    vi.useFakeTimers(); const {player,media}=await setup();await player.play();
    void player.next();const stamp=player.getSnapshot().exchangeStartedAt;
    expect(typeof stamp).toBe('number');
    await vi.advanceTimersByTimeAsync(900);
    expect(media.paused).toBe(true);
    player.setVolume(.9);expect(media.volume).toBe(0);
    await vi.advanceTimersByTimeAsync(200);expect(player.getSnapshot().status).toBe('playing');
  });
  it("starts silent without creating a media resource, at 25 percent", async () => {
    const { player, creations } = await setup();
    expect(player.getSnapshot()).toMatchObject({ status: "idle", volume: .25, track: 0, wantsPlaying: false });
    expect(creations()).toBe(0);
  });
  it("remains loading until actual play resolves", async () => {
    const { player, media } = await setup(); media.deferred = true;
    const playing = player.play();
    expect(player.getSnapshot().status).toBe("loading");
    media.pending!(); await playing;
    expect(player.getSnapshot().status).toBe("playing");
  });
  it("fades, pauses and retains position", async () => {
    vi.useFakeTimers(); const { player, media } = await setup();
    await player.play(); media.currentTime = 18;
    player.pause(); await vi.advanceTimersByTimeAsync(210);
    expect(media.paused).toBe(true); expect(media.currentTime).toBe(18);
    expect(player.getSnapshot().status).toBe("paused");
    await player.play(); expect(media.currentTime).toBe(18);
  });
  it("ignores rapid next and keeps paused track changes silent", async () => {
    vi.useFakeTimers(); const { player, creations } = await setup();
    const exchange = player.next(); void player.next();
    expect(player.getSnapshot().status).toBe("switching");
    await vi.advanceTimersByTimeAsync(1200); await exchange;
    expect(player.getSnapshot()).toMatchObject({ track: 1, status: "paused" });
    expect(creations()).toBe(0);
  });
  it("switches in order and loops on the real ended event", async () => {
    vi.useFakeTimers(); const { player, media } = await setup(); await player.play();
    void player.next(); await vi.advanceTimersByTimeAsync(1200);
    expect(player.getSnapshot()).toMatchObject({ track: 1, status: "playing" });
    expect(media.src).toBe("/b.mp3"); media.listener("ended");
    await vi.advanceTimersByTimeAsync(1200);
    expect(player.getSnapshot()).toMatchObject({ track: 0, status: "playing" });
  });
  it("pause during exchange cannot be undone by its timers", async () => {
    vi.useFakeTimers(); const { player, media } = await setup(); await player.play();
    void player.next(); await vi.advanceTimersByTimeAsync(350); player.pause();
    await vi.advanceTimersByTimeAsync(1500);
    expect(player.getSnapshot()).toMatchObject({ track: 1, status: "paused", wantsPlaying: false });
    expect(media.paused).toBe(true);
  });
  it("pause cancels a late asynchronous play result", async () => {
    vi.useFakeTimers(); const { player, media } = await setup(); media.deferred = true;
    const request = player.play(); player.pause(); media.pending!(); await request;
    await vi.advanceTimersByTimeAsync(250);
    expect(media.paused).toBe(true); expect(player.getSnapshot().status).toBe("paused");
  });
  it("reports permission rejection and supports a real retry", async () => {
    const { player, media } = await setup(); media.rejection = new Error("NotAllowedError");
    await player.play(); expect(player.getSnapshot().status).toBe("error");
    media.rejection = null; await player.play();
    expect(player.getSnapshot().status).toBe("playing");
  });
  it("allows skipping immediately after a new track fails, without a dead control window", async () => {
    vi.useFakeTimers(); const { player, media } = await setup(); await player.play();
    media.rejection = new Error("network failure"); void player.next();
    await vi.advanceTimersByTimeAsync(1060);
    expect(player.getSnapshot().status).toBe("error");
    media.rejection = null; void player.next();
    await vi.advanceTimersByTimeAsync(1200);
    expect(player.getSnapshot()).toMatchObject({ track: 0, status: "paused" });
  });
  it("buffering suspends the playing display; network errors stop transport", async () => {
    const { player, media } = await setup(); await player.play();
    media.listener("waiting"); expect(player.getSnapshot().status).toBe("loading");
    media.listener("playing"); expect(player.getSnapshot().status).toBe("playing");
    media.listener("error"); expect(player.getSnapshot().status).toBe("error");
    expect(media.paused).toBe(true);
  });
  it("clamps volume and mutes without changing transport intent", async () => {
    const { player, media } = await setup(); await player.play();
    player.setVolume(2); expect(player.getSnapshot().volume).toBe(1);
    player.toggleMute(); expect(media.volume).toBe(0);
    expect(player.getSnapshot().status).toBe("playing");
    player.toggleMute(); expect(media.volume).toBe(1);
  });
  it("steps back a track from the top, and back to the top from inside one", async () => {
    vi.useFakeTimers(); const { player, media } = await setup(); await player.play();
    void player.previous(); await vi.advanceTimersByTimeAsync(1200);
    expect(player.getSnapshot()).toMatchObject({ track: 1, status: "playing" });
    expect(media.src).toBe("/b.mp3");
    media.currentTime = 42; media.listener("timeupdate");
    await player.previous();
    expect(player.getSnapshot()).toMatchObject({ track: 1, time: 0 });
    expect(media.currentTime).toBe(0);
  });
  it("stops: fades, halts, rewinds, and stays stopped across a track change", async () => {
    vi.useFakeTimers(); const { player, media } = await setup(); await player.play();
    media.currentTime = 30; media.listener("timeupdate");
    player.stop(); expect(player.getSnapshot()).toMatchObject({ status: "stopped", wantsPlaying: false, time: 0 });
    await vi.advanceTimersByTimeAsync(210);
    expect(media.paused).toBe(true); expect(media.currentTime).toBe(0);
    void player.next(); await vi.advanceTimersByTimeAsync(1200);
    expect(player.getSnapshot()).toMatchObject({ track: 1, status: "stopped" });
    await player.play(); expect(player.getSnapshot().status).toBe("playing");
  });
  it("scans within the track and never past its ends", async () => {
    const { player, media } = await setup(); await player.play();
    media.listener("durationchange"); expect(player.getSnapshot().duration).toBe(200);
    player.scan(10); player.scan(10); expect(media.currentTime).toBe(20);
    player.scan(-60); expect(media.currentTime).toBe(0);
    player.scan(500); expect(media.currentTime).toBeCloseTo(199.75);
    expect(player.getSnapshot().time).toBeCloseTo(199.75);
  });
  it("forgets the old track's length while the next one loads", async () => {
    vi.useFakeTimers(); const { player, media } = await setup(); await player.play();
    media.listener("loadedmetadata"); expect(player.getSnapshot().duration).toBe(200);
    void player.next(); await vi.advanceTimersByTimeAsync(700);
    expect(player.getSnapshot().duration).toBe(0);
  });
  it("route disposal stops media and prevents pending exchange resurrection", async () => {
    vi.useFakeTimers(); const { player, media } = await setup(); await player.play();
    void player.next(); player.dispose(); await vi.advanceTimersByTimeAsync(2000);
    expect(media.disposed).toBe(true); expect(media.paused).toBe(true);
    expect(player.getSnapshot().status).not.toBe("playing");
  });
});
