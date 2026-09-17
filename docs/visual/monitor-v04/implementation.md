# Monitor v04 — stable ochre finish and stronger reflections

The user prefers the darker ochre transient frame found in the load audit. This version makes that palette intentional and stable, rather than displaying an incompletely lit frame.

- Removed RoomEnvironment / PMREM initialization for this isolated homepage scene. The fixed warm direct-light rig is the final lighting; no environment-texture contribution is added later.
- Retained the physical worn ABS maps, geometry and boot behavior. Increased and narrowed the analytic softbox reflection at the top right and strengthened the curved side reflection. These are shader reflections using the convex surface normals, not ray tracing. Shadow resolution increased to 2048 with adjusted bias.
- Camera preparation occurs in a layout effect. A tested presentation state machine waits for a draw followed by R3F's after-render callback. The live scene remains invisible until then. This avoids declaring readiness inside a pre-render useFrame callback.
- Replaced the independent SVG design with public/portfolio/monitor-standby-v04.png, exported as transparent PNG from the actual browser WebGL canvas after a completed black-screen frame. CSS dimensions and the model projection match the live component. Fallback boot text and native /terminal links remain available.

## Verification

Tests were observed failing before changes to readiness and poster behavior. Run regression with `npm test -- --maxWorkers=2`. Browser screenshots, interaction recording and checks are in this directory. Cold-load instrumentation and screenshots are in ../monitor-v04-load; run `node scripts/monitor-load-audit.mjs --v04` to repeat. The audit checks one monitor scene, hidden pre-ready canvas, and no light-shell pixel jump. Use `--export-poster` only when deliberately regenerating the poster after material changes, then rerun the audit without export so its placeholder comparison uses the final asset.

Only homepage Monitor rendering changed. Music deck, rift and existing /terminal internals untouched; no deployment or push.

Final results: 63 tests passed across 13 files with two workers; TypeScript and targeted ESLint passed. Cold-load shell sample stayed at RGB 122,101,70 from first draw to settled/awake states (no later environment sampler); unfinished canvas visibility was hidden. Actual 390×844, 1440×900 and 1920×1080 browser checks passed, including keyboard, touch, reduced motion and context loss. Both root and review URL returned HTTP 200 after handoff checks. These checks are not a claim about performance on every physical GPU.

Preview: http://localhost:3011/#experiments
Review: http://localhost:3011/review/monitor-v04/index.html
