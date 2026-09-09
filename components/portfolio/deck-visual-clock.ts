import type { MusicStatus } from './music-controller';

export type DeckVisualClock = {
  boot: number;
  exchange: number | null;
  exchangeId: number | null;
  title: string;
  previousTitle: string;
  visibleTitle: string;
};

export type DeckVisualInput = {
  deltaMs: number;
  lit: boolean;
  powered: boolean;
  exchangeStartedAt: number | null;
  title: string;
  still: boolean;
  status: MusicStatus;
};

export function createDeckVisualClock(title: string): DeckVisualClock {
  return { boot: 0, exchange: null, exchangeId: null, title, previousTitle: title, visibleTitle: title };
}

/** Called only for visible scene frames; deltaMs is capped by the caller.
 * Audio intent remains authoritative when reduced motion or background time
 * means the visible animation clock did not observe an entire track change.
 */
export function advanceDeckVisualClock(previous: DeckVisualClock, input: DeckVisualInput): DeckVisualClock {
  const { deltaMs, powered, lit, title, still, status, exchangeStartedAt } = input;
  const boot = powered && lit ? still ? 500 : Math.min(500, previous.boot + deltaMs) : 0;
  let { exchange, exchangeId, previousTitle } = previous;

  if (!powered || status === 'error') {
    exchange = null;
    exchangeId = null;
    previousTitle = title;
  } else {
    if (exchangeStartedAt !== null && exchangeStartedAt !== exchangeId) {
      exchange = 0;
      exchangeId = exchangeStartedAt;
      previousTitle = previous.title;
    }
    if (exchange !== null) {
      // Retain the ID after settlement: enabling motion again must not replay
      // the same exchange while the audio controller is finishing its timers.
      exchange = still || exchangeStartedAt === null ? 1050 : Math.min(1050, exchange + deltaMs);
    }
  }

  return {
    boot, exchange, exchangeId, title, previousTitle,
    visibleTitle: !still && exchange !== null && exchange < 650 ? previousTitle : title,
  };
}
