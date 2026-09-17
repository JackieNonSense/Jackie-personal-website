# B archive / typography and motion polish — 2026-09-16

Local study: http://localhost:3011/studies/inktrace/pixel-window

## Scope

Local refinement of the selected B artwork, not a new visual direction. No homepage integration, push or deployment. The music deck, Monitor, rift and unrelated working-tree edits were not touched. No font files, generated images, product data or external dependencies were added.

## Typography

- Tahoma / Verdana for usable old-software controls; 13px desktop, 14px mobile feature navigation.
- Consolas / Lucida Console for dates, page numbers and archival metadata; 11px metadata minimum.
- Georgia for the writing itself; 15px record prose on desktop, 16px on mobile, 25–27px drawer titles.
- Retained the condensed poster title and cobalt wordmark. Pixel texture remains in the art; readable text has no texture mask.
- Replaced inconsistent Unicode feature pictograms with consistent 01–04 chapter markers. Clarified transport spacing and the finished state.

These are system font stacks, not copied proprietary font assets. Rendering varies slightly across platforms.

## Motion

- The book settles before a horizontal frame expands, then the frame opens vertically and reveals readable contents. Total opening remains 700ms; closing is 350ms, with ink leaving first.
- The temporary frame follows the same tested geometry as the reveal mask. Text is never stretched to form a window.
- A close during opening begins at the current pose, rather than jumping to a full window. Repeated closes do not restart the timer.
- The background illustration stays still between chapters. The old interactive scene unmounts immediately; the new overlay enters gently. No simultaneously active outgoing tabs or drawers.
- Drawers enter over 320ms; their ink follows in 35ms-staggered lines. Date stamps and captions have brief, separate transitions. Hover movement is limited to 2–3px.
- In-view/foreground state pauses scoped animation controls. Finished entrances are not restarted on tab return or global motion resume. Global static mode finishes short transitions and exposes manual keyframes.
- Clicking the already-selected chapter leaves a reading drawer alone. Opening in reduced-motion mode focuses Close; closing returns focus to the book.

`adding-animations` informed the short, restrained entrances, stagger, cancellation and reduced-motion support. No new animation library.

## Verification

TDD: six new reducer/UI tests failed before implementation; all 25 tests now pass. A browser regression first failed the original 11px control sizes; a further regression caught completed text fading again when global motion resumed, and was corrected.

TypeScript and scoped ESLint pass. `check-ink-pixel-polish.mjs` checks 1440×900 / DPR1, 390×844 / DPR2 and 1920×1080 / DPR2; records font sizes, fixed desktop window geometry, rapid chapter selection, focus return, manual keyboard tabs, hidden-tab pause, reduced-motion steps, AI confirmation and silent/no-API behavior. Results are in checks.json.

All captures are from the running local page. The recording browser is isolated and launched with --mute-audio. interaction-polish.gif shows book → window → reading drawer → chapter changes → close; PNGs retain the full typography detail. Capture frame rate is not a measured application frame rate.

## Still outside this refinement

This is a staged frame reveal, not a finished particle-by-particle pixel morph. The miniature people remain illustration elements. Timeline precision changes do not yet form a full camera/aggregate-event journey. The art and scenes are independent sample content, not an InkTrace recording or a working AI client. Mobile reserves reading space to avoid large scene-to-scene jumps; final homepage sizing remains a separate review.
