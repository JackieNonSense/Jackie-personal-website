# Living Archive — four playable scenes

Local implementation, 2026-09-16. No push or deployment. Homepage, music deck, Monitor and rift were not edited in this turn.

## Entry points

- `/studies/inktrace/living-archive`: book entry and all four interactive scenes.
- `/studies/inktrace/living-archive/wiki`: the approved standalone Wiki workshop, retained for comparison.
- `/studies/inktrace/living-archive/review`: original four concept boards; not represented as implemented screenshots.

## Implementation

- Three new imagegen environment layers; the approved Wiki background and separately authored sprite atlas are retained. No character is baked into a background.
- Timeline unfolds a paper rail, changes real year/month/event hierarchy and sends a record to the reading slot. Two years, six consistent events.
- Characters walk from distinct entrances, turn when selected and show direct connections more strongly than unrelated ones. Chapter appearances derive from the same example story.
- AI types a request, brings three existing files into a graph preview and stops at confirmation. Only an explicit click starts the 2.4-second filing action. No live AI or account writes.
- Wiki retains real image float/resize, quotation DOM reordering and a separate linked-record slot.
- One external narrative clock per mounted scene; React updates at semantic boundaries. Rendering, asset readiness and inputs are separate. SceneSelection invalidates stale asynchronous loads; the old scene remains until the chosen art is ready.
- Motion follows adding-animations: 100 ms restrained control feedback, 240 ms window entrance and 280 ms scene transition. Reduced motion keeps explicit key-step controls. No camera bounce, audio or full-page motion.
- The shared frame-loop regression catches synchronous subscription reentrancy. This also fixes the approved Wiki renderer's potential double-RAF scheduling at semantic boundaries.

## Layout and accessibility

24% black-paper copy / 76% ivory stage, max window 1120px. Fusion Pixel 16px text and 24/32px headings. Art and readable HTML remain separate.

Desktop scenes retain an identical window height. On phones, the three compact scenes use a shorter 620px stage; Wiki retains the taller, legible manuscript rather than shrinking its typography. This intentional mobile adaptation trades identical total window heights for readable content and avoids vertically stretching every room to the manuscript length.

44px or larger primary controls. Manual-activation tabs: arrows move focus, Enter/Space selects. Closing returns focus to the book. Pause, offscreen and visibility gates hold both narrative and ambient clocks. A live reduced-motion change stops movement without removing controls.

## Assets and prompts

Mode: built-in image_gen, not CLI/API. Exact prompts and reference roles: [scene-asset-prompts.md](./scene-asset-prompts.md).

Masters in this directory:

- `timeline-environment-v01.png`
- `characters-environment-v01.png`
- `ai-environment-v01.png`

Runtime assets:

- `public/studies/inktrace/living-archive/scenes/timeline-v01.webp`
- `public/studies/inktrace/living-archive/scenes/characters-v01.webp`
- `public/studies/inktrace/living-archive/scenes/ai-v01.webp`

They are lossless 768×512 derivatives of the retained generated masters. Canvas uses a shared 2-CSS-pixel logical grid with nearest-neighbour sampling. Existing sprites are 32×48 source cells drawn at 64×96 CSS pixels.

## Verification and evidence

Evidence directory: `docs/visual/ink-living-archive/four-scenes-v01/`.

- `layout-audit.json`: 390/1024/1440/1920 widths × DPR 1/2 × four scenes; 32 combinations. Checks real center/edge hit targets, overflow, reading-slot separation, fonts and desktop height stability.
- `motion-audit.json`: 16 browser checks covering pause/resume, hidden/offscreen clocks, changing gait and position, manual takeover, explicit AI confirmation, rapid switches, close, live reduced motion and touch. Zero runtime exceptions.
- `fallback-audit.json`: four scenes with Canvas unavailable and environment/map images blocked. Controls and reading remain usable.
- `recordings.json`: actual Chrome screencast metadata, original timing, all silent. `timeline-live.gif`, `characters-live.gif`, `ai-live.gif`, `wiki-live.gif` include autoplay and manual interaction, not generated video.
- Each scene has start, mid-animation, automatic result and manual screenshots, plus mobile/desktop reduced-motion result captures.
- Scoped TDD suites cover runtime transitions, safe coordinates, story consistency, manual tab interaction, focus return, Wiki operations, asset-race cancellation, single-RAF ownership, sprites and reduced motion. TypeScript and scoped ESLint also checked.

Current validation: 62 scoped tests; TypeScript and scoped ESLint pass. Layout checks 32/32, lifecycle/interaction checks 16/16 and blocked-art/Canvas fallback checks 4/4. Visitors can also select **Preview connections** to take over the AI sequence immediately, without skipping its separate confirmation gate.

No audio/video/iframe in the demonstration. Requests are local assets; no InkTrace API is used. Browser environment may inject `local.adguard.org` traffic, which is not application code. Tests use a separate hidden Chrome profile with `--mute-audio`; existing user tabs and music playback are not used.

Tests and visual review are separate: the GIFs/screenshots are the review evidence; passing tests alone is not a claim of final artistic approval.
