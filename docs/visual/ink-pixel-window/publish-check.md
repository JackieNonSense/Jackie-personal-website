# Main publication check — 2026-09-15

User authorization: push the approved B pixel-archive sample. The homepage integration gate remains in place.

- Base: 680bf0e (local main and origin/main matched before this change).
- Isolated candidate: clean main archive plus the explicit 25-file sample allowlist; no unrelated dirty/untracked project files.
- `next build --webpack`: passed, including TypeScript, prerendering and build traces. `/studies/inktrace/pixel-window` is a static route.
- `vitest run tests/ink-pixel-playback.test.ts tests/ink-pixel-window.test.tsx --maxWorkers=1`: 19/19 passed.
- `git diff --cached --check`: passed.
- Homepage, deck, Monitor, rift and private InkTrace project were not included.
- Documentation correction after the build only records the subsequent publish authorization and removes accidental leading plus signs in three prompt headings; runtime files match the built candidate.

This records a successful local production build, not a claim that a hosting provider's deployment has completed.
