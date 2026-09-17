# Cyan monitor — transparent, powered-off

Generated with the built-in imagegen edit tool on 2026-09-17, using the user's Midjourney image `codex-clipboard-e132b18f-9d62-4246-8b8c-1297049ea68c.png` as the edit target.
Output: `monitor-cyan-cutout-v02.png`, 1536 × 1024 RGBA. Copied without postprocessing; original generated output is `exec-c06aba16-5c4e-48f7-b5b6-9a857315fb1d.png`.

Prompt:
> Use case: background-extraction + precise-object-edit. Image1 is the EDIT TARGET, not loose inspiration. Create a production transparent PNG cutout of THIS exact cyan-black vintage widescreen CRT television for a website interactive terminal entry. Preserve the same straight-on camera, wide rectangular aspect, shell proportions, dark teal-black grainy industrial plastic/metal material, cyan bevel highlights, symmetrical ribbed side columns, two bottom speaker grilles, central bottom buttons and small feet. Preserve realistic sharp edges and subtle wear, do not redesign the television. TWO CHANGES ONLY: (1) Remove ALL surroundings: background, tabletop, ground plane, baked ground reflection, and all cast shadow outside the object. Everything outside the complete silhouette must be genuinely transparent alpha=0, not black, not a checkerboard rendered into the RGB image, no smoky halo. The isolated television floats with empty transparent space around and below it; all edges and feet fully visible. (2) Switch the screen OFF: remove every baked UI frame, panel, character, diagram and central glowing dot from the screen. Replace only the inner glass with clean near-black opaque smoked glass, very subtle dark teal ambient reflection to show its gentle CRT curvature, absolutely no text, no interface, no glow at center, no busy reflections. Keep inner bezel cyan reflection intact. Screen must remain opaque near black, not transparent. Transparent landscape canvas, approximately 3:2, object centered with about 7% clear padding on left/right and 8% top/bottom, no floor. High fidelity to reference, photorealistic object cutout, no labels or extra objects. Deliver actual transparent RGBA PNG.

Independent CSS shadow and small finite hover elevation create separation from the paper. No permanent bobbing, edge masking, ground photograph, or baked terminal interface. Actual terminal authentication remains unchanged.

## Display integration, v03

The shell remains this transparent asset. The visible display is no longer an HTML text overlay: a convex Three.js glass mesh samples a transparent 1024 × 640 glyph texture, with separate sharp-core and two-radius phosphor diffusion, 24% scanline modulation and bounded pointer-sensitive glass reflection. Glyphs start at0.20s and finish at1.50s; moving away decays phosphor over0.35s. Reduced motion resolves to a static state. The GPU clock stops offscreen, in the background and when globally paused. WebGL context loss falls back to a2D signal canvas without changing the shell or link.

Actual browser recording: `docs/visual/cyan-monitor-v03/crt-hover.gif` (52compositor frames,4.152seconds, silent). Four widths checked:390,1024,1440,1920;30monitor/Hero tests plus3About content-preservation tests passed. No deployment or Git push.

## JR hover sequence, v04

The approved shell and glass remain unchanged. Seven fixed-width ASCII rows now form a centered JR mark. The raster starts at 0.20s, settles by 1.60s, then introduces `ENTER _` at 1.85–2.00s. The former explanatory boot lines are removed. Leaving cancels the reveal and fades the exact last frame; entering again restarts it. Reduced motion shows the completed mark and prompt immediately.

Actual silent browser recording: `docs/visual/cyan-monitor-v04/crt-hover.gif`. The audit checks desktop hover, first-touch preview, keyboard focus, interruption/re-entry, motion pause, reduced motion, WebGL context-loss fallback, and widths 390 / 1024 / 1440 / 1920. It can run against an isolated release with `MONITOR_AUDIT_URL`. No terminal authentication or terminal-internal files belong to this update.
