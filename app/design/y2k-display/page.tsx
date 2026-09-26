"use client";
import { useEffect, useRef } from 'react';
import { DISPLAY_CANVAS, drawGlowingDisplay } from '../../../components/portfolio/y2k-deck/display-canvas';

/** Review page for the head unit's display: the real drawing code on made-up music. */
export default function Y2kDisplayReview() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!, ctx = canvas.getContext('2d')!;
    const layer = document.createElement('canvas'); layer.width = canvas.width; layer.height = canvas.height;
    const lctx = layer.getContext('2d')!;
    const frozen = new URLSearchParams(location.search).get('t');
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = frozen ? Number(frozen) : (now - start) / 1000;
      const bands = Array.from({ length: 32 }, (_, i) => Math.max(0, Math.min(1, .82 - .5 * (i / 32) ** .8 + .18 * Math.sin(t * 3 + i * .7) + .1 * Math.sin(t * 7.3 + i * 1.9))));
      const wave = Array.from({ length: 512 }, (_, i) => .55 * Math.sin(i / 512 * Math.PI * 18 + t * 9) * Math.sin(i / 512 * Math.PI * 3 + t) + .2 * Math.sin(i / 512 * Math.PI * 60));
      drawGlowingDisplay(ctx, lctx, {
        title: 'DIVA', track: 2, tracks: 3, time: 72 + t, duration: 221, status: 'playing', disc: true,
        bands, peaks: bands.map(v => Math.min(1, v + .1)), left: .72 + .2 * Math.sin(t * 4), right: .6 + .25 * Math.sin(t * 3.3 + 1),
        wave, lit: Math.min(1, t / .8 + (frozen ? 1 : 0)), clock: t, bass: .5 + .4 * Math.sin(t * 2), swap: (t % 6) / 1.2,
      });
      if (!frozen) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <main style={{ minHeight: '100vh', background: '#0b0b0b', display: 'grid', placeItems: 'center', padding: 24 }}>
    <canvas ref={ref} width={DISPLAY_CANVAS.width} height={DISPLAY_CANVAS.height} style={{ width: 'min(1280px, 96vw)', height: 'auto', background: '#000' }} data-display-review />
  </main>;
}
