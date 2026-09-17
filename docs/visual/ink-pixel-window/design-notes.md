# InkTrace — B / interactive pixel archive sample

Local preview: http://localhost:3011/studies/inktrace/pixel-window

The user selected B: a pixel-art archive with a large book, miniature people and drawers, with live readable elements embedded in the art. This is not a recreation of the product UI.

## Scope

Only the independent study route and new sample components/assets were added. Homepage InkTrace, music deck, Monitor and rift were not changed. On 2026-09-15, the user subsequently authorized publishing this sample to main; this does not authorize replacing the homepage. No sound, product API, account access, real AI or private fiction. The back link disables prefetch.

## Available in this sample

- Registered eight-frame pixel-book loop, long resting period; 96 × 84 logical pixels at 3×. Static fallback and persistent external visit link.
- Book → expanding window → Timeline. Close/Escape returns focus to the book; reopening resets to Timeline.
- Three clickable event objects on the book. Reading pauses the sequence and pulls out a record with summary, people and chapter.
- Two years / six consistent fictional events; Year/Month/Day reveals progressively precise dates.
- Characters: select one of three people to inspect declared relationships and appearances.
- AI: staged request → preview → confirmation → demo creation. No real saving.
- Wiki: staged folio layout, illustration/wrapped copy/quotation and a working character reference.
- Four manually activated tabs, previous/next, replay, pause and static steps. No auto-cycling between chapters.
- Visibility-aware clock and book loop; runtime reduced-motion changes; global pause precedence. Cleanup on unmount.

## Still a study, not final homepage acceptance

Timeline is the primary sample. Year/Month/Day currently changes precision, not a full aggregate-to-detail camera journey. The other three chapters demonstrate content and transitions but need further scene-specific art and motion refinement. Tiny illustrated people are static.

Opening uses a clipped frame expansion; the complete pixel-fragment morph remains a polish task. Mobile reflows records below the book for readability; a unified fixed-height mobile stage remains an integration task. The transparent book master retains some soft alpha around its silhouette.

No homepage integration until the user reviews this sample.

2026-09-16 local refinement: see [typography / motion v02](type-motion-v02/notes.md). This improves legibility, phased frame reveal, drawer ink sequencing and cancellation/focus behavior without changing the B artwork or publishing another commit. Earlier checks and images below describe the first sample and are preserved for comparison.

## Verification

TDD: reducer had eight failing tests against its stub; UI had ten failing tests. Both now pass (19 tests), including static steps, manual tab activation, close/refocus and event drawers. TypeScript --noEmit and scoped ESLint pass.

Real-browser checks: 1440×900 DPR1, 390×844 DPR2, 1920×1080 DPR2. No horizontal overflow or Runtime exceptions. Verified event-reading pause, rapid tab changes, close/refocus, reduced-motion switching, AI confirmation and absence of InkTrace API/resource requests. Results: browser-checks.json.

The owned headless Chrome was launched with --mute-audio. Actual captures are PNG/JPEG files here. book-turn-v04.gif is the sprite preview; archive-interaction.gif is recorded from the running browser, not concept art.

## Art and implementation

Built-in imagegen produced a dedicated text-free scene, not a flattened UI. Assets: public/studies/inktrace/pixel-world/. Exact prompts and preserved masters: app/reference/production/inktrace-pixel-window-v01/production-prompts.md.

The adding-animations skill informed short Motion feedback, reduced-motion alternatives and bounded transitions. The playback clock and content are separate.
