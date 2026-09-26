import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { musicTracks } from '../components/portfolio/music-tracks';

const supplied = [
  { title: 'Fly high', artist: '浜崎あゆみ', src: '/audio/fly-high-cut.mp3', hash: 'd9e5b1d3615c501577468e32763a1dfc18b6e8409a0d1537c5f35d9111272e88' },
  { title: 'army_mov', artist: 'ilyhiryu', src: '/audio/ilyhiryu-army-mov.mp3', hash: '9408d144065d17362ee7b3128bd02f06db98e64e06882f474e24735fbe11cdaa' },
  { title: 'DIVA', artist: '2z2', src: '/audio/2z2-diva.mp3', hash: '8a7d7864827baf5ceec2b7ba0b41491dd7edef9ed347eab295974c9d9ea94b7d' },
  { title: "Everything You've Ever Dreamed", artist: 'Arianne Schreiber', src: '/audio/arianne-schreiber-everything-youve-ever-dreamed.mp3', hash: '01b7846cd938ecd0840a4ccc86169e90156e55b65aa1ecf477fd7d637fb11d4b' },
] as const;

describe('selected personal soundtrack', () => {
  it('keeps the supplied songs in order, with the corrected Fly high cut first', () => {
    expect(musicTracks.map(({ title, artist, src }) => ({ title, artist, src }))).toEqual(
      supplied.map(({ title, artist, src }) => ({ title, artist, src })),
    );
    expect(new Set(musicTracks.map(track => track.id)).size).toBe(supplied.length);
  });

  it.each(supplied)('preserves the supplied audio bytes for $title', ({ src, hash }) => {
    const path = `public${src}`;
    expect(existsSync(path)).toBe(true);
    expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(hash);
  });
});
