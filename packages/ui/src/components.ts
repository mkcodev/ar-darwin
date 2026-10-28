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
  /**
   * The look on the phone's camera: thin and faint, it appears when a target gets grabbed and
   * fades on its own `holdMs` later even if the image stays on it.
   */
  quiet: {
    coreWidth: 1,
    caseWidth: 2.5,
    /** Peak opacity of a guide. */
    opacity: 0.55,
    /** How long a guide stays before it starts fading by itself. */
    holdMs: 400,
    /** Length of that fade. */
    fadeMs: 240,
  },
  /** The width guides sit this far in from the canvas's sides, so they are not half off-screen. */
  edgeInset: 2,
  /** The pinned position's guide is dashed (on, off) so it never reads as an axis. */
  pinDash: [8, 6],
  /** Half length of the arms of the cross at the pinned position's center. */
  pinCross: 10,
} as const;

export const cameraPill = {
  height: 56,
  inset: 12,
  edgeWidth: 1,
  gap: 4,
} as const;

/**
 * The camera's dock (tile status, opacity and the main action) in one surface: a single outline
 * and, inside, zones told apart by tone (`camera.well`). The inner radius is the outer one less
 * the padding, so corners stay concentric. Hit areas of the 44 dp zones grow to `touchTarget`.
 */
export const cameraDock = {
  /** Space to the screen's sides. */
  sideMargin: 12,
  /** Space under the dock, over the bottom safe area. */
  bottomGap: 12,
  radius: 28,
  padding: 8,
  gap: 6,
  innerRadius: 20,
  edgeWidth: 1,
  /** Height of the status and opacity zones. */
  zoneHeight: 44,
  /** Height of the main action row. */
  actionHeight: 52,
  /** Side of the minimap in the status zone. */
  minimapSide: 32,
  /** Progress segments: height and gap. */
  segmentHeight: 4,
  segmentGap: 3,
  /** Width of the opacity value, so «7 %» and «100 %» line up. */
  valueWidth: 44,
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

/** Splitter preview: gap opened between tiles when they separate, cut lines and name tags. */
export const splitter = {
  tileGap: 12,
  cutDash: [4, 4],
  /** Original cut line, drawn on the tiles that were extended. */
  cutWidth: 1.5,
  /** Outline of the tile picked last. */
  currentWidth: 2.5,
  /** Pinch zoom of the preview goes from 1× up to this. */
  maxZoom: 4,
  /** Name tag («A1») over each tile: a pill, legible on any photo. */
  tagHeight: 28,
  tagPaddingX: 10,
  /** Width of one character of a tag, to tell if a tag fits in its tile. */
  tagCharWidth: 9,
  /** Distance of the zoom reset button from the corner of the preview. */
  zoomResetInset: 8,
} as const;

/** Tile picker of the camera: the whole grid in a sheet, one cell per tile. */
export const tilePicker = {
  /** Shortest side of a cell: the touch target. */
  minCell: 44,
  gap: 4,
  cellRadius: 8,
  /** Outline of the tile being traced. */
  currentWidth: 3,
  /** Name tag («B2») in a corner of each cell. */
  tagHeight: 22,
  tagPaddingX: 6,
  tagInset: 4,
  /** Check badge in the opposite corner of a tile that is done. */
  badgeSize: 20,
  badgeInset: 4,
} as const;

/** Touch-lock button over the camera: a ring fills clockwise during the long press. */
export const lockButton = {
  size: 56,
  edgeWidth: 1,
  ringWidth: 3,
  /**
   * Outer diameter of the progress ring, graphite track included: wider than a fingertip, so it
   * shows around the finger holding the lock. The disc stays `size`, centred inside it.
   */
  ringSize: 72,
  /** Graphite track around the progress arc: the accent never sits straight on the photo. */
  ringTrackPad: 2,
} as const;
