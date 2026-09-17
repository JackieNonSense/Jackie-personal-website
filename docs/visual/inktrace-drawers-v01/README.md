# InkTrace — interactive paper study

Preview: **http://localhost:3011/studies/inktrace**

This is an isolated prototype. The portfolio homepage, music deck, terminal and production deployment were not changed in this iteration. No audio component, music import or WebGL scene is present on this route. The study has `noindex, nofollow` metadata, but is not access-controlled.

## What to try

- WHY opens the confirmed reason for creating InkTrace.
- WORKSPACE introduces chapters, characters, world notes and timelines.
- CONNECTIONS explains the creative principle behind bringing those pieces together.
- Select a different tab to switch inserts. Select it again, use CLOSE, or press Escape to retract. Closing returns focus to the originating tab.
- The external product link is available with every drawer closed.
- On mobile the paper scales separately from the introduction; expanded content increases normal page height. No scroll locking or hidden interaction prerequisite.
- PAUSE MOTION and changes to the system's reduced-motion preference disable the transitions without hiding content.

## Art direction and implementation

Ivory / charcoal / dried oxblood, modest wordmark, overlapping paper and index tabs integrated into the poster. All typography, links and pull-tabs are real DOM elements, not text baked into a generated website screenshot. Main sheet remains stable while one insert retracts and another appears through a shared concealed opening. This sample intentionally uses a common downward reveal for all three content notes; separate sideways mechanical drawers are not implemented.

Framer Motion provides short interruptible transitions and delayed text appearance, with no perpetual movement. React external-store subscription follows live motion-preference changes. CSS Modules isolate all styles from the homepage.

The approved concept is archived at `app/reference/production/inktrace-drawers-v01/approved-direction.png`. This is an art-direction reference, not the displayed page background.

New material: `public/studies/inktrace/ivory-stock-v01.png`, generated with the built-in image generation tool. Prompt: a flat, overhead, blank warm-ivory uncoated archival paper sheet with fine pores, sparse flecks and subtle torn edges; no typography, shadows, folds, objects or decorations; transparent background requested. The output did not provide the requested clean transparent edge, so it is used only as an inset material texture. The responsive silhouette is a separate native SVG mask (`paper-edge.svg`), with a nonperiodic contour and fine edge displacement. Body text never receives a grain mask.

Existing portfolio black stock is reused. Font stacks use local Bodoni Condensed where available, with Times / Georgia fallbacks; no proprietary font binary was copied. Exact glyph proportions may differ between operating systems until an embeddable final typeface is selected.

## Verification

- Seven new component tests written and observed failing before implementation/fixes; 150 tests across 31 files passed using `npx vitest run --maxWorkers=3`.
- The unconstrained full run had one timeout in the existing deck-wide import test during concurrent browser work; the controlled-worker full run passed without changing that test.
- Production build and TypeScript passed. New TS/TSX files linted without errors.
- Real Chromium checks at 390×844, 1440×900 and 1920×1080: closed / each insert, one active panel, 44px minimum targets, viewport bounds, touch, Escape and focus return, live reduced motion, texture-loading failure. See `checks.json`.
- `inktrace-overlap-regression.mjs` caught and verified the fix for insufficient front-sheet overlap (25px, now approximately 89px) and a 3px mobile hover overhang.
- Actual browser screenshots: `closed-*.jpg`, `why-*.jpg`, `workspace-*.jpg`, `connections-*.jpg`, and `texture-fallback-390.jpg`, with full-resolution PNG equivalents.

Browser review uses a fresh project-owned profile with `--headless=new --mute-audio`. It must not reuse personal browser profiles. Shut down the isolated browser after review; do not exercise any music controls.

## Still to decide with Jackie

- Whether this paper/tab composition and reveal feel right in the actual browser.
- Final editorial wording for WORKSPACE and CONNECTIONS (current text is an openly labelled copy draft, not private-project data or a screenshot of the editor).
- Final cross-platform title typeface, then integration into the homepage only after approval.

No further assets or credentials are required to try this prototype. Nothing was committed, pushed or deployed.
