# JACKIE front-facing audio and beige monitor

Local-only implementation, September 2026. Preview: http://localhost:3011/ . The production branch in app/page.tsx and /terminal internals remain unchanged. No push or deployment performed.

## Approved visual change

The user rejected the minimalist deck, graphite flat display, and round portable CD proposal. The current implementation follows the approved front-facing silver car-audio fascia with segmented green display, and a front-facing beige (#d4cbb8) CRT. The approved image and exact built-in imagegen prompt are archived in app/reference/production/front-audio-v01/; the image is a concept and is not used as homepage imagery.

- About's deck stays subordinate to JACKIE, up to 480px wide. Mobile puts it after the biography.
- Actual React Three Fiber models provide the frontal casing and lighting. Native SVG front elevations survive lazy-load/WebGL failure; HTML controls remain independent of WebGL.
- Audio feedback is native segmented SVG digits, an analyser-driven Canvas spectrum, inset transport keys, a mechanical-looking volume fader, and a short slot shutter/faceplate response to changing tracks. Following the latest faceplate design, there is no exposed spinning disc or flying-disc animation.
- Monitor is warm beige with recessed black glass; hover/focus fades in a dim entry in 350ms, leave fades out in 500ms. Touch first wakes and reveals an explicit entry link. No terminal program is imported into the homepage; its Next link disables prefetch.
- Signal Study is removed. Rift no longer coalesces into INKTRACE: sparse deterministic vertical columns flow in both directions. Two separately clipped photographic paper layers move up/down by at most 12 CSS pixels over a continuous inner paper bed and dark backing. The continuous bed fixes the initially observed artificial black zigzag seam. Name and navigation remain stationary.

## Transport and resources

MusicController is an independently tested homepage-owned transport. Browser-audio is the only native media boundary. It creates one preload=none media element on an explicit playback gesture; context resume and media.play are invoked in that gesture task. GainNode fades do not depend on animation frames. Rotation/spectrum/glint pause is independent of sound. No audio autoplays or restores on return.

States: idle / loading / playing / paused / switching / error. Playback intent and asynchronous operation serials are distinct from the displayed state. Next is cyclic; ended uses the same exchange. Pause cancels a late start. On unmount, audio is paused, its source removed, nodes disconnected and context closed. StrictMode effect replay cannot dispose a live player.

Offscreen deck controls share that same controller in one small rack with motion pause. A real foreground-tab switch confirmed that the hidden page stops spectrum drawing while media time continues advancing.

Audio is local and unmodified: EDM Detection Mode and Voxel Revolution by Kevin MacLeod. Official track attribution panels specify CC BY 4.0. Source URLs, licenses, download URLs and SHA256 hashes are preserved in public/audio/LICENSES.md and exposed in MUSIC CREDITS. These are demo tracks, not the creator's work or final playlist.

## Verification / artifacts

Run npm test, npx tsc --noEmit, npx eslint components/portfolio. The final automated suite has 52 passing tests across nine files, including a regression for immediately skipping a failed track.

Run scripts/device-browser.mjs --record with a dedicated Chrome CDP instance on 9333. It verifies real decoded audio and changing analyser pixels, first-gesture keyboard play, next/pause cancellation, real blocked audio requests, simulated browser permission refusal, real foreground/background-tab behavior, static-motion independence, touch Monitor wake, WebGL context-loss fallback, SPA terminal cleanup and silent return. It also checks the rift's real movement, 12px lip displacement and offscreen suspension, and fixed-control/navigation separation.

Viewports: 1440×900, 390×844 and 1920×1080; mobile/wide DPR 2. scripts/continuous-layout-check.mjs additionally checks 768px, heading clipping, paper composition and transparent sections. scripts/check-preview-home.mjs checks the 3011 root, material serving, privacy reference 404 and configured default port.

Actual screenshots and silent interaction WebM: docs/visual/front-audio-review/. Browser report: checks.json. Recording is assembled from actual CDP viewport frames, never generated UI. The observed requestAnimationFrame intervals are environment-specific, not a hardware FPS guarantee.

Convenient local gallery: http://localhost:3011/review/audio-v01/index.html . Its files are copies of those actual screenshots, not concept images.

Remaining scope: user visual review and final personal playlist selection; no production rollout. Headless Chrome verifies the native media pipeline and browser behavior, not the user's speakers or physical mobile Safari. The prototype's procedural materials remain editable and should not be described as pixel-identical to the generated concept.
