'use client';
/*
 * The terminal page: one photographed monitor in a dark room. The six push
 * buttons under its screen change the tube, and the knob is the power; they are
 * real buttons laid over the photograph. On a phone a tap raises the system
 * keyboard, typing goes to the command line, and a vertical drag scrolls.
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadGlyphs, loadWideFont } from './crt/font';
import { TEXT_MODES, createGrid, rowText } from './crt/grid';
import { RASTER_H, RASTER_W } from './crt/raster';
import { OFF_SETTLED, IGNITE, beamAt, switchPower, type Power } from './crt/power';
import { createCrtRenderer, type CrtRenderer } from './crt/renderer';
import { CONTROLS, GLASS, SHELL, cssAt, glassRadius, layoutShell, rasterPoint, type Layout, type ShellRect } from './crt/geometry';
import { BUTTONS, THEMES, isTheme, mixPalette, mixTube, packSrgb, type Theme, type ThemeId, type Tube } from './crt/themes';
import { degaussAt } from './crt/degauss';
import { Machine, type Key, type PointerInput, type PointerKind, type PointerPhase } from './system/machine';
import { defaultLang, tr } from './system/i18n';
import { FileSystem } from './system/fs';
import { createStore } from './system/storage';
import { diffKeys } from './system/soft-keyboard';
import { decideKey } from './system/keys';
import { AudioSystem } from './audio/audio';
import { pictureFromRgba, type Picture } from './graphics/bitmap';
import { disk, restoreDisk } from './content/disk';
import { boot } from './content/bbs';
import { ending, logOff } from './content/ending';
import styles from './Terminal.module.css';

const EXIT_TO = '/#experiments';
const TRANSCRIPT_LINES = 12;
/** Pixels of wheel per line scrolled. */
const WHEEL_LINE = 40;

async function loadPicture(url: string): Promise<Picture> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  return pictureFromRgba(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
}

function localStore() {
  try { return createStore(window.localStorage); } catch { return createStore(null); }
}

/** A rectangle of the photograph, placed over it by the controls layer. */
const place = (r: ShellRect) => ({ left: r.x, top: r.y, width: r.w, height: r.h });
const KNOB = { left: CONTROLS.knob.cx - CONTROLS.knob.r, top: CONTROLS.knob.cy - CONTROLS.knob.r, width: 2 * CONTROLS.knob.r, height: 2 * CONTROLS.knob.r };
const CALM = { wobble: 0, purity: 0 };
/** How long a button stays down when it was only tapped. */
const TAP_HOLD = 0.12;
/** How far in the selected tube's button stays latched, as a fraction of fully pressed. */
const LATCHED = 0.55;

function viewport() {
  const vv = window.visualViewport;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    visible: vv ? { top: vv.offsetTop, height: vv.height } : { top: 0, height: window.innerHeight },
  };
}

export default function Terminal() {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [tube, setTube] = useState<ThemeId | null>(null);
  const [renderer, setRenderer] = useState<'loading' | 'webgl' | 'fallback'>('loading');
  const [powered, setPowered] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const input = inputRef.current!;
    const initial = viewport();
    // The text mode is fixed for the session: a page does not reflow mid-conversation.
    const text = TEXT_MODES[layoutShell(initial.width, initial.height, initial.visible).closeUp ? 'large' : 'wide'];
    const grid = createGrid(text.cols, text.rows);
    const raster = new Uint8Array(RASTER_W * RASTER_H);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let still = motion.matches;
    let power: Power = { phase: 'standby', since: 0 };
    let glyphs: Uint8Array | null = null;
    let crt: CrtRenderer | null = null;
    let disposed = false, raf = 0, last = 0, booted = false, leaving = false;
    let redraw = false, fallbackMode = false;
    /** What the phone's text field held after the last edit we replayed. */
    let field = '';
    const now = () => performance.now() / 1000;

    const controls = controlsRef.current!;
    const room = canvas.parentElement as HTMLElement;
    const store = localStore();
    if (store.get<string | null>('lang', null) === null) store.set('lang', defaultLang(navigator.languages ?? [navigator.language]));
    const audio = new AudioSystem(store.get('sound', true));
    const machine = new Machine(grid, audio, store, new FileSystem(disk()), {
      announce: line => setTranscript(lines => [...lines, ...line.split('\n').map(l => l.trimEnd())].filter(Boolean).slice(-TRANSCRIPT_LINES)),
      openUrl: url => { window.open(url, '_blank', 'noopener,noreferrer'); },
      inputMode: mode => {
        if (mode === 'pad') { input.blur(); return; }
        // A desk keyboard types Chinese through an input method, which needs a focused
        // field: programs that edit a line get the phone's field on the desk too.
        if (coarse) return;
        if (machine.line !== null) { input.value = field = machine.line; input.focus({ preventScroll: true }); }
        else if (document.activeElement === input) input.blur();
      },
      loadPicture,
      loadWideFont: base => loadWideFont(base),
      theme: next => changeTube(next),
      exit: () => {
        leaving = true;
        power = switchPower(power, false, now());
        audio.music(null);
        audio.sfx('power-off');
        setPowered(false);
        input.blur();
        window.setTimeout(() => routerRef.current.push(EXIT_TO), (still ? 0.2 : OFF_SETTLED) * 1000);
      },
    });

    restoreDisk(machine);

    // The tube. What the screen shows can be part way between two tubes while it degausses.
    let shown: { palette: Float32Array; tube: Tube } = { palette: machine.theme.palette, tube: machine.theme.tube };
    let change: { from: typeof shown; to: Theme; since: number; smear: number } | null = null;
    let paletteDirty = true;
    const mixed = new Float32Array(256 * 4);
    function changeTube(next: Theme) {
      setTube(next.id);
      if (power.phase !== 'on') {
        // The tube is dark: nothing to degauss, only the standby dot changes.
        shown = { palette: next.palette, tube: next.tube }; change = null; paletteDirty = true;
        return;
      }
      const from = { palette: Float32Array.from(shown.palette), tube: shown.tube };
      // A monochrome tube has no shadow mask to magnetise: it swims, but the colour never smears.
      change = { from, to: next, since: now(), smear: from.tube.mono && next.tube.mono ? 0 : 1 };
      audio.sfx('degauss');
    }
    function tubeAt(t: number) {
      if (!change) {
        const changed = paletteDirty;
        paletteDirty = false;
        return { ...shown, degauss: CALM, changed };
      }
      const d = degaussAt(t - change.since, still);
      if (d.done) {
        shown = { palette: change.to.palette, tube: change.to.tube }; change = null;
        return { ...shown, degauss: CALM, changed: true };
      }
      const view = { palette: mixPalette(mixed, change.from.palette, change.to.palette, d.mix), tube: mixTube(change.from.tube, change.to.tube, d.mix) };
      return { ...view, degauss: { wobble: d.wobble, purity: d.purity * change.smear }, changed: true };
    }
    // The buttons: the selected tube's stays latched part way in; the one under a finger
    // or the mouse goes all the way down, and the one it replaces springs back.
    const depths: number[] = BUTTONS.map(id => (id === machine.theme.id ? LATCHED : 0));
    let held: { index: number; until: number } | null = null;
    function buttonsAt(t: number, dt: number) {
      const down: { rect: [number, number, number, number]; depth: number }[] = [];
      BUTTONS.forEach((id, i) => {
        const target = held && held.index === i && t < held.until ? 1 : id === machine.theme.id ? LATCHED : 0;
        const d = depths[i];
        depths[i] = target > d ? Math.min(target, d + dt / 0.03) : Math.max(target, d - dt / 0.08);
        if (depths[i] > 0) { const f = CONTROLS.buttons[i].face; down.push({ rect: [f.x, f.y, f.w, f.h], depth: depths[i] }); }
      });
      if (held && t >= held.until) held = null;
      return down.sort((a, b) => b.depth - a.depth).slice(0, 2);
    }
    // A theme named in the address is for this visit only (screenshots, links).
    const asked = new URLSearchParams(window.location.search).get('theme');
    if (isTheme(asked)) machine.setTheme(asked, false);
    setTube(machine.theme.id);
    // For the preview scripts: the machine and what the beam draws, when the address asks.
    if (new URLSearchParams(window.location.search).has('debug')) {
      Object.assign(window, { __jr: { machine, raster, view: () => shown, css: (rx: number, ry: number) => (layout ? cssAt(layout, rx, ry) : null) } });
    }

    function turnOn() {
      audio.unlock();
      if (power.phase === 'on' || leaving) return;
      power = switchPower(power, true, now());
      audio.sfx('power-on');
      booted = false;
      setPowered(true); setHint(null);
    }
    const running = () => power.phase === 'on' && booted;
    function send(key: Key) { if (running()) machine.key(key); }
    function syncField() { input.value = field = machine.line ?? ''; }

    function keydown(event: KeyboardEvent) {
      // A focused control under the screen takes its own keys.
      if ((event.target as Element | null)?.closest?.('[data-control]')) return;
      // F5 reloads, CTRL+R reloads, ALT+← goes back: whatever the terminal does not use stays the browser's.
      const { send: key, prevent } = decideKey(event, running() ? machine : { ctrlKeys: [], captureKeys: [] });
      if (!key) return;
      if (event.target === input) {
        // Text and deletions arrive as edits of the field (see onInput); only line
        // control is taken from the keys, so composition is never interrupted.
        if (key.key === 'Enter') { event.preventDefault(); send(key); input.value = field = ''; return; }
        // BACKSPACE on an empty field edits nothing, so it arrives only as a key: it means "back".
        if (key.key === 'Backspace' && !input.value) { event.preventDefault(); send(key); return; }
        // Named keys from a hardware keyboard (ESC, arrows, TAB) and CTRL+C pass straight through.
        if ((key.key.length > 1 && key.key !== 'Backspace') || key.ctrl) { event.preventDefault(); send(key); syncField(); }
        return;
      }
      if (prevent) event.preventDefault();
      audio.unlock();
      if (power.phase !== 'on') { turnOn(); return; }
      if (event.repeat && machine.inputMode === 'pad') return;
      send(key);
    }
    function keyup(event: KeyboardEvent) { if (running()) machine.release(event.key); }
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    function onInput() {
      if (power.phase !== 'on') { turnOn(); input.value = field = ''; return; }
      const value = input.value, newline = value.indexOf('\n');
      const typed = newline < 0 ? value : value.slice(0, newline);
      for (const key of diffKeys(field, typed)) send(key);
      field = typed;
      if (newline >= 0) { send({ key: 'Enter', ctrl: false }); input.value = field = ''; }
      // Outside a command line each key is a choice, not text: start the field afresh.
      else if (machine.line === null) input.value = field = '';
    }
    const onControl = (event: Event) => Boolean((event.target as Element | null)?.closest?.('[data-control]'));
    /**
     * A phone raises its keyboard only for a field being typed in, and only from inside
     * a touch (iOS allows focus nowhere else); a tap anywhere else puts it away. The
     * pointer has already had the tap by now, so the field it chose is known.
     */
    function onTouchEnd(event: TouchEvent) {
      if (onControl(event) || event.target === input) return;
      audio.unlock();
      if (power.phase !== 'on') { turnOn(); return; }
      if (machine.line !== null) { input.value = field = machine.line; input.focus({ preventScroll: true }); }
      else if (document.activeElement === input) input.blur();
    }
    // Presses never move the focus: that also stops the mouse events a browser
    // synthesises after a tap from taking focus back from the field.
    const swallow = (event: MouseEvent) => event.preventDefault();

    /** A control under the screen, pressed: `index` 0..5 is a tube button, -1 the knob. */
    function operate(index: number, hold: boolean) {
      audio.unlock();
      const t = now();
      if (index < 0) {
        if (power.phase !== 'on') { turnOn(); return; }
        // Switching off is logging off, by way of the seed when one is owed.
        if (running() && !ending(machine)) { audio.sfx('button'); logOff(machine); }
        return;
      }
      held = { index, until: hold ? Infinity : t + TAP_HOLD };
      audio.sfx('button');
      machine.setTheme(BUTTONS[index]);
    }
    const controlIndex = (target: EventTarget | null) => {
      const name = (target as HTMLElement | null)?.closest?.<HTMLElement>('[data-control]')?.dataset.control;
      return name === undefined ? null : name === 'power' ? -1 : Number(name);
    };
    function onControlDown(event: PointerEvent) {
      const index = controlIndex(event.target);
      if (index === null) return;
      event.preventDefault();
      event.stopPropagation();
      operate(index, true);
    }
    function onControlUp() { if (held && held.until === Infinity) held.until = now() + 0.05; }
    // From the keyboard: a focused button answers ENTER and SPACE with a click of its own.
    function onControlClick(event: MouseEvent) {
      const index = controlIndex(event.target);
      if (index !== null && event.detail === 0) operate(index, false);
    }
    controls.addEventListener('pointerdown', onControlDown);
    window.addEventListener('pointerup', onControlUp);
    window.addEventListener('pointercancel', onControlUp);
    controls.addEventListener('click', onControlClick);
    // ── The pointer: the mouse, a finger or a pen, carried onto the raster through the glass ──
    /** The press being followed, even off the glass, until it is let go. */
    let captured: number | null = null;
    /** Programs that answer the pointer; the others never see it. */
    const pointing = () => running() && Boolean(machine.top?.pointer);
    function pointerInput(event: PointerEvent, phase: PointerPhase): PointerInput | null {
      if (!layout) return null;
      const at = rasterPoint(layout, event.clientX, event.clientY);
      return {
        phase, x: at.x, y: at.y, inside: at.inside || captured === event.pointerId,
        kind: (['mouse', 'touch', 'pen'].includes(event.pointerType) ? event.pointerType : 'mouse') as PointerKind,
        id: event.pointerId, primary: event.isPrimary, button: event.button, buttons: event.buttons, shift: event.shiftKey,
        time: event.timeStamp / 1000,
        pxPerCss: RASTER_W / (2 * GLASS.rx * GLASS.overscan * layout.scale),
      };
    }
    function onPointerDown(event: PointerEvent) {
      if (onControl(event)) return;
      audio.unlock();
      if (power.phase !== 'on') { if (event.pointerType === 'mouse' && event.button === 0) turnOn(); return; }
      if (!pointing() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const input = pointerInput(event, 'down');
      if (!input?.inside) return;
      captured = event.pointerId;
      room.setPointerCapture?.(event.pointerId);
      machine.pointer(input);
    }
    function onPointerMove(event: PointerEvent) {
      if (!layout) return;
      // The mouse shows over the room and the set; over the glass the tube draws its own.
      if (event.pointerType === 'mouse') room.dataset.cursor = pointing() && (captured !== null || glassRadius(layout, event.clientX, event.clientY) < 0.996) ? 'none' : 'default';
      if (!pointing() || (event.pointerType !== 'mouse' && captured !== event.pointerId)) return;
      const input = pointerInput(event, 'move');
      if (input) machine.pointer(input);
    }
    function onPointerEnd(event: PointerEvent) {
      if (captured !== event.pointerId) return;
      captured = null;
      room.releasePointerCapture?.(event.pointerId);
      const input = pointerInput(event, event.type === 'pointercancel' ? 'cancel' : 'up');
      if (input && running()) machine.pointer(input);
    }
    function onPointerLeave(event: PointerEvent) {
      if (captured !== null || !pointing() || event.pointerType !== 'mouse') return;
      const input = pointerInput(event, 'leave');
      if (input) machine.pointer({ ...input, inside: false });
    }
    function onContextMenu(event: MouseEvent) {
      if (layout && glassRadius(layout, event.clientX, event.clientY) < 0.996) event.preventDefault();
    }
    room.addEventListener('pointerdown', onPointerDown);
    room.addEventListener('pointermove', onPointerMove);
    room.addEventListener('pointerup', onPointerEnd);
    room.addEventListener('pointercancel', onPointerEnd);
    room.addEventListener('pointerleave', onPointerLeave);
    room.addEventListener('contextmenu', onContextMenu);
    // The wheel scrolls what can scroll; nothing else of the mouse does anything.
    let wheelRest = 0;
    function onWheel(event: WheelEvent) {
      // CTRL and the wheel is the browser's zoom.
      if (event.ctrlKey) return;
      event.preventDefault();
      if (!running()) return;
      wheelRest += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
      const lines = Math.trunc(wheelRest / WHEEL_LINE);
      if (!lines) return;
      wheelRest -= lines * WHEEL_LINE;
      const at = layout ? rasterPoint(layout, event.clientX, event.clientY) : null;
      machine.wheel(lines, at?.inside ? { x: at.x, y: at.y } : null);
    }
    input.addEventListener('input', onInput);
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousedown', swallow);

    const hintTimer = window.setTimeout(() => {
      if (power.phase === 'standby') setHint(coarse ? 'TAP TO SWITCH ON' : 'CLICK OR PRESS ANY KEY');
    }, 1400);
    machine.still = still;
    const onMotion = () => { still = motion.matches; machine.still = still; };
    motion.addEventListener('change', onMotion);

    let layout: Layout | null = null;
    function resize() {
      const v = viewport();
      layout = layoutShell(v.width, v.height, v.visible);
      crt?.resize(v.width, v.height, window.devicePixelRatio || 1, layout);
      controls.style.transform = `translate(${layout.x}px, ${layout.y}px) scale(${layout.scale})`;
      if (fallbackMode) placeFallback(layout);
    }
    function placeFallback(layout: Layout) {
      const shell = document.querySelector<HTMLImageElement>('[data-terminal-fallback-shell]');
      const screen = fallbackRef.current;
      if (!shell || !screen) return;
      Object.assign(shell.style, { left: `${layout.x}px`, top: `${layout.y}px`, width: `${SHELL.width * layout.scale}px` });
      const gw = 2 * GLASS.rx * GLASS.overscan * layout.scale, gh = 2 * GLASS.ry * GLASS.overscan * layout.scale;
      Object.assign(screen.style, {
        left: `${layout.x + GLASS.cx * layout.scale - gw / 2}px`, top: `${layout.y + GLASS.cy * layout.scale - gh / 2}px`,
        width: `${gw}px`, height: `${gh}px`,
      });
    }
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);

    /** The flat display: each index looked up in the palette as it stands. */
    const lut = new Uint32Array(256);
    function drawFallback(palette: Float32Array) {
      const screen = fallbackRef.current;
      const ctx = screen?.getContext('2d');
      if (!screen || !ctx) return;
      for (let i = 0; i < 256; i++) lut[i] = packSrgb([palette[i * 4], palette[i * 4 + 1], palette[i * 4 + 2]]);
      const image = ctx.createImageData(RASTER_W, RASTER_H), out = new Uint32Array(image.data.buffer);
      const on = power.phase === 'on', black = lut[0];
      for (let i = 0; i < raster.length; i++) out[i] = on ? lut[raster[i]] : black;
      ctx.putImageData(image, 0, 0);
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      const t = now();
      const dt = last ? Math.min(t - last, 0.1) : 0;
      last = t;
      const beam = beamAt(power, t, still);
      if (power.phase === 'on' && glyphs) {
        const open = still || t - power.since > IGNITE.open + 0.35;
        if (open && !booted) { booted = true; machine.glyphs = glyphs; machine.push(boot()); }
        if (booted) machine.tick(dt);
      }
      let changed = machine.render(raster, t, text.zoom);
      if (redraw) { changed = true; redraw = false; }
      const view = tubeAt(t);
      if (crt) crt.render({
        raster, rasterChanged: changed, palette: view.palette, paletteChanged: view.changed, tube: view.tube, degauss: view.degauss,
        press: buttonsAt(t, dt), beam, time: t, dt, still,
      });
      else if (fallbackMode && (changed || view.changed)) drawFallback(view.palette);
      canvas.dataset.power = power.phase;
      canvas.dataset.columns = String(grid.cols);
      canvas.dataset.screen = power.phase === 'on' ? rowText(grid, grid.cursor.y).trimEnd() : '';
    }

    function visibility() {
      cancelAnimationFrame(raf); last = 0;
      if (!document.hidden) raf = requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', visibility);

    (async () => {
      try { glyphs = await loadGlyphs(); } catch { glyphs = null; }
      // The Chinese character ROM goes in before the machine boots, whichever language
      // it speaks: Cheng signs her name in Chinese on the English board too.
      if (glyphs) {
        try { glyphs = await loadWideFont(glyphs); } catch { if (machine.lang === 'zh') await machine.setLanguage('en'); }
      }
      try {
        crt = await createCrtRenderer(canvas);
        if (disposed) { crt.dispose(); return; }
        setRenderer('webgl');
        canvas.addEventListener('webglcontextlost', event => {
          event.preventDefault(); crt = null; fallbackMode = true; setRenderer('fallback');
          requestAnimationFrame(() => { resize(); redraw = true; });
        }, { once: true });
      } catch (error) {
        console.warn('CRT renderer unavailable; using the flat display.', error);
        crt = null; fallbackMode = true;
        if (disposed) return;
        setRenderer('fallback');
      }
      requestAnimationFrame(() => { resize(); });
      raf = requestAnimationFrame(frame);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(hintTimer);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousedown', swallow);
      controls.removeEventListener('pointerdown', onControlDown);
      controls.removeEventListener('click', onControlClick);
      window.removeEventListener('pointerup', onControlUp);
      window.removeEventListener('pointercancel', onControlUp);
      room.removeEventListener('pointerdown', onPointerDown);
      room.removeEventListener('pointermove', onPointerMove);
      room.removeEventListener('pointerup', onPointerEnd);
      room.removeEventListener('pointercancel', onPointerEnd);
      room.removeEventListener('pointerleave', onPointerLeave);
      room.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', resize);
      input.removeEventListener('input', onInput);
      motion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', visibility);
      crt?.dispose();
      audio.dispose();
    };
  }, []);

  return (
    <main className={styles.room} data-testid="terminal" data-renderer={renderer} data-powered={powered}>
      <h1 className={styles.sr}>Terminal. Press any key, or tap on a touch screen, to switch on. Type EXIT to leave.</h1>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" data-power="standby" />
      {renderer === 'fallback' && <>
        <img className={styles.fallbackShell} src={SHELL.photo} alt="" data-terminal-fallback-shell />
        <canvas ref={fallbackRef} className={styles.fallbackScreen} width={RASTER_W} height={RASTER_H} aria-hidden="true" />
      </>}
      <div ref={controlsRef} className={styles.controls} role="group" aria-label="Monitor controls">
        {BUTTONS.map((id, i) => (
          <button key={id} type="button" className={styles.control} style={place(CONTROLS.buttons[i].hit)} data-control={i}
            aria-label={`Tube: ${tr('en', THEMES[id].name)}`} aria-pressed={tube === id} />
        ))}
        <button type="button" className={`${styles.control} ${styles.knob}`} style={KNOB} data-control="power" aria-label="Power" />
      </div>
      <textarea ref={inputRef} className={styles.input} aria-label="Terminal input" autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="send" rows={1} />
      <p className={styles.hint} data-visible={Boolean(hint) && !powered} aria-hidden="true">{hint}</p>
      <div className={styles.sr} role="log" aria-live="polite">{transcript.map((line, i) => <p key={i}>{line}</p>)}</div>
    </main>
  );
}
