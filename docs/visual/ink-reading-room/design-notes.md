# InkTrace — reading room / local interactive study

Preview: http://localhost:3011/studies/inktrace/reading-room

## Decision

This is a typography-and-interaction study, not a replacement homepage or an InkTrace product screen. The previous paper study remains at `/studies/inktrace`. The music deck, monitor, homepage, and production deployment are untouched.

Reduce the earlier concept's theatrical typography, generated paper artifacts, and arbitrary decorative labels. Use an ivory reading surface, a black project column, and muted red only for links and relationship cues. The one irregular boundary belongs to the transition between project information and the reading surface. Texture is intentionally withheld at this stage.

## Interaction

- Writing: two inline references open a contextual record. The desktop source paragraph retains the same dimensions and position.
- Record changes: a clipped 320 ms reveal with 16 px travel, no bounce or continuous animation. Repeated clicks immediately resolve to the latest record.
- Connections: a small semantic relationship view, not a pretend AI-generated network. The Dungeon was **built by** Archivists of Old and **built during** the Second Era. Either destination opens its record.
- AI workflow: a labelled explanation of request → review → confirmation/write. It does not run AI or manufacture results.
- Escape / Close: dismiss the record and return focus to the source name.
- Mobile: after a reference is selected, bring the record into view with minimal native scrolling. No scroll capture or modal gate.
- Native keyboard tab navigation, live system reduced-motion preference, and manual motion pause are supported.

## Content provenance

The creator's motivation comes from the conversation: large fictional worlds, fragmented chapters/characters/timelines, designing and building a tool for that need, then adding AI integration.

The Dungeon, Second Era, Archivists of Old, and excerpted prose come from the supplied Wiki screenshot. Archivists of Old is a **group**, not an individual. The Second Era description only restates its relationship in that passage; no unseen record contents are invented. This local study is not permission to publish the example fiction. No private project, database, or account was accessed.

The AI workflow and shared-reference behavior are user-confirmed. The design is an editorial demonstration, not an exact product UI, screenshot, live assistant, or product recording.

## Validation

TDD: ten new behavioral tests were first observed failing against the previous study, then implemented and verified. A real-browser touch visibility assertion also failed before the mobile scroll correction and passed afterward.

- Unit suite: 160 tests / 32 files passed before the final mobile-only correction; all 10 study tests passed again after it.
- TypeScript and targeted lint checked separately.
- Actual browser sizes: 390 × 844, 1440 × 900, 1920 × 1080; mobile and large desktop at DPR 2.
- No horizontal overflow at those sizes; record opening preserves desktop source geometry.
- Mouse, touch, Escape focus restoration, connection navigation, reduced motion and pause checked.
- No audio/video/iframe/canvas on this route; no runtime exceptions captured.
- All browser sessions used a dedicated hidden `--mute-audio` profile and were closed after checking. The user's browser was not used.

The browser checks establish behavior and layout, not a subjective fidelity score. This remains a design direction to review before homepage integration.

## Evidence

- `desktop-default.png`: reading state
- `desktop-record.png`: open shared record
- `desktop-connections.png`: relationship state
- `desktop-ai-workflow.png`: workflow explanation
- `large-record.png`: DPR 2 large desktop
- `mobile-full.png`: full mobile layout
- `mobile-touch-result.png`: viewport immediately after touch and automatic reveal
- `mobile-record.png`: focused mobile record view
- `browser-checks.json`: measured browser results

Reproduce the browser checks using `scripts/check-ink-reading-room.mjs` with a dedicated muted Chrome CDP session on port 9333. This script visits only the local study and contains no music playback commands.
