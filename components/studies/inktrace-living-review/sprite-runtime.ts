export const SPRITE_ACTIONS = ['idle', 'walk', 'turn', 'work'] as const;
export type SpriteAction = (typeof SPRITE_ACTIONS)[number];

/** One logical pixel grid. Long suspended-frame gaps are discarded, not caught up. */
export function advanceSpriteClock(time: number, delta: number, held: boolean) {
  return held || delta < 0 || delta > 100 ? time : time + delta;
}

export function sampleSpritePose(action: SpriteAction, time: number) {
  if (action === 'walk') {
    const progress = (Math.max(0, time) % 3800) / 1900;
    return {
      frame: 1 + Math.floor(time / 140) % 4,
      offsetX: Math.round((progress <= 1 ? progress : 2 - progress) * 38),
      facing: progress <= 1 ? 1 : -1,
    };
  }
  return {
    frame: action === 'work' ? 6 + Math.floor(time / 240) % 2 : action === 'turn' ? 5 : 0,
    offsetX: 19,
    facing: 1,
  };
}
