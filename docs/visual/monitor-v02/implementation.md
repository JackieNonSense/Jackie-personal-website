# Monitor v02 — isolated implementation review

Scope: the homepage Monitor only, plus removal of the decorative SIGNAL DETECTED label. The deck, rift animation and /terminal internals were not rebuilt in this iteration. No deployment or git push.

## Rendering

- Dedicated lazy R3F scene; no old DeviceSurface or HTML ENTER/glow layers in the active Monitor.
- Open, beveled extruded shell and recessed bezel, beige polymer bump texture, independent power button and feet.
- 48 × 36 subdivided convex screen; startup drawn into a 768 × 576 CanvasTexture. A second curved mesh reflects two stationary analytic softboxes using surface normals. This is a lightweight artistic reflection shader, not a ray-traced glass simulation.
- Fixed frontal orthographic camera; responsive projection without stretching the model. Pixel ratio capped at 2.
- Procedurally generated local room environment, no external HDR or model download.
- Mutually exclusive static fallback and initialized WebGL surface. Context loss restores a static completed startup on focus and native terminal links.

## Interaction

Render-time state machine: off → warming → sequential lines → ready; leaving fades out over 500ms and cancels pending progression. No queued boot timers. Re-entry starts a fresh short sequence. Reduced motion or global motion pause shows the completed text immediately. Offscreen / hidden tabs stop scene drawing; resumed render does not accumulate missed wall time. No recurring scan/glint loop, audio or forced waiting before navigation.

The preview text is fictional JR Industries terminal atmosphere, not a real connectivity check. The existing terminal's full code, game lifecycle and global keyboard handlers are not imported.

## Verification

TDD: observed failing timeline, geometry and integration tests before implementation. 58 unit/component tests passed after initial integration. TypeScript and targeted ESLint checked. Browser assertions and actual artifacts are in checks.json; run `node scripts/monitor-browser.mjs` against a dedicated Chrome CDP endpoint on 9333 and local Next preview on 3011.

Visual review led to lower shell lighting, darker glass, larger screen text and explicit Courier New rendering. Screenshots are visual evidence, not a claim of final art approval. Browser checks do not establish performance on physical mobile GPUs. Actual /terminal navigation and its existing application are intentionally left unchanged.

Preview: http://localhost:3011/#experiments
Comparison: http://localhost:3011/review/monitor-v02/index.html

Next: obtain visual feedback on this single object before rebuilding the music deck's genuine drag knob / transport mechanism, then refine the local rift response.
