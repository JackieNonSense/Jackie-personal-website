import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lastCall } from '../components/terminal/content/callers';

/** Every text file under a folder. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx|md)$/.test(name) ? [path] : [];
  });
}

describe('privacy', () => {
  it('never shows the owner\'s birthday in the terminal or its documents', () => {
    const leaks = [...files('components/terminal'), ...files('docs/terminal')]
      .filter(path => /1127|11-27|11 月 27/.test(readFileSync(path, 'utf8')));
    expect(leaks).toEqual([]);
  });

  it('dates the first last call from the story, and later ones from the visits', () => {
    const first = lastCall(null, Date.now());
    expect(first.toString()).not.toContain('1,127');
    expect(typeof first === 'object' && first.en).toMatch(/^Last call: 2033-05-21 23:16, \d+ days ago$/);
    const again = lastCall(Date.now() - 2 * 86_400_000, Date.now());
    expect(typeof again === 'object' && again.en).toMatch(/2 days ago$/);
  });
});
