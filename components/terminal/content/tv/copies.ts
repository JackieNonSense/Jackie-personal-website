import { degrade, type Picture } from '../../graphics/bitmap';
import type { Display } from '../../system/display';

/*
 * One of Jackie's pictures as the generated world passes it around: a copy of a copy,
 * `generations` times over. Each is made once, the first time it is asked for.
 */

export const CITY_PICTURE = '/terminal/pictures/city.png';

const cache = new Map<string, Picture | 'loading'>();

export function generation(d: Display, url: string, generations: number): Picture | null {
  const key = `${url}#${generations}`;
  const hit = cache.get(key);
  if (hit && hit !== 'loading') return hit;
  if (!hit) {
    cache.set(key, 'loading');
    d.loadPicture(url).then(p => cache.set(key, generations ? degrade(p, generations, 7 + generations) : p)).catch(() => cache.delete(key));
  }
  return null;
}
