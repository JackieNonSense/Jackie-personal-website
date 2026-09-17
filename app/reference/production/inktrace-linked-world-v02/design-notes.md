# InkTrace — linked-world editorial study v02

Date: 2026-09-10
Status: design discussion artifact, NOT implemented and NOT approved as a final page.
Scope: InkTrace portfolio section only. No changes to music deck, monitor, rift, homepage routes, audio or deployment.

## 1. What the design is trying to communicate

An author with a growing fictional world designed a workspace for that world.
The compelling experience is reading something, discovering a reference, and reaching its shared record without losing the original context.
The portfolio should reveal this behavior before explaining a dependency list or a generic feature inventory.

Confirmed by the user:
- They write extensive worldbuilding, including timelines, actual prose and character files.
- They designed the architecture themselves; AI integration came later.
- AI can propose organizing characters and a relationship network in chat; the creator reviews and confirms before the result is written into the workspace.
- Wiki supports the illustrated rich composition.
- Updating the referenced record changes the corresponding preview shown in the article.

Visible in supplied screenshots:
- Timeline event list, content view, editing panel, and selectable time precision.
- Wiki cover image, headline, lead, italic quotation, text with adjacent imagery, linked names, and a record preview.
- The record shown is "Archivists of Old"; it describes a group, not necessarily an individual character.

Not established:
- Arbitrary two-way rewriting of every document after a record change.
- Exact AI tool execution order, timing, graph layout or confirmation UI.
- Every possible editor layout operation.
- Permission to publish all supplied fiction or imagery on the live site.

## 2. Visual hierarchy

Desktop proposal: roughly one-third black identity column, two-thirds editorial leaf.
- Black column: modest INKTRACE wordmark, clear product positioning, personal motivation, always-visible external CTA.
- Ivory leaf: one curated Wiki excerpt. The reading is the main attraction, not a giant logo.
- Lower record leaf: partially hidden until a linked name or its tab is activated.
- One contextual drawer at a time; no three equal feature cards.
- The black field should continue naturally from the portfolio. Avoid an isolated clean SaaS rectangle.

Palette:
- Charcoal #121310
- Warm ivory #e8e1d1
- Body ink #211e18
- Dried crimson #893339

Typography:
- Condensed display for the portfolio wordmark.
- Readable editorial serif for the curated excerpt.
- Existing mono for small functional labels.
- Body letters remain untextured. Erosion belongs on large display type and exterior print fragments.
- Final fonts still need cross-platform verification; generated lettering is not a font implementation.

Material:
- Fine paper grain, not cotton-like large fibers.
- A few intentional tears, no repeated sawtooth edge.
- Short contact shadows under overlapping leaves, not deep floating-card shadows.
- Rough exterior / precise reading surface is the source of visual contrast.
- No extra cyber labels, cables, neon, perpetual drifting, or arbitrary collage objects.

## 3. The small interaction sequence

### Reading
An excerpt from the supplied Wiki sample is visible immediately.
"Archivists of Old" is a real button styled as an inline reference; a separate edge tab offers the same action.
The visit link is usable without completing the interaction.

### Proximity / focus
Proposal: underline or small reference marker responds within 80–100 ms.
No pointer-following tooltip. Hover only previews affordance, not required information.
No paper-wide scale, perspective tilt or bounce.

### Open
Click / Enter / Space opens the contextual linked record.
Main Wiki leaf and left identity column remain stable.
A lower record leaf translates from behind the existing lower edge, within an expanding local well.
Proposal: 280–320 ms eased reveal; opacity and short 40–50 ms content stagger are subordinate to movement.
Desktop visible reveal should be content-driven (approximately 150–220 CSS px), not a fixed full-screen animation.
The linked name remains visible while its record is read.

The dried-red leader must use the right-side reading gutter, NOT pass through a quote, image, title or body text.
Its purpose is to make the source/record relationship obvious.

### Close
Explicit close control, second activation, and Escape.
Proposal: 220–280 ms ease-out.
Focus returns to the reference/tab that opened the record.
No focus trap: this is an inline region, not a modal.
Closing does not navigate or discard user work because the portfolio demonstration is read-only.

### Reduced motion / pause
Content opens directly; no translation, continuous movement or animated line drawing.
State changes, focus indication, CTA and keyboard operation remain available.
No sound. No automatic AI call.

Existing study uses Framer Motion with cubic-bezier [.22, .72, .2, 1], roughly .32 s disclosure and .14 s tab response.
This proposal keeps that general short eased rhythm but replaces the generic drawer payload and simplifies geometry.
The adding-animations skill informed timing, contextual feedback and reduced-motion requirements.
Its linked external reference files were unavailable; its main instructions and the actual local component were read.

## 4. Product representation: no simulated screenshots

The generated board is PORTFOLIO EDITORIAL ART DIRECTION.
It reinterprets the supplied Wiki content and imagery and is explicitly labeled as a concept, not a product capture.
Generated text/image details must not be used as evidence of exact application behavior.

For implementation, choose with the user:
- A deliberately scoped read-only editorial demonstration using approved sample records, clearly labeled as such; or
- Actual product capture with an external editorial annotation layer.

Do not rebuild and market a fake full application UI.
Do not reuse the earlier public-homepage demonstration-of-a-demonstration image.
No private project/database access is authorized.

Suggested editable copy:
- "A writing workspace for connected stories."
- "I built the tool I needed for a world that kept growing."
- "EXPLORE INKTRACE"

The proposed lead and story sentence are portfolio copy drafts, not direct quotations by the user.
The Wiki text is an edited selection from the user-supplied sample, not a full faithful transcript.
The generated footer and marginal print are provisional; remove any that do not help orientation.

## 5. The AI demonstration — a distinct second layer

Do not hide the user's favorite AI operation inside a generic WHY drawer.
Give it a visible secondary entry associated with the writing sample, tentatively "See one request become structure".
The current board does NOT yet design this state.

Show a real recorded sequence:
1. Existing sample material.
2. The actual request in chat.
3. The returned proposal, available for review.
4. The creator's confirmation.
5. The resulting records/relationship view, as actually produced.

Use a muted, click-to-play recording or explicitly labeled recorded-step viewer.
Keep actual AI confirmation and writing order faithful to the product.
No production AI access from the portfolio; no fabricated live result, auto-send, invented latency or decorative animated network presented as an actual result.

Needed later: a short sanitized screen recording of that operation, and approval of a public sample.
Do not block this concept discussion waiting for a complete founder story, more feature lists or a full product export.

## 6. Responsive behavior

- Desktop: coherent identity/read/record composition, drawer does not cover the CTA.
- Narrow screens: identity -> Wiki excerpt -> local linked record -> secondary demonstration entry, with the primary external CTA still easy to reach.
- Record expands inline below its excerpt, not off the viewport edge.
- No horizontal dragging requirement or hover-only gate.
- Body target 16–18 px minimum; interactive target at least 44 px.
- The source reference may wrap naturally; do not force a decorative red line through wrapped text.
- On very small widths, replace the long connection leader with adjacent reference markers.

## 7. Review of generated concept-v01.png

Useful:
- Consistent black / ivory material family with the previously liked reference.
- Smaller product mark and clear permanent external CTA.
- Real-worldbuilding subject matter replaces generic category labels.
- A linked record has an identifiable physical relationship to the original leaf.
- Two states enable discussion of more than a single static poster.

Corrections required:
- Open-state red leader crosses the italic quote; route it through a reserved empty gutter in the next composition.
- Generated states are not pixel-identical; exact geometry must be shared in an actual prototype.
- The AI demonstration entry is not yet included.
- Decorative marginal slogan and small stamp may be removed for less clutter.
- Text remains a design draft, not a final approved product/public-fiction selection.
- No claim that the concept is a browser screenshot or that the UI already exists.

## 8. Artifacts and boundaries

- concept-v01.png: generated two-state raster concept board.
- imagegen-prompt.txt: complete built-in generation prompt.
- Built-in imagegen was used; no CLI/API fallback and no paid external audio or AI calls.
- The original generated file is preserved under the Codex generated_images directory.
- Files live under app/reference/production, not public.
- No homepage/study code edited this turn.
- No local server/browser started, no audio played, no push/deployment.

Next checkpoint is design feedback on this composition and the nature of the linked-record reveal.
Implementation, if subsequently requested, should start with one scoped prototype, then actual-browser visual review before homepage integration.

