# Continuous print portfolio — local implementation

Art direction approved from `app/reference/production/continuous-scroll-v01/concept.png`.

## Implementation

- One black scanned-paper substrate behind all five transparent chapters; no full-width beige sections or blue cards.
- A single pointer-transparent paper fault spans the composition, behind readable HTML content.
- Accessible, selectable condensed display headings: INKTRACE / JACKIE / STILL EXPLORING / LET’S CONNECT, with a stationary SVG luminance texture mask.
- Separate paper material and live HTML typography compose the Inktrace print. A large cobalt imprint crosses into About. The specimen is explicitly identified as portfolio artwork, not a product screenshot.
- The existing Canvas character interaction, keyboard lock/release, pause, reduced-motion preference, visibility suspension and ordinary anchors remain intact.
- Subtle existing Motion reveal and hover patterns retained. No new animation library, scroll hijacking, autoplay audio, or homepage WebGL.
- Existing monitor route and contact destinations preserved. Birthdate excluded from identity; the explicitly approved existing email remains unchanged.
- Mobile recomposes the work title, paper, description and About rather than shrinking a desktop canvas.

## Local rollout

Root preview: http://localhost:3011/. Development-only page selection preserved; no production entry switch, commit, push or deployment.

Browser artifacts are written to `docs/visual/continuous-scroll-review/` without overwriting the previous design review. Screenshots and WebM are actual browser captures, not imagegen mockups.

## Verification

- TDD: four new composition/content tests observed failing before implementation; all 34 tests across six files pass after implementation.
- Added real-browser regression checks for the work title/paper collision, final-letter mask cropping, transparent section backgrounds, and noninteractive full-page decoration. Each detected visual regression was observed failing before its corresponding fix.
- Continuous-layout checks cover 390, 768, 1440 and 1920 CSS-pixel widths. Interactive browser captures cover 390×844 and 1920×1080 at DPR 2, and 1440×900 at DPR 1.
- Browser script checks pointer click, Escape, native Enter/Space, touch lock/release, pause, offscreen suspension, live reduced-motion preference changes, chapter updates, horizontal overflow and Canvas DPR ceiling. The report records no runtime exceptions.
- TypeScript and scoped ESLint pass. Browser frame samples are diagnostic measurements in headless Chrome with software GPU, not a hardware performance promise.
- Local review page: `/review/scroll-v02/index.html`. Earlier `/review/scroll-v01/` is intentionally preserved for comparison.

The material plates are still full-resolution PNGs (approximately 4.5 MB combined). Compression and production delivery tuning remain release-preparation work; this turn does not authorize production rollout. No fabricated Inktrace product screenshot is used.

## Asset provenance

Mode: built-in imagegen. Original outputs remain in the generated-image archive. Final independent material plates:

- `public/portfolio/black-stock-v01.png`
- `public/portfolio/torn-stock-v01.png`
- `public/portfolio/toner-mask.svg` is authored code-native SVG, not a generated bitmap.

The first torn-paper attempt produced baked checkerboard pixels rather than alpha and was rejected. A follow-up produced a pure black surround; the runtime applies a luminance mask from that same material so the surround cannot appear as a rectangle.

### Exact black-stock prompt

Use case: photorealistic-natural. Asset: reusable website material background texture, NOT a website mockup. Create a 1536 x 1536 square flatbed scan of rich almost-black Xerox printed uncoated paper. Extremely fine irregular pale toner dust, sparse delicate short scratches and worn paper fiber specks, subtle inhomogeneous black ink density, dark charcoal neutral black overall, very dark but visible exquisite microtexture. Restrained physical material, not grunge illustration. Fine non-repetitive stochastic copier grain, NO contours, NO worms, no dramatic broad crumples or creases, NO text, letters, numbers, symbols, borders, torn openings or objects. Even flat light, no vignette or illumination hotspot. Texture extends to all four edges, suitable for a continuous website background behind readable typography. Black average near #090a09, fine grey specks not bright white snow. No watermark.

### Exact initial torn-stock prompt (rejected checkerboard)

Use case: photorealistic-natural. Asset: single isolated scanned torn paper cutout for compositing into a website. Generate one blank broad slightly landscape off-white greyish uncoated paper sheet with genuinely TRANSPARENT background, preserving delicate naturally torn fibers all around the perimeter. New image around 1536 x 1280. The paper nearly fills the image with only a 2% transparent margin. Shape is broad roughly rectangular but irregular: left edge a gentle torn inward curve near upper third, bottom gently slants down to the right, top nearly horizontal but uneven, realistic small frayed paper strands. Match the exposed pale paper material in the supplied reference's Inktrace section, BUT completely blank: remove all letters, cobalt graphics, UI, blue marks, text and numbers. A material cutout only, NOT a website. Paper interior is relatively flat for laying real HTML typography on it, fine copier dust and tiny grey fibers, slightly worn, grey-white not yellow parchment. No huge stains, crumpling, perspective, curl, bevel or drop shadow. Absolutely NO surrounding black paper; alpha transparency outside the cutout. No text, logos, artwork or watermark.

### Exact selected torn-stock follow-up prompt

Edit this paper material image only. Preserve the exact grey-white paper sheet, its shape, scale, texture, fibers and placement. Replace EVERY grey and white checkerboard square outside the paper with perfectly uniform pure BLACK (#000000), including all gaps between frayed paper fibers. There must be NO checkerboard pattern left anywhere. The background should be opaque pure black, not simulated transparency. Do not change the paper at all. No text, no artwork, no borders, no shadow. This is an isolated material plate for screen blending onto a dark website.
