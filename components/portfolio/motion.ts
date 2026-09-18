/** The single motion vocabulary for the site. Take values from here rather than
 * writing numbers inline: this page once carried nine different durations and two
 * curves that no eye could tell apart, which is what made it read as unpolished. */

/** Standard curve: quick out, long settle. Used for every entrance and move. */
export const EASE = [.2, .7, .3, 1] as const;

export const DUR = {
  /** Micro feedback: a press, a hover, an immediate state flip. */
  tap: .08,
  /** Standard: most entrances, moves and reveals. Should be the common case. */
  base: .2,
  /** Secondary: larger elements, changes that must be noticed. */
  slow: .3,
} as const;

/** Delay between neighbours in a staggered group. */
export const STAGGER = .04;

/** Staged sequences only — a boot or a section hand-off may take this long. */
export const STAGE = { enter: .8, sequence: 1.2 } as const;
