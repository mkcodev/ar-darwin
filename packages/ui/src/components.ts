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

/** Native slider (opacity on the camera, values in sheets). */
export const slider = {
  trackHeight: 4,
  thumbSize: 24,
  edgeWidth: 1,
  /** Ring of the surface colour around the thumb, so it reads over the filled track. */
  ringWidth: 3,
} as const;

/** On/off switch: a 48 × 24 track inside a 64 × 48 touch target. */
export const toggle = {
  width: 64,
  trackWidth: 48,
  trackHeight: 24,
  thumbSize: 16,
  /** Thumb travel from off to on. */
  travel: 24,
} as const;

export const segmented = {
  /** Gap between the sliding thumb and the control's edge. */
  thumbInset: 3,
} as const;

/** Hold-to-repeat buttons (stepper, fine adjust): first repeat after `delayMs`, then every `everyMs`. */
export const holdRepeat = {
  delayMs: 380,
  everyMs: 70,
} as const;

export const bottomSheet = {
  /** Dragging further than this fraction of the sheet's height closes it on release. */
  closeThreshold: 0.33,
  /** Release velocity (px/s) that closes it regardless of distance. */
  closeVelocity: 900,
  handleWidth: 36,
  handleHeight: 4,
  /** Dragging above the open position only follows the finger this much. */
  overdragElastic: 0.04,
  /** Centred on wide screens (tablets, landscape). */
  maxWidth: 560,
  /** Fraction of the screen height. */
  maxHeightRatio: 0.85,
} as const;

/** Splitter preview: gap opened between tiles when they separate. */
export const splitter = {
  tileGap: 12,
  cutDash: [4, 4],
} as const;

/** Touch-lock button over the camera: a ring fills clockwise during the long press. */
export const lockButton = {
  size: 56,
  edgeWidth: 1,
  ringWidth: 3,
} as const;
