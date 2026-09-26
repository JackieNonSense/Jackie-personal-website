# Approved portfolio release

The owner authorized pushing `main` and replacing the production homepage with the approved portfolio on 9 September 2026. `app/page.tsx` now renders the same Portfolio component in development and production. The terminal route is unchanged.

## Release contents

- Complete scrolling portfolio, interactive rift, audio player, asymmetric motorized music deck and monitor entrance.
- Runtime images/models/fonts, two licensed audio demos and attribution records.
- Tests, reproducible Blender builder scripts, and the small mechanism reports required by the tests.
- Existing design-review source and the models/rendered frames it references.

## Local-only working material

Browser profiles (`.edge-*`), tool caches, private unredacted references, Blender source/backup files, generated concept images, browser screenshots and recordings are retained locally, not included in this release. Paths in historical design notes may refer to those local working files.

The deployment service—not a Git push alone—determines when the domain starts serving the new build. Verify the root page contains the five portfolio chapters and `data-testid="music-deck"`, and that `/portfolio/y2k-deck/deck.glb` (with `/draco/draco_decoder.wasm`) and the licensed audio files are served successfully.

## Security preflight

The previous Next.js 16.0.10 dependency had published production advisories. The release uses Next.js / eslint-config-next 16.3.4 and React / React DOM 19.2.8, plus compatible fflate patch updates. `npm audit --omit=dev` reports zero production vulnerabilities after this update. Development-only audit findings are outside this runtime result; it is not a claim that every development dependency has been upgraded.
