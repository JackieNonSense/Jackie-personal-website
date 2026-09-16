# Living Archive — Phase 2 / Wiki working study

2026-09-16. Local only. No homepage replacement, push, deployment, music, Monitor or rift edits in this phase.

## What is implemented

- `/studies/inktrace/living-archive`: one complete Wiki prototype. The approved four concept boards remain at `/studies/inktrace/living-archive/review`.
- Independent generated **empty** workshop and cobalt map, with masters and exact generation prompts retained in this directory. The empty environment contains no baked-in characters.
- Three separate, registered 32×48 actors reuse the reviewed phase-one sprite sheet. They follow independent routes; walk frames change together with position. Work, turn and low-frequency idle poses are separate frames. Carried paper and map objects and contact shadows are separate canvas layers.
- A nine-slice environment surrounds a **real HTML manuscript**. Characters remain in the reserved lower rail. Nothing is positioned over the manuscript or its interaction handles.
- Local Fusion Pixel: 8px source at16/32px;12px source at24px. Body content has no distress mask or blur.
- Image width, float direction and real text flow change together. The resizing handle supports pointer capture, touch and arrow keys, including takeover from the current animated width rather than an old keyframe value.
- The quotation is actually reordered in the DOM. Linked character/region records enter the preallocated lower reading slot, never a covering drawer.
-22second sequence, including3.5seconds on the complete automatic result. Continuous canvas/width updates do not update the React tree every frame; semantic steps and deliberate controls do.
- User edits permanently take over until Replay. Pause resumes at the same time; closing cancels the old scene and reopening starts fresh. Focus returns to the book or relevant link.
- `still`, live reduced-motion preferences, page visibility and viewport intersection stop the continuous clocks. Reduced motion exposes all eight key steps and all editing controls.
- Local image failure before or after hydration and denied2D contexts retain readable HTML and controls. CSS supplies the same workshop as a static environment when drawing is unavailable.

## Composition and sample content

The exterior uses the approved24/76 black-stock/ivory composition, reduced cobalt wordmark and a1120px maximum window. The inner window has a stage, reserved index slot, layout controls and stable transport area. Mobile uses a single column with reflowed text and44px controls; it does not shrink a desktop screenshot.

Independent fiction: Mara the archivist, Ivo the mapmaker, Sen the guide; an Outer Coast map and field journal. No private world, API, account, real AI or product recording is involved. The fixed `FEATURE DEMO / SAMPLE CONTENT` disclosure remains visible.

The generated map is cropped as a wide banner in the initial layout and shows more of its2.4:1 composition as it narrows. The viewport is a functional illustration, not a recreation of the actual InkTrace editor.

## Evidence

Output folder: `docs/visual/ink-living-archive/wiki-v01/`.

- `wiki-native-demo.gif`: actual Chrome screencast, original timing, no audio or generated transitions.216sampled frames over27.121seconds. Automatic sequence ended at22.029seconds; then manual wrap, quote reorder and region lookup.
- `wiki-in-context.png`: actual full composition.
- `wiki-mid-animation.png`, `wiki-auto-result.png`, `wiki-manual-result.png`: actual browser states.
- `390/1024/1440/1920-{1,2}-{start,result}.png`: viewport andDPR evidence.
- `layout-audit.json`: overflow, live image dimensions, stable window, text clearance and actual center/edge hit testing.
- `motion-audit.json`: gait, pause, offscreen, frozen/background lifecycle, live reduced motion, real pointer/keyboard/touch input, replay and cleanup, resource and error observations.
- `fallback-audit.json`: all eight steps at all four widths; blocked map request and denied graphics context.
- The earlier `wiki-live-demo.gif` is a slower diagnostic screenshot-capture recording; use **wiki-native-demo.gif** for reviewing timing. Both are retained, not substituted for generated footage.

The isolated browser was hidden and force-muted. No audio/video elements or InkTrace requests were made. An OS-installed AdGuard script appeared as an environment-injected external resource; it is recorded separately from the site's localhost assets. No frame-rate claim is made from a sampled GIF.

## Reproduce

Use the existing3011server and an isolated, muted Chrome debugging session on9333.

```text
node node_modules/vitest/vitest.mjs run tests/ink-living-wiki-runtime.test.ts tests/ink-living-wiki-ui.test.tsx tests/ink-living-wiki-canvas.test.ts --maxWorkers=1
node node_modules/typescript/bin/tsc --noEmit
node scripts/ink-living-wiki-audit.mjs
node scripts/ink-living-wiki-fallback-audit.mjs
node scripts/ink-living-wiki-motion-audit.mjs
node scripts/record-ink-living-wiki-native.mjs
```

RED was observed before implementing runtime, DOM interactions, focus restoration, context rejection and pre-hydration image-error recovery. Browser assertions also caught layout/hit-target problems and keyboard takeover from stale animation width. All captures are of the actual route, not concept-board backgrounds.

## Review gate / remaining work

This is **one working Wiki scene**, not the completed four-scene showcase. Next review: typography, density, character behavior and the relationship between art and readable controls. Following approval, expand Timeline, Characters and AI as distinct scenes, then implement shared scene navigation and the refined book-to-window transition. Homepage integration remains unapproved for this phase. Existing pages and unrelated user changes are preserved.
