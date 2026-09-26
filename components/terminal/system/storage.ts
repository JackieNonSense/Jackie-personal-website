/**
 * What the machine remembers on this device: visits, sound, progress, scores.
 * Storage can be missing or throw (private windows, blocked site data); the machine
 * then simply forgets, and nothing else changes.
 */
export type Store = {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
};

const PREFIX = 'jr-terminal:';

export function createStore(backend: Storage | null = null): Store {
  const memory = new Map<string, string>();
  const read = (key: string): string | null => {
    try { return backend ? backend.getItem(PREFIX + key) : memory.get(key) ?? null; } catch { return memory.get(key) ?? null; }
  };
  return {
    get<T>(key: string, fallback: T): T {
      const raw = read(key);
      if (raw === null) return fallback;
      try { return JSON.parse(raw) as T; } catch { return fallback; }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      memory.set(key, raw);
      try { backend?.setItem(PREFIX + key, raw); } catch { /* forgetful, not broken */ }
    },
  };
}
