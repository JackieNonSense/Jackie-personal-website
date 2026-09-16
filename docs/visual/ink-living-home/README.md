# Living Archive — homepage integration

2026-09-16. User approved replacing the production homepage's InkTrace section and pushing main.

## Scope

- The actual `/` route renders the existing four-scene Living Archive at `#work`.
- Embedded mode uses a labelled section and h2, retaining one main landmark and the personal-name h1.
- The approved 24/76 print composition, pixel fonts, book entry, scenes and local interactions are retained.
- Homepage framing replaces art-review / original-study links with the selected-work label and `#about` continuation. The external InkTrace link is always available.
- The homepage's existing `still` flag reaches both scene renderers and the book animation. Global pause does not discard local pause. Existing Motion timings and reduced-motion key steps are retained.
- Scoped focus and link colors avoid inherited homepage styles washing out links on ivory paper.
- The standalone study/review/Wiki routes remain available.
- No music deck, Monitor, rift or terminal changes are included in this release.

## Verification

New homepage integration tests were observed failing before implementation (the real homepage did not contain the book entry). They now verify real scene navigation, Wiki reflow, close/focus restoration, landmark structure, section order, external navigation and pause ownership without starting audio.

An isolated export of the staged tree, excluding unrelated local changes, passed:

- 43 test files / 216 tests.
- Next.js production build with webpack, including TypeScript and static route generation.
- 23/23 browser checks against the production build; zero runtime exceptions.

`production/audit.json` records 390/1024/1440/1920 viewport checks across all four scenes, center/edge hit tests, minimum button dimensions, layout separation, font family, single-main/single-h1 semantics, close/focus and live pause/resume checks. Audio play attempts: zero. The test browser was separate, headless and force-muted.

Selected actual-browser screenshots are retained beside the audit. The checks were also run against local development at port 3011. No homepage screenshot is a generated concept image.

Reproduce with an isolated Chrome debugging session on port 9333:

```text
node scripts/ink-living-home-audit.mjs http://localhost:3011 docs/visual/ink-living-home/local
```

The temporary production verifier uses a separate port so the user's 3011 server is not disturbed.
