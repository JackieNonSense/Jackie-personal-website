"use client";
/* eslint-disable @next/next/no-img-element */
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import type { MusicController, MusicSnapshot } from '../music-controller';
import type { KeyRect } from './Y2kScene';
import { DECK_KEYS, FRAME, projectPoint, scrollProgress, type DeckKey } from './stage';
import layout from './keys.json';
import { POWER_ON_MS } from './sequence';
import styles from './Y2kDeck.module.css';

const Scene = lazy(() => import('./Y2kScene'));

class Boundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Where each key sits on the still poster: the same camera, projected without WebGL. */
function posterRects(): Record<DeckKey, KeyRect> {
  const out = {} as Record<DeckKey, KeyRect>;
  const place = (name: keyof typeof layout, top = 0, part = 1) => {
    const { center, size } = layout[name];
    const a = projectPoint([center[0] - size[0] / 2, center[1] + size[1] / 2, center[2]], 0, 4);
    const b = projectPoint([center[0] + size[0] / 2, center[1] - size[1] / 2, center[2]], 0, 4);
    const h = b.top - a.top;
    return { left: a.left, top: a.top + h * top, width: b.left - a.left, height: h * part };
  };
  out.prev = place('prev'); out.play = place('play'); out.stop = place('stop'); out.next = place('next');
  out.mute = place('mute'); out.power = place('power'); out.eject = place('eject');
  out.volup = place('rocker', 0, .5); out.voldown = place('rocker', .5, .5);
  return out;
}
const POSTER = posterRects();

type Props = { near: boolean; active: boolean; still: boolean; player: MusicController; state: MusicSnapshot };

/* On a phone the machine's slats are a few pixels tall, far too small to press, so a
 * touch strip in the machine's own finish takes over under it. Pressing a key on the
 * strip still presses the key on the machine. */
const TOUCH = '(max-width: 760px)';
const subscribeTouch = (change: () => void) => {
  if (typeof matchMedia === 'undefined') return () => {};
  const query = matchMedia(TOUCH); query.addEventListener('change', change);
  return () => query.removeEventListener('change', change);
};
const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia(TOUCH).matches;
const ICON: Record<DeckKey, ReactNode> = {
  prev: <path d="M11 6v12L3 12zM20 6v12l-8-6z" />,
  play: <path d="M3 6v12l9-6zM14 6h2.4v12H14zM18.6 6H21v12h-2.4z" />,
  stop: <path d="M6 6h12v12H6z" />,
  next: <path d="M4 6v12l8-6zM13 6v12l8-6z" />,
  voldown: <path d="M5 11h14v2H5z" />,
  volup: <path d="M5 11h14v2H5zM11 5h2v14h-2z" />,
  mute: <path d="M4 9h4l5-4v14l-5-4H4zM15.6 9.1l1.4-1.4 2 2 2-2 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2z" />,
  eject: <path d="M12 5l8 9H4zM4 16h16v2.5H4z" />,
  power: <path d="M11 3h2v9h-2zM7.1 6.3l1.4 1.4a6 6 0 1 0 7 0l1.4-1.4A8 8 0 1 1 7.1 6.3z" />,
};
const STRIP: DeckKey[][] = [['prev', 'play', 'stop', 'next'], ['power', 'eject', 'mute', 'voldown', 'volup']];

export default function Y2kDeck({ near, active, still, player, state }: Props) {
  const [ready, setReady] = useState(false);
  const [pressed, setPressed] = useState<DeckKey | ''>('');
  const [discOut, setDiscOut] = useState(false);
  const touch = useSyncExternalStore(subscribeTouch, isTouch, () => false);
  const onReady = useCallback(() => setReady(true), []), onFailure = useCallback(() => setReady(false), []);
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef(0);
  const buttons = useRef<Partial<Record<DeckKey, HTMLButtonElement | null>>>({});
  const hold = useRef<{ timer?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval>; scanned: boolean }>({ scanned: false });

  // The music waits for the machine to come up, but only when a live scene can show it.
  useEffect(() => player.setDeployMotion(ready && !still ? POWER_ON_MS : 0), [ready, still, player]);

  // How far the section has travelled through the viewport steers the camera.
  useEffect(() => {
    const measure = () => {
      const box = root.current?.getBoundingClientRect();
      if (box) scroll.current = scrollProgress(box.top, box.height, window.innerHeight);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, []);

  // The live scene reports where the keys have moved to; the buttons follow directly.
  const placeKeys = useCallback((rects: Partial<Record<DeckKey, KeyRect>>) => {
    for (const [name, r] of Object.entries(rects) as [DeckKey, KeyRect][]) {
      const el = buttons.current[name];
      if (!el) continue;
      el.style.left = `${r.left}%`; el.style.top = `${r.top}%`; el.style.width = `${r.width}%`; el.style.height = `${r.height}%`;
    }
  }, []);
  // Back on the poster, the buttons return to where the poster shows the keys.
  useEffect(() => { if (!ready) placeKeys(POSTER); }, [ready, placeKeys]);

  const playing = state.wantsPlaying;
  const volume = Math.round(state.volume * 100);
  const actions: Record<DeckKey, { label: string; run: () => void; selected?: boolean; disabled?: boolean; scan?: number }> = {
    power: { label: state.powered ? '关闭音乐台' : '开启音乐台', run: () => state.powered ? player.powerOff() : void player.play(), selected: state.powered },
    prev: { label: '上一首', run: () => void player.previous(), disabled: state.status === 'switching', scan: -10 },
    play: { label: playing ? '暂停音乐' : state.status === 'error' ? '重试播放' : '播放音乐', run: () => { setDiscOut(false); player.toggle(); }, selected: playing },
    stop: { label: '停止', run: player.stop },
    next: { label: '下一首', run: () => void player.next(), disabled: state.status === 'switching', scan: 10 },
    volup: { label: `音量加，当前 ${volume}%`, run: () => player.setVolume(state.volume + .05) },
    voldown: { label: `音量减，当前 ${volume}%`, run: () => player.setVolume(state.volume - .05) },
    mute: { label: state.muted ? '取消静音' : '静音音乐', run: player.toggleMute, selected: state.muted },
    eject: { label: discOut ? '放入碟片' : '弹出碟片', run: () => { if (!discOut) player.stop(); setDiscOut(!discOut); }, selected: discOut },
  };

  // Holding ◀◀ or ▶▶ scans through the track instead of changing it.
  const release = () => { clearTimeout(hold.current.timer); clearInterval(hold.current.repeat); setPressed(''); };
  const down = (name: DeckKey) => {
    setPressed(name);
    hold.current.scanned = false;
    const step = actions[name].scan;
    if (!step) return;
    hold.current.timer = setTimeout(() => {
      hold.current.scanned = true; player.scan(step);
      hold.current.repeat = setInterval(() => player.scan(step), 250);
    }, 400);
  };
  const click = (name: DeckKey) => {
    if (hold.current.scanned) { hold.current.scanned = false; return; }
    actions[name].run();
  };
  useEffect(() => { const h = hold.current; return () => { clearTimeout(h.timer); clearInterval(h.repeat); }; }, []);
  const keyEvents = (name: DeckKey) => ({
    onPointerDown: () => down(name), onPointerUp: release, onPointerLeave: release, onPointerCancel: release,
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') setPressed(name); },
    onKeyUp: () => setPressed(''), onBlur: release, onClick: () => click(name),
  });

  return <><div ref={root} className={styles.surface} style={{ aspectRatio: FRAME.aspect }} data-deck-renderer={ready ? 'three' : 'fallback'}>
    <img className={styles.poster} src={state.powered ? '/portfolio/y2k-deck/open.webp' : '/portfolio/y2k-deck/closed.webp'} alt="" draggable={false} data-device-fallback="deck" hidden={ready} />
    <div className={styles.stage} aria-hidden="true" style={{ visibility: ready ? 'visible' : 'hidden' }}>
      {near && <Boundary onFailure={onFailure}><Suspense fallback={null}>
        <Scene active={active} still={still} player={player} state={state} pressed={pressed} discOut={discOut} scroll={scroll} placeKeys={placeKeys} onReady={onReady} onFailure={onFailure} />
      </Suspense></Boundary>}
    </div>
    {!touch && <div className={styles.keys} data-deck-controls="integrated" role="group" aria-label="音乐台机身控制">
      {DECK_KEYS.map(name => {
        const a = actions[name], r = POSTER[name];
        return <button key={name} ref={el => { buttons.current[name] = el; }} type="button" className={styles.key} data-model-key={name}
          data-pressed={pressed === name ? 'true' : undefined} aria-label={a.label} aria-pressed={a.selected} disabled={a.disabled}
          style={{ left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` }} {...keyEvents(name)} />;
      })}
    </div>}
  </div>
  {touch && <div className={styles.strip} data-deck-controls="touch" role="group" aria-label="音乐台机身控制">
    {STRIP.map((row, i) => <div key={i} className={styles.stripRow} data-row={i}>
      {row.map(name => {
        const a = actions[name];
        return <button key={name} type="button" className={styles.stripKey} data-model-key={name} data-accent={name === 'play' || name === 'power' ? 'true' : undefined}
          data-pressed={pressed === name ? 'true' : undefined} aria-label={a.label} aria-pressed={a.selected} disabled={a.disabled} {...keyEvents(name)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[name]}</svg>
        </button>;
      })}
    </div>)}
  </div>}
  </>;
}
