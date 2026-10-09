/** Component-level tokens, only where a value belongs to one component and nowhere else. */

/** Magnet guide: double stroke (core over a dark case) with measuring ticks, from Cianotipo. */
export const magnetGuide = {
  coreWidth: 1.6,
  caseWidth: 4,
  /** px between ticks along the guide. */
  tickSpacing: 20,
  /** Every Nth tick is a major one. */
  majorEvery: 5,
  tickMinor: 5,
  tickMajor: 8,
  /** Ring drawn at the contact point when the image snaps. */
  contactRing: 44,
} as const;

export const cameraPill = {
  height: 56,
  inset: 12,
  edgeWidth: 1,
  gap: 4,
} as const;

export const bottomSheet = {
  /** Dragging further than this fraction of the sheet's height closes it on release. */
  closeThreshold: 0.33,
  /** Release velocity (px/s) that closes it regardless of distance. */
  closeVelocity: 900,
  handleWidth: 36,
  handleHeight: 4,
} as const;

/** Splitter preview: gap opened between tiles when they separate. */
export const splitter = {
  tileGap: 12,
  cutDash: [4, 4],
} as const;
