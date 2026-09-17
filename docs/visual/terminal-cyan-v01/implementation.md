# Cyan terminal — Three.js prototype v01

Implemented 2026-09-17 in `F:/Desktop/Programming File/Jackie-personal-website/jackie-portfolio`.

Preview: http://localhost:3011/terminal

## Implemented

- Real R3F / Three.js scene: extruded housing with an actual opening, recessed sloping bezel, dimensional ventilation grilles, convex screen, feet, control buttons, screws and floor contact shadow.
- Cyan grazing area light, narrow rim lighting, seeded microtexture, restrained bloom, layered analytic glass reflection and screen brightness transition.
- Canvas UI using original JR Industries / ECHO mails, files and log entries. Clickable screen navigation; keyboard 1–5, arrows, Enter and Escape.
- Guest session enters public content directly. This deliberately replaces the old password-first entry flow in the new presentation. Classified file remains ACCESS DENIED. No server authentication was involved in the old demonstration.
- Original SURVIVOR game is reused through CRTScreen's optional directGame entry, with a cyan palette and touch controls. Its original simulation is retained.
- Focus view, motion pause, stand-by/wake and an accessible DOM reading view. Mobile wake automatically opens reading mode.
- WebGL errors/context loss open reading mode; listeners are removed on unmount to avoid false failure during development hot reload.

The scene uses procedural geometry and textures, not an AI-generated monitor image. `concept-final.png` is the earlier visual concept only. `browser-terminal.png` and `browser-terminal-focus.png` are unedited captures of the actual localhost browser page.

## Verification

- Initial RED: all four new tests failed because the session and geometry implementation did not exist.
- Final terminal suite: 4/4 passed, covering read status/return position, locked content/list bounds, ray tests through the housing opening, convex glass and narrow viewport framing.
- Full project suite: 56 files / 292 tests passed in 288.20 seconds. Existing JSDOM Canvas getContext warnings were emitted; the suite completed successfully.
- TypeScript: `tsc --noEmit --incremental false` passed.
- ESLint: checked the new scene, wrapper, geometry, session, display and data modules.
- Browser: successful WebGL scene with no captured warning/error logs during final checks. Verified keyboard mail open, unread count, game render and exit, classified file denial, reading view, focus toggle.
- 390 × 844 viewport: automatic reading mode, native mail open, no horizontal page overflow. Temporary viewport override reset after verification. Browser's in-app viewport screenshot scaling was inconsistent, so do not use its phone bitmap to infer physical device legibility; layout dimensions and interactive behavior were checked directly.

## Scope and next refinements

This is the first interactive prototype, not a claim of visual identity with the concept or tested performance on physical mobile GPUs. Surface wear, glass reflections and the camera transition can be refined further. No audio was added. No production deploy, push, or commit was performed.

Changes are limited to terminal components and the new terminal test. Other uncommitted homepage and InkTrace changes were left in place. `RetroComputer.tsx` is retained as the unused original housing for comparison.

The current keyboard/game implementation is inherited in CRTScreen; the new archive interface is separated into terminal-session.ts, terminal-data.ts and terminal-display.ts. A later cleanup can isolate just the game engine, but this prototype avoids rewriting its behavior.
