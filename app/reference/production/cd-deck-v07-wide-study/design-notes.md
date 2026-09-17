# Wide display / linear volume — Blender mechanism research

Status: independent design and kinematic study. Not final industrial design, not integrated into the homepage music player, and not a physical reconstruction of a Sony mechanism.

Local review: http://localhost:3011/design/deck-wide

## Reference and evidence

The supplied photograph shows a WX-C66MD-labelled car-audio unit with a dominant illuminated screen, small side controls and a compact lower console. The palette combines champagne metal, black optical surfaces, cyan/blue display graphics and chartreuse/amber indicators. The central screen arcs are useful visual references, not a reason to retain a physical rotary control.

Located the [official Sony WX-C66MD support page](https://support.sony.jp/electronics/support/mobile-cd-players-digital-media-players-wx-series/wx-c66md). Its linked manual was access-denied; the older Japanese PDF address redirects to Sony support. Therefore the photograph is the verified visual reference. The exact original linkage, torque, travel and flip angle remain unverified. No dimensions below should be attributed to Sony.

Blender research used the installed 4.5.13 LTS executable and inspected its actual glTF exporter options. Relevant primary references:

- [Blender parenting and transform hierarchy](https://developer.blender.org/docs/features/animation/parenting/): used separate translation and rotation parents.
- [Blender glTF animation documentation](https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html): object-transform animation can be exported; exporter output is additionally checked directly in this project.
- [Blender bevel documentation](https://docs.blender.org/manual/en/4.4/modeling/modifiers/generate/bevel.html): hardened/weighted normals preserve planar areas while smoothing bevel transitions. Documentation search text was available; some full manual requests were blocked by the provider.

## New proportions and material direction

- Working front: 180 × 100 mm in the study; glass: 144.8 × 64.9 mm. Glass occupies about 80% of width and 65% of height, approximately 52% of total face area. Do not mislabel this as 80% area.
- Dominant screen, narrow side rails, fixed lower console. No central rotary and no V-shaped metal wings.
- Champagne alloy with continuous rounded-rectangle profiles, narrow polished edges, graphite gaskets, and a separate black glass surface.
- Front camera stays frontal. The oblique fifth render is only for inspecting the proposed linkage.
- No Sony or JACKIE branding is copied onto the device.
- Curved UI outlines, segmented arcs, rectangular spectrum, track/time and three band readouts are deliberately differentiated. They are illustrative values in this study, not live audio measurements.

## Mechanical structure actually authored in Blender

```text
FixedChassis
  side rails / lower controls / enclosed loading bay
  VolumeFader
PanelCarriage                       translation only
  hinge arms and axles
  PanelHinge                        rotation around X
    ScreenAssembly
      back / continuous bezel / gasket / glass / display artwork
```

One unit is 10 mm; world Y is up and Z faces the viewer. The hinge sits at the lower screen edge. Its translation parent separates body clearance from panel rotation. Two guide arms remain connected to the fixed channels and transverse hinge axles.

Opening is 1.3 seconds at 60 fps, 79 sampled poses:

| Time | Proposed action |
| --- | --- |
| 0–100 ms | Remain seated; reserve immediate button feedback |
| 100–370 ms | Carriage extends 14 mm with zero hinge rotation |
| 370–390 ms | Clearance established |
| 390–1170 ms | Hinge rotates smoothly to 108 degrees |
| 1170–1300 ms | Settled open pose |

Closing plays the same exported animation backward, rotating upright before retracting. There is no spring bounce, camera tilt or floating panel. This is kinematic animation: no torque or physical motor force has been simulated. Perceived motor weight comes from the independent phases and eased speed, not a claim of physics simulation.

The GLB contains an actual `PanelOpen` clip with `PanelCarriage:translation` and `PanelHinge:rotation` targets. The local viewer loads that clip with Three.js AnimationMixer; it does not fake the flip using a CSS image transform.

## What the mechanism checks do and do not prove

- `mechanism.json` contains 79 evaluated Blender poses.
- Tests verify full carriage extension before significant rotation, a screen-back minimum Z greater than the body front plane, final angle, dominant screen proportions, absence of VolumePivot, and genuine exported animation channels.
- This is a coarse body-plane clearance check, not exhaustive triangle intersection testing, cable/connector routing, load analysis or mechanical certification.
- The opened screen visually overlaps the lower control region from a frontal viewpoint. Always preserve accessible external music controls during motion; do not hide pause behind the moving panel.
- A future prototype should also evaluate a smaller service angle if the 108-degree position consumes too much vertical space in About.

## Volume and music interaction proposal

- Replace circular dragging with a horizontal slider: click/tap to set, drag left/right to adjust; do not capture page wheel scrolling.
- Separate mute from volume dragging. Keep explicit play/pause and next buttons.
- Use an actual HTML range as the semantic/input source; the mesh fader mirrors its value. Provide at least 44 px touch height, keyboard operation and a full-width control below the device on phones.
- Screen arcs become output only: spectrum, level or playback progress. They are not invisible radial controls.
- Proposed change to the previous plan: separate OPEN from NEXT. OPEN explores the mechanism without initiating music; NEXT normally changes track without forcing a roughly 3-second open/close show on every song. This choice is a proposal for the next integration, not silently implemented in the existing player.
- Keep one homepage audio controller and its cancellation/permission/error logic. The research page creates no audio element and has no working music controls.
- OPEN/CLOSE and the inspection scrubber are the only live controls on the study page; device keys/fader there are model design, not connected audio controls.

## Display and quality before homepage integration

The research uses a mesh-based illustrative display to stay sharp in Blender. Production should use a deliberately sized, high-resolution dynamic display or vector/SDF text, not shrink the old tiny lettering. Actual audio samples must replace synthetic segments and band values.

At a 480 px-wide device, even this larger screen cannot make every decorative label readable. Main title, play state and volume need an explicit minimum reading size; auxiliary labels may be decorative, with real accessible information outside. Evaluate a larger desktop presentation footprint if the display cannot meet this constraint.

Blender renders use Cycles, 32 samples, denoising, 1920 × 1280, AgX and actual studio area lights. They are design renders, not screenshots of finished frontend quality. Browser mechanism lighting is simpler and visibly different; the review page explicitly explains the transition. Do not reuse the Blender still as a supposedly matching production fallback without renderer calibration.

## Deliverables and reproduction

- `wide-display-rig-v02.blend`: current editable master including lights/camera and the animation. Earlier master is retained.
- `wide-display-study.glb`: independent animated export.
- `01-front.png` through `05-hinge-inspection.png`: actual Blender renders.
- `mechanism.json`: evaluated pose records.
- `public/review/wide-deck-v01/`: only the review page's copied assets; not loaded by homepage.
- `docs/visual/deck-wide-study/mechanism.webm`: silent real-browser recording of the exported animation opening and closing.
- `docs/visual/deck-wide-study/report.json`: open/close, mobile no-overflow, reduced motion, no-audio and no-runtime-exception checks.

```powershell
& '.cache/cd-toolchain/blender-4.5.13-windows-x64/blender.exe' --background --factory-startup --python scripts/build-wide-deck-study.py
npm.cmd test -- tests/deck-wide-study.test.ts tests/deck-wide-page.test.tsx --maxWorkers=2
node scripts/deck-wide-audit.mjs
```

An earlier Blender save could not replace a version backup; it stopped before rendering. The corrected rig was saved to the new v02 master, then all five frames were rerendered and copied. Earlier files were not deleted.

No changes to the current homepage player, Monitor, Terminal or production deployment in this research milestone. Port 3011 remains the sole local preview entry.
