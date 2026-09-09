# Motorized display — corrected homepage mechanism

Local implementation: `http://localhost:3011/#about`. This supersedes the always-visible, folding-away screen study in `cd-deck-v07-wide-study`. No production deployment or Git push.

## What is implemented

- A genuine Blender mesh/animation export rendered by React Three Fiber on the homepage. It does not render the former A-model with the large rotary control.
- At rest the screen is horizontal, inside the housing. Its carriage first extracts 85 model millimetres; only after clearing the housing does the screen rise from 90° to upright. Nominal startup duration: 1.6 seconds. This is a designed mechanism, not a claim about the exact Sony mechanism.
- Play requests audio in the original user-activation task and powers the mechanism. The screen lights near the end of deployment. Music pause leaves the screen upright; OFF fades audio and folds/retracts the display. Next track does not cycle the mechanism.
- Linear volume fader, physical PLAY / SEEK legends, and accessible HTML transport/volume controls. No circular dragging.
- VFD-inspired segmented fan, auxiliary spectrum, seven-segment timer, dot-matrix track name, cyan/blue light with chartreuse/amber legends and visible unlit segments. Both spectra sample the real audio analyser; pause clears the levels. The graphics are stylized, not a reproduction of a Sony display.
- 2048 × 832 dynamic display texture; renderer pixel ratio 2. The 480 × 300 CSS desktop stage renders to 960 × 600 pixels. Tiny secondary instrument legends are texture detail; the separate HTML title and controls remain readable.
- Reduced motion jumps directly to the requested pose and stops meters while preserving user-initiated audio. Hidden/offscreen stages stop drawing. WebGL failure retains HTML controls and a static rendering of this same model.

## Sources and editable files

- `scripts/build-deploy-deck.py`: reproducible Blender build/export.
- `deploy-master-v01.blend`: original corrected kinematics; preserved.
- `deploy-master-v02.blend`: satin bezel UV correction; preserved.
- `deploy-master-v03.blend`: current source, including physical control legends.
- `mechanism.json`: Blender-evaluated frame samples and exported node list.
- `public/portfolio/deploy-deck-v01.glb`: current runtime export; scene requests revision 3 to invalidate the old cached mesh.
- `DeployDeckScene.tsx`: model, lighting, animation playback, physical fader.
- `deck-vfd.ts`: live fluorescent-display artwork.
- `MusicDeck.tsx` / `music-controller.ts`: homepage integration and shared power/audio intent.

## Visual verification

`docs/visual/deck-deploy/` contains actual browser screenshots and a silent `power-cycle.webm`, not generated concept images. The two fallback PNGs are captured from this same Three.js renderer with transparent page backgrounds.

During verification, missing UV coordinates made the bezel render nearly white when the bump map was applied. UVs were added in Blender. A second regression left paused meters frozen above zero; browser assertions now check that pause keeps deployment at 1 while spectrum energy becomes 0.

Final browser checks cover 1440 × 900, 390 × 844 and 1920 × 1080; native Enter playback, arrow-key volume (25 → 26), physical horizontal fader drag (26 → 54), touch playback, pause/next without retraction, OFF returning deployment to 0, reduced motion and forced WebGL loss. No JavaScript exceptions were recorded by the audit. This does not claim an unmeasured frame rate or pixel-perfect reproduction of the hardware reference. Root page, current GLB and both fallback images returned HTTP 200 at handoff.

The current casing is intentionally not presented as final product-photography-level material work. Further material/reflection tuning should use these actual browser captures, with the power mechanism held fixed. The Monitor, terminal internals and hero were not changed in this revision.
