# A / Flip Cockpit — refinement 02

Local homepage: http://localhost:3011/#about

The approved front-facing A silhouette is unchanged. This iteration continues the working physical controls documented in `../cd-deck-v05-model/interaction-notes.md`.

## Changes

- New versioned `deck-a-v02.glb` and editable Blender master in this directory. The v01 GLB, master and screenshots remain available.
- Four real geometric symbols replace nearly unreadable miniature key text: play/pause, next, display and mute. Each symbol is a child of its moving key, so it follows the same press and whole-face exchange motion. These are not HTML overlays.
- Annular front surfaces use planar normals; only cylindrical walls interpolate normals. This removes the alternating scalloped reflection around the knob's flat ring.
- Chrome roughness increased from 0.20 to 0.28; brushed silver roughness multiplier increased from 0.64 to 0.72. Broad silver planes remain distinct without increasing bloom.
- Glass reflection opacity increased modestly from 0.06 to 0.09. Display content stays readable and music-driven.
- Homepage rendering now caps DPR at 2 rather than 1.5 for finer edges on high-density screens.
- Versioned fallback `deck-a-standby-v02.png` is captured from the actual updated Three.js model; no generated concept image is used as a model substitute.

## Verification

- 74 tests across 16 files pass, including the new geometry-parenting contract. The test failed before the revised export existed.
- TypeScript passes; changed-component lint passes.
- `docs/visual/deck-a-v02/`: closed/open/knob/glass review captures, three viewport homepage captures and WebGL fallback check. No console warnings/errors recorded in the viewport audit.
- `docs/visual/deck-a-motion-v02/`: actual canvas recording and 665 sampled frame records in the latest run. Mesh rotary, short press mute, display switch, audio spectrum, pause during exchange, release outside, motion pause, offscreen audio, touch rotary, keyboard volume and system reduced motion pass. No runtime exceptions recorded.
- The video is a silent visual recording; actual music playback is separately exercised in the browser audit.
- Closed draw: approximately 44,324 triangles / 35 mesh calls before shadow passes. This is not a real-device performance guarantee.

## Remaining judgment

The large silver planes are still deliberately faceted, and the result remains cleaner than a photographed vintage stereo. Further shape/material refinement should be judged against the A concept at normal homepage size, not disguised by adding animation or glow.

Monitor, Terminal, Hero, production domain and deployment are unchanged. Only local port 3011 is used.
