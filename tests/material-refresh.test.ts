import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('keeps volume focus on the rail only for keyboard navigation', () => {
  const css = readFileSync('components/portfolio/Deck.module.css', 'utf8');
  expect(css).not.toContain('.modelVolume:focus-within');
  expect(css).toContain('.modelVolume:has(input:focus-visible)');
  // Keyboard activation must depress the key too, so the state is an attribute.
  expect(css).toContain('.modelKey[data-pressed=true]');
});
it('uses separate finish profiles instead of multiplying one patina across all surfaces', () => {
  const source = readFileSync('components/portfolio/DeployDeckScene.tsx', 'utf8');
  expect(source).toContain('deckFinish');
  expect(source).not.toContain("source.name==='DarkAnodized'?.93:.8");
});
