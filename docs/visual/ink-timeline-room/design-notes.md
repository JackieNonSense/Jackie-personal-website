# InkTrace — event-led portfolio study

Preview: http://localhost:3011/studies/inktrace/reading-room

## What changed

The earlier study looked like a separate application. This revision uses the portfolio's existing black stock, Six Caps heading font and toner mask. Project information sits on that black surface; the content occupies two slightly offset ivory sheets. The lower section reconnects visually to JACKIE and links to the actual portfolio About anchor. There is no new site-wide navigation, audio player or 3D scene.

The timeline appears immediately, above the existing Wiki/reference interaction. It is not hidden behind another tab. The active event opens a short downward reveal; a second control unfolds the writing note associated with the discovery. Motion uses the existing cubic-bezier easing, short durations, staggered event entrances, and reduced-motion/manual-pause fallbacks. No persistent movement or sound.

## Content provenance

All five event names and dates come from the user's supplied timeline screenshot:

- AC 1042, 26 November — Infiltration of the Palace
- AC 1042, 27 November — Discovery of the Grimoire
- AC 1043, 14 February — The Great Purge Begins
- AC 1043, 20 December — Decoding the Star-Map
- AC 1043, 20 December — Arrival at Black Harbor

These are fictional story dates, not personal information. The layout is an ordered sequence, explicitly **not proportional to elapsed time**. Both events on 20 December retain the same date.

Kaelen filtering includes only Discovery and Arrival, whose supplied summaries explicitly name him. It does not infer his involvement in the other entries. Decoding has no visible source summary, so its description discloses that limitation. Discovery's expandable writing note is the supplied note about mirroring the prologue and the internal Whisper.

The Wiki example remains a separate supplied excerpt. No relationship between The Dungeon and the Grimoire event is invented. The AI panel remains an illustrated explanation, not a live chat or generated result. The sample fiction remains local-review content; no private account was accessed and no production publication is authorized by this study.

## Behavior and evidence

- Six new tests were first observed failing for missing timeline behavior, then passed after implementation.
- Sixteen focused tests cover the timeline and the existing reading-room behavior.
- Final regression suite: 166 tests across 33 files passed. TypeScript and targeted lint also passed. Existing tests emit Motion's reduced-motion informational warnings.
- Event selection, latest-click behavior, Kaelen filtering, expandable writing note, Escape/focus restoration, arrow/Home/End navigation and paused interaction are covered.
- Browser checks cover 390 × 844, 1440 × 900 and 1920 × 1080, including DPR 2 and touch emulation.
- The event rail is intentionally horizontally scrollable on narrow screens; the page itself has no horizontal overflow in the measured sizes.
- Existing source-reference behavior, reduced motion, pause and absence of audio elements are checked again.
- All browser sessions are dedicated, hidden and muted; each is closed after testing.
- Full-page screenshots are captured after geometry assertions because CDP full capture temporarily removes the vertical scrollbar. A separate normal-click diagnostic confirmed unchanged source geometry.

See `browser-checks.json`, `desktop-default.png`, `desktop-writing-note.png`, `desktop-character-thread.png`, `desktop-full.png`, and `mobile-timeline.png` for actual browser evidence. These are browser captures, not generated concepts.

Only the independent study changed. The root homepage, music deck, Monitor and deployment are untouched. There was no commit or push.
