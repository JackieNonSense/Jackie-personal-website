# JACKIE interactive portfolio — local implementation

## Open

- Interactive page: http://localhost:3011/
- Captured scroll film and section images: [review gallery](portfolio-review/index.html)
- Browser-accessible copy: http://localhost:3011/review/scroll-v01/index.html (static review artifacts; not the live homepage).
- Dev command: `npm run dev` (or `npm.cmd run dev` in restricted PowerShell).
- Root switches to the new portfolio only in development. Production composition is intentionally retained. No commit, push or deployment was performed.
- `/design/hero-00` remains a historical static calibration tool, not the actual homepage.

## Implemented

- Separate paper material, clean name stencil, static SVG toner/fade, clipped Canvas glyphs and semantic HTML navigation.
- Fine-grain stencil composition avoids the connected maze texture present in rejected imagegen name revisions. The material plate is opaque; paper edges do not open or stretch during scrolling.
- Three deterministic glyph layers at 12/20/30 CSS px/s; local hover slowing and INKTRACE alignment; click/Enter/Space lock, second click or Escape release; ordinary #work link remains available in static mode.
- Global pause and live system reduced-motion preference; redraw stops offscreen or when the document is hidden; resumed frame time capped; backing resolution capped at DPR 2. No audio and no homepage WebGL import.
- Natural scrolling across Signal, Work, About, Experiments and Contact; shallow character parallax (max 20px within the stationary clip); restrained section reveals and a chapter readout.
- Text-led Inktrace presentation with the real external URL; readable personal introduction and technology practice; lightweight monitor entry; original email/social links.
- Public signature is JACKIE. Old birthday decoration removed from the retained legacy header and hero, as well as the calibration header. The unredacted reference was moved recoverably to `app/reference/production/hero-00/reference-private-original.png`; comparison uses a redacted copy. Existing email is the user-approved exception.
- Monitor route and internals remain unchanged. Existing unrelated worktree changes preserved.

## Verification

- `node node_modules/vitest/vitest.mjs run`: 30 tests across 5 files; new behavior was introduced after failing tests.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- Scoped ESLint over new portfolio components, entrypoint, tests and browser scripts: passed.
- `node scripts/check-preview-home.mjs`: root and assets HTTP 200; all chapters present; original public reference HTTP 404; port 3011 preserved.
- `node scripts/portfolio-browser.mjs --record`: actual Chromium pointer lock / Enter / Space / Escape / native touch tap / pause-resume / offscreen suspension / live reduced-motion changes, chapter navigation, 1440×900, 390×844 DPR 2 and 1920×1080 DPR 2. No uncaught runtime exceptions or horizontal overflow.
- Browser regression caught and fixed misplaced CONTACT, a fixed pause control overlapping the hero link, and nonreactive system motion preference.
- [Raw browser report](portfolio-review/checks.json) records a short frame timing sample and recording provenance. These headless measurements are not a device FPS guarantee.
- Full production build was not run against the active dev output directory; this is a local-only handoff, not a production-release certification.

## Honest limits

- Inktrace could not be reached from this environment. The blue typographic panel is an editorial project title, not an invented app screenshot. No unsupported product metrics/features are claimed.
- Imagegen returned 1586×992 sources even when a larger size was requested. Wide DPR-2 output is browser composition, not proof of native 4K asset detail.
- The new paper edge is lighter; generated paper fibers are still a visual review point. This iteration is not claimed to be pixel-identical to the original art direction.
- The reference-redaction output has some material drift; keep the private original for true visual comparison.
- The lower chapters intentionally use quieter typography and spacing. Their visual balance should be judged in the actual scroll, not inferred from passing tests.

## Source organization and assets

- `components/portfolio/` contains the page, glyph interaction/model, name compositor, content and scoped styles.
- No new runtime dependencies, backend, account system or database.
- [Asset provenance and exact prompts](portfolio-assets.md) documents built-in imagegen usage and selected/rejected outputs.
- TDD skill shaped behavioral regression tests; adding-animations shaped motion limits and static equivalents; imagegen supplied versioned raster assets. Fine-grain final lettering is implemented as native SVG compositing rather than accepting failed generated texture.
