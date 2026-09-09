export type DisplayMotion = {
  reveal: number;
  levelGain: number;
  titleAlpha: number;
  titleOffset: number;
  needsFrame: boolean;
};

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Elapsed times come from the visible scene clock, never from an audio timer. */
export function displayMotion(bootElapsedMs: number, exchangeElapsedMs: number | null, still: boolean): DisplayMotion {
  if (still) return {reveal: 1, levelGain: 1, titleAlpha: 1, titleOffset: 0, needsFrame: false};

  let levelGain = 1, titleAlpha = 1, titleOffset = 0;
  const exchanging = exchangeElapsedMs !== null && exchangeElapsedMs < 1050;
  if (exchanging) {
    if (exchangeElapsedMs < 180) {
      const exit = smooth(exchangeElapsedMs / 180);
      levelGain = titleAlpha = 1 - exit;
      titleOffset = -8 * exit;
    } else {
      // The name changes only while dark. Incoming content starts to the right,
      // then settles without overshoot as the audio controller fades it in.
      const enter = smooth((exchangeElapsedMs - 650) / 400);
      levelGain = titleAlpha = enter;
      titleOffset = 8 * (1 - enter);
    }
  }
  return {
    reveal: smooth(bootElapsedMs / 500), levelGain, titleAlpha, titleOffset,
    needsFrame: bootElapsedMs < 500 || exchanging,
  };
}
