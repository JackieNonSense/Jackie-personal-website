"use client";
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SCREEN_FRAGMENT, SCREEN_VERTEX, drawTitle } from '../../../components/portfolio/y2k-deck/screen-shader';
import { musicTracks } from '../../../components/portfolio/music-tracks';

/** Review page for the top screen's three scenes, on made-up music. ?scene=0|1|2&t=seconds */
export default function Y2kScreenReview() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search), scene = Number(q.get('scene') ?? 0), frozen = q.get('t');
    const w = 1280, h = Math.round(1280 / 2.514);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h); renderer.outputColorSpace = THREE.SRGBColorSpace;
    ref.current!.appendChild(renderer.domElement);
    const spectrum = new THREE.DataTexture(new Uint8Array(32), 32, 1, THREE.RedFormat);
    const tc = document.createElement('canvas'); tc.width = 1280; tc.height = Math.round(1280 / 2.514);
    const track = musicTracks[scene % musicTracks.length];
    drawTitle(tc.getContext('2d')!, track.title, track.artist, scene, musicTracks.length);
    const title = new THREE.CanvasTexture(tc); title.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.ShaderMaterial({ vertexShader: SCREEN_VERTEX, fragmentShader: SCREEN_FRAGMENT, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uBass: { value: 0 }, uKick: { value: 0 }, uScene: { value: scene }, uAspect: { value: 2.514 },
        uPicture: { value: 1 }, uNoise: { value: 0 }, uDegauss: { value: 0 }, uPulse: { value: 0 }, uPulseGlow: { value: 0 }, uSpec: { value: spectrum }, uText: { value: title } } });
    const geo = new THREE.PlaneGeometry(2, 2);
    // Match the model's UVs, which run top-down.
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    const mesh = new THREE.Mesh(geo, material), sceneObj = new THREE.Scene(); sceneObj.add(mesh);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    let raf = 0; const start = performance.now();
    const frame = (now: number) => {
      const t = frozen ? Number(frozen) : (now - start) / 1000;
      const beat = Math.max(0, Math.sin(t * Math.PI * 2 * 2.1)) ** 8;
      const d = spectrum.image.data as Uint8Array;
      for (let i = 0; i < 32; i++) d[i] = Math.round(255 * Math.max(0, Math.min(1, .75 - .5 * i / 32 + .2 * Math.sin(t * 3 + i * .7) + .3 * beat * (i < 6 ? 1 : .2))));
      spectrum.needsUpdate = true;
      material.uniforms.uTime.value = t; material.uniforms.uBass.value = .45 + .4 * beat; material.uniforms.uKick.value = beat;
      const since = (t * 2.1) % 1; material.uniforms.uPulse.value = Math.min(1, since / .6); material.uniforms.uPulseGlow.value = Math.max(0, 1 - since / .6) * .9;
      renderer.render(sceneObj, cam);
      if (!frozen) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); renderer.dispose(); material.dispose(); geo.dispose(); spectrum.dispose(); title.dispose(); renderer.domElement.remove(); };
  }, []);
  return <main style={{ minHeight: '100vh', background: '#0b0b0b', display: 'grid', placeItems: 'center' }}><div ref={ref} data-screen-review /></main>;
}
