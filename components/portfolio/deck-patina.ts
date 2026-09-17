export type DeckPatina = {
  width: number;
  height: number;
  /** Neutral multiplicative color, encoded as LINEAR values, not sRGB. */
  surface: Uint8Array;
  /** Absolute roughness values. Set the material roughness multiplier to 1. */
  roughness: Uint8Array;
};

// Absolute roughness, not a second multiplier over the generated roughness map.
export const deckFinish: Record<string, { roughness: number; variation: number; bump: number; anisotropy: number; clearcoat: number }> = {
  DarkAnodized: { roughness: .57, variation: .06, bump: .006, anisotropy: .15, clearcoat: 0 },
  TitaniumPaddle: { roughness: .29, variation: .025, bump: .002, anisotropy: .65, clearcoat: .08 },
  CobaltEnamel: { roughness: .24, variation: .025, bump: .001, anisotropy: 0, clearcoat: .65 },
  NarrowChrome: { roughness: .19, variation: .018, bump: .001, anisotropy: .45, clearcoat: 0 },
  // Moulded matte key caps, polished a little where thumbs land, seated in rubber.
  Graphite: { roughness: .44, variation: .05, bump: .005, anisotropy: 0, clearcoat: .12 },
  Gasket: { roughness: .86, variation: .03, bump: .008, anisotropy: 0, clearcoat: 0 },
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/**
 * A unique, non-tiled piece of worn metal: broad oxidation, fine matte grain,
 * and a few feathered tool marks. No periodic wave, quantized contour or grid.
 * Generate once per device, then upload each byte array as an RGBA DataTexture.
 */
export function createDeckPatina(width = 512, height = 256, seed = 0x6d2b79f5): DeckPatina {
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 2048)) {
    throw new RangeError('Patina dimensions must be integers between 1 and 2048.');
  }
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (randomState + 0x6d2b79f5) >>> 0;
    let n = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };

  // Signed, rotated ellipses overlap at unrelated scales. Their centers are
  // irregular rather than lattice-sampled, so no cell boundaries can show up.
  const clouds = Array.from({length: 36}, (_, index) => {
    const radius = index < 24 ? .1 + random() * .3 : .025 + random() * .075;
    const angle = random() * Math.PI;
    return {
      x: random() * 1.2 - .1, y: random() * 1.2 - .1,
      cosine: Math.cos(angle), sine: Math.sin(angle),
      inverseX: 1 / radius, inverseY: 1 / (radius * (.55 + random() * .85)),
      strength: (random() * 2 - 1) * (index < 24 ? .65 : .24),
    };
  });

  const marks = new Float32Array(width * height);
  for (let index = 0; index < 18; index++) {
    const x1 = random() * width, y1 = random() * height;
    const length = (.025 + random() * .105) * width;
    const angle = index % 5 === 0 ? random() * Math.PI : (random() - .5) * .22;
    const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length;
    const strokeWidth = .55 + random() * .55;
    const strength = (random() < .3 ? -1 : 1) * (.3 + random() * .65);
    const xMin = Math.max(0, Math.floor(Math.min(x1, x1 + dx) - 2));
    const xMax = Math.min(width - 1, Math.ceil(Math.max(x1, x1 + dx) + 2));
    const yMin = Math.max(0, Math.floor(Math.min(y1, y1 + dy) - 2));
    const yMax = Math.min(height - 1, Math.ceil(Math.max(y1, y1 + dy) + 2));
    for (let y = yMin; y <= yMax; y++) for (let x = xMin; x <= xMax; x++) {
      const along = clamp(((x + .5 - x1) * dx + (y + .5 - y1) * dy) / (length * length), 0, 1);
      const distance = Math.hypot(x + .5 - x1 - along * dx, y + .5 - y1 - along * dy);
      const feather = Math.max(0, 1 - distance / strokeWidth);
      const taper = Math.min(1, along * 10, (1 - along) * 10);
      marks[y * width + x] += feather * taper * strength;
    }
  }

  const surface = new Uint8Array(width * height * 4), roughness = new Uint8Array(surface.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = (x + .5) / width, v = (y + .5) / height;
    let field = 0;
    for (const cloud of clouds) {
      const dx = u - cloud.x, dy = v - cloud.y;
      const rx = (dx * cloud.cosine + dy * cloud.sine) * cloud.inverseX;
      const ry = (dy * cloud.cosine - dx * cloud.sine) * cloud.inverseY;
      field += cloud.strength * Math.exp(-2 * (rx * rx + ry * ry));
    }
    const oxidation = Math.tanh(field);
    let hash = Math.imul((x + 1) ^ (seed >>> 0), 374761393) ^ Math.imul(y + 1, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    const grain = ((hash ^ (hash >>> 16)) >>> 0) / 4294967296 - .5;
    const mark = marks[y * width + x];
    const shade = Math.round(255 * clamp(.925 + oxidation * .07 + grain * .018 + mark * .035, .7, 1));
    const matte = Math.round(255 * clamp(.625 - oxidation * .105 + grain * .055 - mark * .1, .4, .85));
    const offset = (y * width + x) * 4;
    surface[offset] = surface[offset + 1] = surface[offset + 2] = shade;
    roughness[offset] = roughness[offset + 1] = roughness[offset + 2] = matte;
    surface[offset + 3] = roughness[offset + 3] = 255;
  }
  return {width, height, surface, roughness};
}
