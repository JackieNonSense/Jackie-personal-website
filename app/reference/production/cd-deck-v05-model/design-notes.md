# A / Flip Cockpit — actual model review 01

Historical checkpoint: first editable model and working browser preview. The subsequent physical-interaction integration is documented in [interaction-notes.md](interaction-notes.md); the unwired-control notes below describe the earlier static review, not the current homepage.

## Review locally

- Homepage: http://localhost:3011/#about
- Model review: http://localhost:3011/design/deck
- Actual captures: `docs/visual/deck-a-v01/` (repository root).
- Source of truth for silhouette: `../cd-deck-v03-bold/01-flip-cockpit-unbranded.png`.

No changes to Monitor, Terminal, Hero or production deployment in this milestone.

## What is implemented

- Editable Blender master, deterministic construction script and independent GLB.
- Fixed front camera and the original A width/height ratio, not the shortened storyboard proportions.
- Sculpted silver face, central machined rotary assembly, four separate icy-blue keys, smoked display and segmented time readout.
- Named `FacePivot`, `VolumePivot`, `KeyPlay`, `KeyNext`, `KeyDisplay`, `KeyMute`, `DiscCarrier`, `Screen`, `Glass` nodes. The full face rotates as one rigid assembly; chassis and carrier remain separate.
- Closed, 28-degree open, knob and glass **static** review poses. The disc is concealed in the closed pose.
- Existing audio controller retained. Real HTML play/pause, next, mute and volume controls below the model remain available; mesh controls are not presented as working buttons yet.
- Homepage model loading is near-viewport; demand-based rendering is disabled outside the viewport/hidden tab. No homepage autoplay.
- Matching transparent fallback poster captured from the actual Three.js scene, not generated concept artwork.

## Important fixes found through actual browser checks

1. Development process served stale CSS/modules. The scoped `scripts/restart-preview.ps1` checks port ownership before restarting only this project's 3011 process.
2. GLB suspension initially propagated outside Canvas, unmounting the canvas and losing its context. An **inner Canvas Suspense boundary** prevents that. Regression capture asserts the prepared surface remains visible.
3. Resource disposal is deferred over React Strict Mode's effect replay so environment textures remain valid.
4. A lost WebGL context must not be followed by a queued ready callback. Draw and ready notification now both check context validity.
5. Corrected display UV direction, reduced exaggerated roughness variation, and added finite area-light reflections to avoid uniformly flat metal.

## Verification recorded

- 66 tests across 15 files passed with `npm test -- --maxWorkers=2`.
- TypeScript check passed. Changed-file lint is checked separately.
- Browser sizes: 1440×900, 1920×1080 (DPR 2), 390×844 (DPR 2).
- Deck width: 480 / 480 / 346 CSS px respectively. No horizontal overflow. Each playback button is 44 CSS px high. One deck canvas in each case.
- Genuine browser gesture: play → playing → pause → next while paused → Voxel Revolution, still paused.
- Explicit WebGL context-loss injection returns to the same-model poster and leaves native audio controls available.
- Test browser uses software WebGL; no claim of real-device frame rate.
- A homepage audit observed a TonerLettering `useId` hydration warning during development navigation. It is outside the CD component and is recorded in the raw audit, not hidden or treated as a clean-console pass. Hero code was not modified.

## Asset budget

- `public/portfolio/deck-a-v01.glb`: 3,596,920 bytes (under 5 MiB).
- `public/portfolio/deck-satin-roughness-v01.png`: 167,020 bytes, 512².
- Poster target: under 500 KB, captured by the review script.
- The closed browser draw reports approximately 42,899 visible triangles / 30 mesh calls before shadow passes. Full GLB geometry budget is asserted by `tests/deck-asset.test.ts` (under 80,000 triangles).

## Still to improve / not implemented

- This first real model is cleaner and more geometric than the concept. Broad silver surfaces, bevel transitions and optical-disc finish still need material/shape refinement; do not claim concept-level photorealism or a percentage match.
- Rotary dragging, direct mesh key presses, changing display modes, live audio spectrum and the timed whole-face/disc transport sequence are **not wired in this review**.
- Review pose buttons jump between static states; they are not a demonstration of the finished mechanical animation.
- Keep the visual-review checkpoint before integrating those interactions. Do not use motion to conceal unresolved static material issues.

## Reproduce

```powershell
& '.cache/cd-toolchain/blender-4.5.13-windows-x64/blender.exe' --background --factory-startup --python scripts/build-deck-model.py
npm.cmd test -- --maxWorkers=2
npx.cmd tsc --noEmit
node scripts/deck-review-capture.mjs --poster --home
```

The capture script requires the dedicated Chrome CDP instance on 9333. It saves real browser captures; `--poster` refreshes the public fallback asset from that same rendered model. Blender portable 4.5.13 was verified against the official SHA256 checksum; no system install or global PATH change was made.
