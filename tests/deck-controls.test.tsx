import { createElement, useSyncExternalStore } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MusicDeck from '../components/portfolio/MusicDeck';
import { MusicController, type MediaPort } from '../components/portfolio/music-controller';
import { musicTracks } from '../components/portfolio/music-tracks';

// Browser media and Canvas drawing are boundaries unavailable in JSDOM.
// The rendered controls, subscriptions and controller cancellation remain real.
vi.mock('../components/portfolio/y2k-deck/Y2kScene',()=>({default:()=>null}));
class AudioBoundary implements MediaPort {
  src = '';
  currentTime = 0;
  paused = true;
  output = 0;
  rejection: Error | null = null;
  listener: (event: string) => void = () => {};
  setSource(src: string) { this.src = src; this.currentTime = 0; }
  unlock() { return Promise.resolve(); }
  play() {
    if (this.rejection) return Promise.reject(this.rejection);
    this.paused = false; return Promise.resolve();
  }
  pause() { this.paused = true; }
  gain(value: number) { this.output = value; }
  listen(listener: (event: string) => void) { this.listener = listener; }
  sample() { return new Uint8Array(128); }
  dispose() { this.pause(); }
}

const players: MusicController[] = [];
function Harness({ player }: { player: MusicController }) {
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  return createElement(MusicDeck, { player, state, still: true, onVisibility: () => {} });
}
function setup() {
  const audio = new AudioBoundary();
  let creations = 0;
  const player = new MusicController(musicTracks, () => { creations++; return audio; });
  players.push(player);
  render(createElement(Harness, { player }));
  return { player, audio, creations: () => creations };
}
async function click(name: string) {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name })); });
}
async function advance(milliseconds: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup(); players.splice(0).forEach(player => player.dispose()); vi.useRealTimers();
});

describe('integrated deck HTML control wiring', () => {
  it('starts with Fly high and cycles through the three supplied tracks before returning to it', async () => {
    const { player, audio, creations } = setup();
    expect(creations()).toBe(0);
    expect(player.getSnapshot()).toMatchObject({ track: 0, wantsPlaying: false });
    await click('播放音乐');
    expect(audio.src).toBe('/audio/fly-high-cut.mp3');
    for (const [track, src] of [[1, '/audio/ilyhiryu-army-mov.mp3'], [2, '/audio/2z2-diva.mp3'], [0, '/audio/fly-high-cut.mp3']] as const) {
      await click('下一首'); await advance(1100);
      expect(player.getSnapshot()).toMatchObject({ track, status: 'playing' });
      expect(audio.src).toBe(src);
    }
  });

  it('the model power key really switches power off, rather than only pausing', async () => {
    const { player, audio } = setup();
    await click('开启音乐台');
    expect(player.getSnapshot()).toMatchObject({ powered: true, status: 'playing' });
    expect(audio.paused).toBe(false);
    expect(screen.getByRole('button', { name: '关闭音乐台' })).toHaveAttribute('aria-pressed', 'true');
    await click('关闭音乐台'); await advance(220);
    expect(player.getSnapshot()).toMatchObject({ powered: false, wantsPlaying: false });
    expect(audio.paused).toBe(true);
    expect(screen.getByRole('button', { name: '开启音乐台' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('PLAY pauses the music without turning the model power off', async () => {
    const { player, audio } = setup();
    await click('播放音乐');
    audio.currentTime = 24;
    await click('暂停音乐'); await advance(220);
    expect(player.getSnapshot()).toMatchObject({ powered: true, status: 'paused', wantsPlaying: false });
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(24);
    expect(screen.getByRole('button', { name: '关闭音乐台' })).toBeEnabled();
    expect(screen.getByTestId('music-deck')).toHaveAttribute('data-power', 'on');
  });

  it('disables SEEK during exchange while leaving pause available and effective', async () => {
    const { player, audio } = setup();
    await click('播放音乐'); await click('下一首');
    expect(screen.getByRole('button', { name: '下一首' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '暂停音乐' })).toBeEnabled();
    await click('下一首'); // A disabled native key cannot queue another change.
    await click('暂停音乐'); await advance(1200);
    expect(player.getSnapshot()).toMatchObject({ track: 1, powered: true, wantsPlaying: false, status: 'paused' });
    expect(audio.paused).toBe(true);
    expect(screen.getByRole('button', { name: '下一首' })).toBeEnabled();
  });

  it('the model POWER key stays effective during a pending track change', async () => {
    const { player, audio } = setup();
    await click('播放音乐'); await click('下一首'); await click('关闭音乐台');
    await advance(1400);
    expect(player.getSnapshot()).toMatchObject({ powered: false, wantsPlaying: false });
    expect(audio.paused).toBe(true);
    expect(screen.getByRole('button', { name: '开启音乐台' })).toBeEnabled();
  });

  it('a rejected start exposes a working retry on the same physical PLAY key', async () => {
    const { player, audio } = setup();
    audio.rejection = new Error('NotAllowedError');
    await click('播放音乐');
    expect(screen.getByRole('alert')).toHaveTextContent('Audio could not start');
    const retry = screen.getByRole('button', { name: '重试播放' });
    expect(retry.closest('[data-deck-controls="integrated"]')).not.toBeNull();
    expect(retry).toBeEnabled();
    audio.rejection = null;
    await click('重试播放');
    expect(player.getSnapshot()).toMatchObject({ powered: true, status: 'playing', error: '' });
    expect(audio.paused).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('the VOL rocker and MUTE change actual audio gain without changing playback intent', async () => {
    const { player, audio } = setup();
    await click('播放音乐');
    await click('音量加，当前 25%'); await click('音量加，当前 30%');
    expect(player.getSnapshot().volume).toBeCloseTo(.35);
    expect(audio.output).toBeCloseTo(.35);
    await click('音量减，当前 35%');
    expect(player.getSnapshot().volume).toBeCloseTo(.3);
    await click('静音音乐');
    expect(screen.getByRole('button', { name: '取消静音' })).toHaveAttribute('aria-pressed', 'true');
    expect(audio.output).toBe(0);
    expect(player.getSnapshot()).toMatchObject({ powered: true, status: 'playing', wantsPlaying: true });
    await click('取消静音');
    expect(audio.output).toBeCloseTo(.3);
  });

  it('◀◀ goes back a track, ■ stops and rewinds, and neither needs audio to exist first', async () => {
    const { player, creations } = setup();
    await click('上一首'); await advance(1200);
    expect(player.getSnapshot()).toMatchObject({ track: 2, wantsPlaying: false });
    expect(creations()).toBe(0);
    await click('播放音乐'); await click('停止'); await advance(250);
    expect(player.getSnapshot()).toMatchObject({ status: 'stopped', wantsPlaying: false, time: 0 });
  });

  it('keeps every transport control within the model surface through play and pause', async () => {
    setup(); await click('播放音乐'); await click('暂停音乐');
    const deck = screen.getByTestId('music-deck');
    const group = within(deck).getByRole('group', { name: '音乐台机身控制' });
    expect(group.closest('[data-deck-renderer]')).not.toBeNull();
    for (const control of deck.querySelectorAll('button')) {
      if (control.closest('details')) continue;
      expect(group.contains(control)).toBe(true);
    }
    for (const name of ['关闭音乐台', '上一首', '播放音乐', '停止', '下一首', '静音音乐', '音量加，当前 25%', '音量减，当前 25%']) {
      expect(within(deck).getAllByRole('button', { name })).toHaveLength(1);
    }
  });

  it('uses focusable native buttons without suppressing keyboard activation', () => {
    const { creations } = setup();
    const group = screen.getByRole('group', { name: '音乐台机身控制' });
    for (const button of within(group).getAllByRole('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
      expect(button.tabIndex).toBe(0);
      act(() => button.focus());
      expect(button).toHaveFocus();
      expect(fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })).toBe(true);
      fireEvent.keyUp(button, { key: 'Enter', code: 'Enter' });
      expect(fireEvent.keyDown(button, { key: ' ', code: 'Space' })).toBe(true);
      fireEvent.keyUp(button, { key: ' ', code: 'Space' });
    }
    expect(creations()).toBe(0);
    // JSDOM does not generate the browser's click from key events; actual
    // Enter/Space activation remains part of the parent's real-browser audit.
  });
});
