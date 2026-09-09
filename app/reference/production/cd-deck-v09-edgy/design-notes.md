# V09 — offset optical deck

Local only: http://localhost:3011/#about. Supersedes the symmetric V08 control-bank study. Hero, project content, Monitor and `/terminal` are out of scope.

## Art direction

The homepage is an eroded black-and-white print, not a neutral product catalogue. The music object now shares ink black, worn silver and cobalt with that page. Asymmetry comes from its construction: left-offset rectangular screen, sheared cobalt cheek, stepped lower shell, one slanted silver playback paddle and smaller staggered control keys. The readable display itself stays rectangular. No new logo, serial number, birthday, decorative control bank or giant volume wheel.

`concept-v01.png` is an AI-generated exploration placed into a real homepage screenshot. It is **not** a screenshot of the implemented model. Any song or hardware-brand wording within that concept is a placeholder; the actual player keeps the two attributed Kevin MacLeod audition tracks. The generation brief is preserved in `concept-prompt.md`.

## Interaction

- POWER or PLAY requests real audio directly from the user gesture. The stowed screen extracts, then rises; its VFD content is revealed over 500 ms near the end of deployment. No autoplay.
- Five HTML buttons sit directly over corresponding Blender key meshes. Focus and pointer attention illuminate the relevant physical key; pressing depresses it. Their labels are native text, not a low-resolution texture.
- PLAY pauses without folding the screen; POWER stops playback and retracts. SEEK changes the track without cycling the mechanism. ATT mutes. DISP changes the information view without changing audio.
- A linear native range input drives the real model fader. The same controller serves both this object and the existing offscreen mini transport; there is no duplicate player or permanent toolbar beneath the model.
- Track transition: 180 ms title/spectrum withdrawal, dim interval, then a short incoming title/spectrum reveal. Levels come from the audio analyser, not random animation. No mechanical sounds, camera rocking or perpetual floating.
- Reduced motion and the page motion-pause control stop visual transitions, not user-initiated audio. Hidden/offscreen drawing stops. Pause, error and slow-load states must not leave fake moving meters.

## Editable implementation

- `scripts/build-deploy-deck.py`: reproducible bevelled mesh and real carriage/hinge animation.
- `edgy-master-v01.blend`: first asymmetric prototype; preserved.
- `edgy-master-v02.blend`: lower shell follows the stepped silhouette.
- `edgy-master-v03.blend`: normalized material UVs for independent cut panels; current editable source.
- `mechanism.json`: evaluated animation samples, exported node names and shared panel layout.
- `components/portfolio/deck-panel.json`: shared native-control / mesh coordinates, including screen offset and per-key dimensions.
- `public/portfolio/deploy-deck-v03.glb`: runtime model.
- `DeployDeckScene.tsx`: lighting, material maps, native input feedback and power-driven animation.
- `deck-display-motion.ts` / `deck-vfd.ts`: fluorescent-display graphics and transition timing.
- `DeployDeckSurface.tsx`: accessible on-model controls and same-shape fallback.

## Verification record

The initial V09 browser audit passed at 1440×900, 390×844 and 1920×1080. Native Enter playback, arrow-key volume, pointer fader dragging, touch playback, mode/mute, pause/next without retraction, power off, reduced motion and forced WebGL loss were exercised. The resize/offscreen observer regression was fixed and covered by seven hook tests. Separate component tests exercise the real controller through the integrated controls.

`docs/visual/deck-edgy/` holds actual browser captures and the silent canvas power-cycle recording. The fallback PNGs are captured from this renderer, without baked HTML labels. Pixel ratio is 2; a desktop 480×378 CSS canvas has a 960×756 drawing buffer. This is a measured render size, not a promise of an unmeasured frame rate or a claimed concept-match percentage.

## Final local verification — 9 September 2026

The repeated browser audit passed, including the playing-track transition, 44px minimum native targets, no horizontal overflow, keyboard and touch operation, reduced motion, and live fallback screen after forced WebGL loss. No JavaScript exceptions were recorded. The fallback's Canvas2D screen shows the actual title/time/volume/status with static empty meters, and DISP remains available; it no longer relies on the screenshot's baked playing state.

132 tests across 27 files passed. TypeScript and lint checks passed for the updated implementation. Additional regressions cover static-mode track names, returning after an offscreen exchange, and retaining the last genuine spectrum sample during its 180ms fade-out. New material maps contain deterministic fine grain, soft irregular oxidation and sparse tool marks, generated once when the nearby device loads. No repeating noise grid or whole-page grain animation was added.

The isolated Chromium check recorded 90 requestAnimationFrame intervals: median about 6.1ms, 95th percentile about 6.2ms, none over 50ms. This measures that headless environment's callback cadence during a brief run—not GPU render duration, end-user FPS, or performance on all devices.

The result is a procedural real-time 3D interpretation of the concept, not a claim of photographic identity with the generated image. Production was not deployed; no Git commit or push was made.
