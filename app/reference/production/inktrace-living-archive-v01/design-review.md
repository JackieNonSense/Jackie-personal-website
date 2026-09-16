# InkTrace Living Archive — Phase 01 review

Status: ready for art-direction review, not approved for production integration.

Local route: http://localhost:3011/studies/inktrace/living-archive/review

The old `/studies/inktrace/pixel-window`, homepage, music deck, monitor and rift were not edited in this phase. No commit, push or deployment was performed. Pre-existing working-tree changes were preserved.

## What is delivered

- Four independently composed imagegen concept boards, each showing initial and expanded/selected states. Versioned masters and exact prompts remain alongside this note.
- Timeline: folded chronology with two years and six sample records. The active record is Departure, Sep 21, 312, with Mara/Sen and Chapter III.
- Characters: three file alcoves, a shared paper courtyard, and visible ground-level relationships. Selected records enter a lower reading zone.
- AI: source-file feeds and a paper network preview. The sequence ends at **Waiting for confirmation**; a future implementation must require a visitor action before filing.
- Wiki: a manuscript-first workbench. The paired states show wide image versus right wrap, quotation insertion, and an initially empty index becoming a linked record below the page. Original sample quotation: “We keep what the tide forgets.” — Mara.
- Real browser font specimens: locally packaged Fusion Pixel 8px proportional/monospaced at 16/32px and 12px proportional at 24px, with OFL and component licenses preserved.
- Three independent 32×48 character sheets with aligned feet. Canvas action proof, manual frame inspection, pause, OS motion preference updates, offscreen/hidden-frame cleanup. Walking changes both position and pose.
- Asset GIF and a 6.36-second silent recording containing 68 actual browser captures of the action test.

## What the boards do NOT prove

The concept images are not product screenshots or production backgrounds. Their actors are part of the concept raster; **they must not become the final backgrounds**. Production requires clean environment layers, separate foreground occluders/props, and animated actors with consistent palettes and dimensions.

The lettering drawn into artwork is illustrative, not a loaded font. The separate type specimen is the evidence for the actual typography. Generated bottom control wording (especially the Timeline board) is also provisional; final navigation remains Timeline / Characters / AI Assistant / Wiki with the approved controls.

The review has no working Timeline hierarchy, relationship editing, AI confirmation state machine, Wiki resize/reflow/reorder, or full book-to-window interaction yet. None is being represented as implemented. The action storyboard describes the intended production sequence.

Idle and turn in the on-page sprite test are held key poses, not finished multi-frame idle/turn cycles. Walk and work use independent frames. Final motion still needs contact-path calibration, approach/stop transitions, and character consistency with each scene.

## Verification completed for this review only

- 20 scoped tests pass: gallery/manual tabs/fallback/type, character runtime/action controls, asset registration and distinct raster poses, and live OS motion preferences. New feature tests were run failing before their implementations.
- TypeScript `--noEmit` and scoped ESLint pass.
- Real isolated, hidden, **muted** Chrome: widths 390/1024/1440/1920 at DPR 1 and 2. No document-width overflow; all reviewed buttons at least 44px high; fonts actually loaded at intended sizes.
- Four different board resources; no image cropping. Mobile artwork is a scaled art-review board, **not** validation of the future responsive production scenes; full-size images remain available.
- Walking frames and elapsed time change; pause holds exact time; offscreen drawing stops; changing OS reduced motion stops drawing while manual frame stepping remains functional.
- No runtime exception or Next development error badge after fixing child keys.
- No audio/video/iframe or InkTrace API requests. The host injects `local.adguard.org` requests into even the isolated browser; these are retained separately in the network evidence rather than hidden.

Evidence: `docs/visual/ink-living-archive/phase-01/browser-audit.json`, screenshots, `browser-sprite-proof.gif`, and `recording.json`.

## Next gate

Review the four spaces, actual pixel lettering and sprite proof first. After approval, implement **only the complete Wiki sequence first**: typesetter delivery → real image resize and text wrap → real quote reorder → reserved linked-record preview → visitor takeover. Verify DOM hit targets, no occlusion, actor frame changes, pause/cancellation and touch controls before extending to the other three scenes. Do not replace the homepage or publish until separately authorized.
