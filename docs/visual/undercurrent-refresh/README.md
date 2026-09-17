# Local review — material / undercurrent / Inktrace

This iteration is local only at http://localhost:3011/. No commit, push, production switch, or terminal-internal change was performed.

## What changed

- Volume: removed the pointer-triggered container outline; keyboard focus uses an inset rail marker shared by WebGL and fallback controls.
- Device: independent absolute roughness profiles for anodized metal, titanium, cobalt enamel, and chrome; separate glass cover; directional plus finite-distance lighting; refreshed real-render fallback images. Existing Blender geometry already has bevels and weighted normals, so no replacement model or camera change was needed.
- Rift: locally displaced upper/lower photographic slices, shared aperture/shadow curve, subdued ink remnants and an inner signal layer. Mouse pin/unpin, Escape, keyboard and touch work without changing navigation. High-rate pointer events no longer reset/starve the animation clock. A painted first frame precedes hiding the fallback.
- Inktrace: confirmed product/motivation copy, public landing-page mind-map demonstration capture, two annotations, accessible clipped CTA, normal-flow mobile layout. Failed images switch to an explicitly labelled workspace structure; cached failures before hydration are also handled.

## Evidence

- `hero-rest.jpg`, `hero-open.jpg`, `hero-follow.jpg`, `hero-390.jpg`, `hero-1920.jpg`: real browser screenshots, with full-resolution PNG counterparts.
- `rift-interaction.webm`: actual rift Canvas recording, not a generated concept or full-page screen recording.
- `work-desktop.jpg`, `work-390.jpg`, `work-1920.jpg`, `work-annotation.jpg`: responsive product section.
- `deck-rest.jpg`, `deck-volume.jpg`, `deck-playing.jpg`, `deck-keyboard.jpg`, `deck-fallback.jpg`: actual device material and control states.
- `checks.json`: desktop/mobile layout, pointer volume, hover, reduced motion.
- `transport-checks.json`: playback, rapid next, mute, display mode, pause during exchange, paused-next, OFF, keyboard volume, reduced motion and WebGL loss.
- `input-checks.json`: real touch toggle, centred keyboard preview, offscreen suspension and blocked-image fallback.

## Reproduction

Use an isolated Chromium CDP instance on port 9333 and the local preview on 3011:

```text
node scripts/refresh-audit.mjs
node scripts/refresh-regressions.mjs
node scripts/transport-refresh-audit.mjs
node scripts/input-refresh-audit.mjs
npx vitest run
npm run build
```

The old `deck-deploy-audit.mjs` capture sequence stalled after its track-in screenshot in this environment. It is not counted as a successful new audit; the separate transport audit above completed the interaction checks. Do not confuse older `deck-edgy/checks.json` with this iteration's evidence.

Chrome/ANGLE emitted PMREM shader-compiler precision/division warnings during local material compilation; no runtime exceptions were recorded by the completed browser audits. This is not a cross-browser or GPU performance certification. DPR is capped at 2, and no unmeasured frame-rate claim is made.

The Inktrace image is a capture of the public website's demonstration, not the complete editor or any private writing project. Its source record is beside the image in `public/portfolio`.
