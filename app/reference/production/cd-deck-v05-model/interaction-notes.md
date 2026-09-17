# A / Flip Cockpit — physical interaction integration

Local preview: http://localhost:3011/#about. Static material review: http://localhost:3011/design/deck.

This continues the model review in `design-notes.md`. Monitor, Terminal, Hero and production deployment are unchanged. No device wordmark was added.

## Physical controls

- Drag the central mesh rotary right/up to raise volume, left/down to lower it. A 150 CSS px gesture spans the full range; movements below 5 px remain a short press. Short press toggles mute.
- Left upper/lower mesh keys: play/pause and next. Right upper/lower: display mode and mute. Key travel is 1 mm; hover only gently raises blue edge luminance.
- HTML controls remain available with 44 px button heights and a keyboard-operable volume range. They share one audio controller with the model and offscreen mini transport.
- Leaving a pressed key cancels activation. Pointer cancellation, capture release and window blur must not leave the device dragging.

## Transport timing

The full front pivots about its lower hinge; it is not a moving image overlay. Body and disc carrier remain separate GLB nodes.

| Time | Mechanical state | Audio |
| --- | --- | --- |
| 0–180 ms | Front seated | Old track fades out |
| 180–450 ms | Front opens to 28 degrees | Paused |
| 450–630 ms | Disc retracts inside the chassis | Paused |
| 630–850 ms | Replacement advances; track source changes while concealed | Paused |
| 850–1050 ms | Front closes | Paused |
| After 1050 ms | Front seated | New track starts only if play intent remains |

The spectrum uses actual Web Audio frequency samples, grouped into 32 bands, with faster attack and slower decay. Silence is not animated as music. The display can switch to a static optical-audio readout.

Pause during exchange preserves silence even when promises resolve later. Rapid next presses do not stack exchanges. Media errors cancel the active sequence. A slow new track remains seated/loading; it does not repeatedly reopen the face.

## Rendering and material refinement

- Brushed silver: moderated roughness variation, fine bump and directional reflection.
- Machined knob: radial anisotropy, independently rotating pointer.
- Disc: restrained iridescence and softer optical reflection.
- Shadow maps update for mechanical movement and final closure, not continuously while a stationary device merely displays music.
- Offscreen/hidden-tab visual rendering stops independently of user-started music. Reduced motion and the manual motion switch leave transport controls active while suppressing moving geometry and animated spectrum.
- The 441,516-byte fallback poster is captured from this same scene. WebGL context loss exposes that poster while preserving HTML music controls.

## Verification and remaining visual work

- 73 tests across 16 files pass, including pending playback cancellation, buffering volume, native errors, ordered looping and transport timing. TypeScript passes.
- Three viewport audit: 1440×900, 1920×1080 at DPR 2, 390×844 at DPR 2. No horizontal overflow; one deck canvas; all four HTML transport buttons are 44 px tall.
- Actual viewport/fallback evidence: `docs/visual/deck-a-v01/homepage-checks.json` and PNGs. Latest viewport run records no console warnings/errors.
- Mechanical recording and per-frame audio/angle telemetry: `docs/visual/deck-a-motion-v01/`. Recording is a silent canvas capture, not an audio demonstration.
- These are browser checks, not a claim of physical-device frame rate. The dedicated test Chrome now uses normal GPU selection; earlier forced-software tests were not representative of normal rendering.
- The model is still cleaner and more geometric than the approved concept. Broad facet transitions, edge detailing and optical-glass reflections can be refined further. Working motion is not a declaration of final visual approval.

## Reproduce

```powershell
npm.cmd test -- --maxWorkers=2
npx.cmd tsc --noEmit
node scripts/deck-review-capture.mjs --poster --home
node scripts/deck-motion-audit.mjs
```

Browser scripts use the dedicated Chrome CDP instance on 9333 and only the local preview on 3011. The latter script includes actual mesh mouse interactions, a mobile touch rotary gesture, keyboard volume input, reduced motion and offscreen audio checks; its report is the source of truth for the recorded run.
