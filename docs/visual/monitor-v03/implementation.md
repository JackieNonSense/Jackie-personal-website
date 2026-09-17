# Monitor v03 — worn ABS / convex glass

User-approved v02 silhouette, frontal camera and startup remain. This iteration only refines the homepage Monitor, leaving the music deck, rift and /terminal source unchanged.

## Reference review

Read RetroComputer.tsx, TerminalScene.tsx and CRTScreen.tsx and captured the actual local /terminal page (00-terminal-reference.png). Its depth cues come from warm key / cooler fill, recessed dark beige material, glossy black bezel and dimensional housing. The existing terminal content uses a flat plane; homepage v03 deliberately uses a true convex cap instead of claiming to copy nonexistent terminal curvature.

## Changes

- Elliptical CRT cap now rises 0.36 model units instead of 0.115, with screen/reflective surfaces moved forward. Its center projects beyond the front face, while the perimeter stays beneath the retaining frame. Camera and page placement unchanged.
- Continuous front-projected shell UVs replace raw extrusion UVs. Deterministic local 1024 × 768 color, roughness and bump maps add narrow edge grime, restrained discoloration, twelve localized fine scuffs and microscopic ABS grain. Plastic scuffs lighten the material; they do not reveal fictional metal.
- Warm upper-right key / cooler left fill, physical cast/received shadows on housing and bezel, and a low-clearcoat ABS material. The bounded analytic softbox reflection follows curved mesh normals; this is art-directed shading, not ray-traced glass.
- Startup timing, motion pause/reduced motion and touch behavior unchanged. No auto sound or camera rotation.

## Verification

Observed failures before implementing: stronger convexity, non-repeating normalized UVs, repeatable localized wear maps. All passed after implementation. Browser checks and actual recording in checks.json / 07-wake.webm. 08-material-detail.png is a browser screenshot crop at DPR 2, not an AI mockup. Keep v02 artifacts intact for comparison.

Preview: http://localhost:3011/#experiments
Review: http://localhost:3011/review/monitor-v03/index.html

WebGL fallback remains a simplified front-facing illustration, not a pixel-identical render of the new worn materials. No physical mobile GPU performance or final artistic approval is claimed by automated checks.

Final regression: 61 tests passed across 12 files with `npm test -- --maxWorkers=2`. The initial default-parallel run hit 5-second test timeouts under simultaneous browser recording load, followed by stale test DOM errors; the lower-concurrency rerun passed without changing application behavior or weakening assertions. Browser automation now awaits an actual reload event and observes a partial startup state instead of assuming it must occur at a fixed wall-clock delay.
