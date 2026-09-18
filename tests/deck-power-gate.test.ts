import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";

// Same boundary idiom as music-controller.test.ts, plus a record of every gain
// request so a test can prove the deck stayed silent rather than merely paused.
class MediaBoundary {
  src = ""; currentTime = 0; paused = true; volume = 0;
  gains: number[] = []; plays = 0;
  listener = (_event: string) => {};
  setSource(src: string) { this.src = src; this.currentTime = 0; }
  unlock() { return Promise.resolve(); }
  play() { this.plays++; this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  gain(value: number) { this.gains.push(value); this.volume = value; }
  listen(listener: (event: string) => void) { this.listener = listener; }
  sample() { return new Uint8Array(128); }
  dispose() { this.pause(); }
}
async function setup(deployMs?: number) {
  const { MusicController } = await import(resolve("components/portfolio/music-controller.ts"));
  const media = new MediaBoundary();
  const player = new MusicController([{ id: "a", src: "/a.mp3" }, { id: "b", src: "/b.mp3" }], () => media);
  if (deployMs !== undefined) player.setDeployMotion(deployMs);
  return { player, media };
}
const settle = () => vi.advanceTimersByTimeAsync(0);
const loud = (media: MediaBoundary) => media.gains.some(value => value > 0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("power transition gate", () => {
  it("accepts the press, holds the transport silent, then plays once the mechanism is seated", async () => {
    const { player, media } = await setup(1600);
    const playing = player.play(); await settle();
    expect(player.getSnapshot()).toMatchObject({ powered: true, wantsPlaying: true, status: "loading" });
    expect(media.paused).toBe(true);
    expect(loud(media), "no audible gain while the deck is still deploying").toBe(false);
    await vi.advanceTimersByTimeAsync(1599);
    expect(player.getSnapshot().status).toBe("loading"); expect(media.paused).toBe(true);
    await vi.advanceTimersByTimeAsync(2); await playing;
    expect(player.getSnapshot().status).toBe("playing");
    expect(media.paused).toBe(false); expect(media.volume).toBe(.25);
  });

  it("warms the element inside the gesture so deferred playback keeps its user activation", async () => {
    const { player, media } = await setup(1600);
    void player.play();
    // Synchronous with the click: unlock and play happen before any await.
    expect(media.plays).toBe(1);
    await settle(); expect(media.paused).toBe(true);
    await vi.advanceTimersByTimeAsync(1600);
    expect(media.plays).toBe(2); expect(media.paused).toBe(false);
  });

  it("a playing event cannot breach the gate, even before the play promise resolves", async () => {
    const { player, media } = await setup(1600);
    void player.play();
    // The element reports "playing" the instant it starts, which races start()'s
    // own await; the gate must already be closed at that point.
    media.listener("playing");
    expect(loud(media)).toBe(false);
    expect(player.getSnapshot().status).toBe("loading");
    await settle();
    media.listener("playing"); media.listener("waiting");
    expect(loud(media)).toBe(false);
    expect(player.getSnapshot().status).toBe("loading");
    await vi.advanceTimersByTimeAsync(1600);
    expect(media.volume).toBe(.25);
  });

  it("waits only for the travel that is actually left after an interrupted retraction", async () => {
    const { player, media } = await setup(1600);
    void player.play(); await vi.advanceTimersByTimeAsync(1600);
    expect(player.getSnapshot().status).toBe("playing");
    player.powerOff(); await vi.advanceTimersByTimeAsync(800);
    const again = player.play(); await settle();
    expect(player.getSnapshot()).toMatchObject({ powered: true, status: "loading" });
    await vi.advanceTimersByTimeAsync(700);
    expect(player.getSnapshot().status).toBe("loading");
    await vi.advanceTimersByTimeAsync(200); await again;
    expect(player.getSnapshot().status).toBe("playing"); expect(media.paused).toBe(false);
  });

  it("power off during the gate cancels the pending start outright", async () => {
    const { player, media } = await setup(1600);
    void player.play(); await vi.advanceTimersByTimeAsync(400);
    player.powerOff(); await vi.advanceTimersByTimeAsync(4000);
    expect(player.getSnapshot()).toMatchObject({ powered: false, wantsPlaying: false });
    expect(media.paused).toBe(true); expect(media.volume).toBe(0);
  });

  it("is instant by default, so the non-WebGL fallback and reduced motion never wait", async () => {
    const { player, media } = await setup();
    await player.play();
    expect(player.getSnapshot().status).toBe("playing");
    expect(media.paused).toBe(false); expect(media.volume).toBe(.25);
    const still = await setup(0);
    await still.player.play();
    expect(still.player.getSnapshot().status).toBe("playing"); expect(still.media.paused).toBe(false);
  });
});

describe("waking the mechanism without asking for audio", () => {
  // Counting factory: proves powerOn never reaches for the media boundary.
  async function cold() {
    const { MusicController } = await import(resolve("components/portfolio/music-controller.ts"));
    const media = new MediaBoundary();
    let creations = 0;
    const player = new MusicController([{ id: "a", src: "/a.mp3" }], () => { creations++; return media; });
    return { player, media, creations: () => creations };
  }

  it("deploys and lights the deck while leaving the transport silent", async () => {
    const { player, media, creations } = await cold();
    player.powerOn();
    expect(player.getSnapshot()).toMatchObject({ powered: true, wantsPlaying: false, status: "idle" });
    // No <audio>, no AudioContext: a machine waking up is a visual event only.
    expect(creations()).toBe(0);
    expect(media.plays).toBe(0);
    expect(loud(media)).toBe(false);
  });

  it("counts as travel already made, so a later play waits only for what is left", async () => {
    const { player, media } = await cold();
    player.setDeployMotion(1600);
    player.powerOn();
    await vi.advanceTimersByTimeAsync(1600);
    const playing = player.play(); await settle();
    // Already deployed: audio starts without a second mechanism wait.
    expect(player.getSnapshot().status).toBe("playing");
    expect(media.paused).toBe(false);
    await playing;
  });

  it("is idempotent, and never overrides a deliberate power off", async () => {
    const { player } = await cold();
    player.powerOn();
    const first = player.getSnapshot();
    player.powerOn();
    expect(player.getSnapshot()).toBe(first);
    player.powerOff(); await vi.advanceTimersByTimeAsync(250);
    expect(player.getSnapshot().powered).toBe(false);
    // The controller still permits it; "wake only once" is the component's rule.
    player.powerOn();
    expect(player.getSnapshot().powered).toBe(true);
  });
});
