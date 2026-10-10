import { IDENTITY_TRANSFORM, MIN_SCALE, type Size, type Transform } from "./models";

// Every function here starts with the "worklet" directive so Reanimated can run it on the
// UI thread. They must stay plain math on plain objects: no Zod, no throws, no closures over
// anything that is not serializable, and no outer constants in default parameter values (the
// worklets plugin does not capture them; resolve defaults in the body instead).

export type SnapGuide = "left" | "centerX" | "right" | "top" | "centerY" | "bottom";

/** 'move' shifts x/y onto the guides; 'scale' keeps the center and resizes onto them. */
export type SnapMode = "move" | "scale";

export type SnapOptions = {
  /** Snap when a feature is closer than this many viewport px to a guide (strict). */
  threshold: number;
  /** Snap rotation when closer than this many degrees to a multiple of 45°. */
  rotationThreshold: number;
  mode: SnapMode;
};

export type SnapResult = { transform: Transform; activeGuides: SnapGuide[] };

export const DEFAULT_SNAP_OPTIONS: SnapOptions = {
  threshold: 8,
  rotationThreshold: 3,
  mode: "move",
};

export type NudgeAction =
  | "scaleUp"
  | "scaleDown"
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "rotateCw"
  | "rotateCcw"
  | "reset";

export type NudgeStep = "fine" | "coarse";

export type NudgeOptions = {
  /** Transform that `reset` goes back to. Defaults to IDENTITY_TRANSFORM. */
  base?: Transform;
};

/** move in px, scale as a fraction (0.01 = 1 %), rotate in degrees. */
export const NUDGE_STEPS: Record<NudgeStep, { move: number; scale: number; rotate: number }> = {
  fine: { move: 1, scale: 0.01, rotate: 1 },
  coarse: { move: 10, scale: 0.05, rotate: 5 },
};

/** Tolerance to decide that a feature lies on a guide after snapping. */
const EPSILON = 1e-6;

/** Radians (as gesture handlers report them) to degrees (as Transform stores them). */
export function radiansToDegrees(radians: number): number {
  "worklet";
  return (radians * 180) / Math.PI;
}

/** Maps any angle in degrees to (-180, 180]. */
export function normalizeRotation(degrees: number): number {
  "worklet";
  const turn = ((degrees % 360) + 360) % 360;
  return turn > 180 ? turn - 360 : turn;
}

/** |cos| or |sin| with float noise removed, so 90° gives exactly 0 and 1. */
function cleanTrig(value: number): number {
  "worklet";
  const abs = Math.abs(value);
  return abs < 1e-12 ? 0 : abs;
}

/** Half width and half height of the rotated image's bounding box, at scale 1. */
function unitHalfExtents(image: Size, rotation: number): { kx: number; ky: number } {
  "worklet";
  const radians = (rotation * Math.PI) / 180;
  const cos = cleanTrig(Math.cos(radians));
  const sin = cleanTrig(Math.sin(radians));
  return {
    kx: (image.width * cos + image.height * sin) / 2,
    ky: (image.width * sin + image.height * cos) / 2,
  };
}

function snapRotation(rotation: number, rotationThreshold: number): number {
  "worklet";
  const normalized = normalizeRotation(rotation);
  const target = Math.round(normalized / 45) * 45;
  return Math.abs(normalized - target) < rotationThreshold ? normalizeRotation(target) : normalized;
}

/** New center so the closest feature (start edge, center, end edge) lands on a guide, or NaN. */
function snapAxisMove(center: number, half: number, length: number, threshold: number): number {
  "worklet";
  const guides = [0, length / 2, length];
  const offsets = [-half, 0, half];
  let best = threshold;
  let next = Number.NaN;
  for (const guide of guides) {
    for (const offset of offsets) {
      const distance = Math.abs(center + offset - guide);
      if (distance < best) {
        best = distance;
        next = guide - offset;
      }
    }
  }
  return next;
}

/** Guides of one axis that have one of the given features lying on them. */
function guidesOnAxis(
  names: readonly [SnapGuide, SnapGuide, SnapGuide],
  length: number,
  features: number[],
  out: SnapGuide[],
): void {
  "worklet";
  const guides = [0, length / 2, length];
  for (let i = 0; i < 3; i++) {
    const guide = guides[i] ?? 0;
    const name = names[i];
    if (name && features.some((f) => Math.abs(f - guide) < EPSILON)) out.push(name);
  }
}

const X_GUIDES = ["left", "centerX", "right"] as const;
const Y_GUIDES = ["top", "centerY", "bottom"] as const;

/**
 * Scale that puts the closest edge of the bounding box on a guide, keeping the center, or NaN.
 * Candidates that would need a scale below MIN_SCALE are ignored.
 */
function snapScale(
  transform: Transform,
  kx: number,
  ky: number,
  viewport: Size,
  threshold: number,
): number {
  "worklet";
  const axes = [
    { center: transform.x, k: kx, length: viewport.width },
    { center: transform.y, k: ky, length: viewport.height },
  ];
  let best = threshold;
  let next = Number.NaN;
  for (const { center, k, length } of axes) {
    const half = k * transform.scale;
    for (const guide of [0, length / 2, length]) {
      const toStart = Math.abs(center - half - guide);
      const startScale = (center - guide) / k;
      if (toStart < best && startScale >= MIN_SCALE) {
        best = toStart;
        next = startScale;
      }
      const toEnd = Math.abs(center + half - guide);
      const endScale = (guide - center) / k;
      if (toEnd < best && endScale >= MIN_SCALE) {
        best = toEnd;
        next = endScale;
      }
    }
  }
  return next;
}

/**
 * Magnet: snaps rotation to multiples of 45° and the image's bounding box to the viewport
 * guides (both centers and the 4 edges), returning the guides to draw.
 *
 * Apply it to the raw gesture transform for display only. Never feed the result back as the
 * gesture's base, or the image gets stuck on the guide; store the snapped value on release.
 */
export function snapTransform(
  transform: Transform,
  imageSize: Size,
  viewport: Size,
  options: Partial<SnapOptions> = {},
): SnapResult {
  "worklet";
  const threshold = options.threshold ?? DEFAULT_SNAP_OPTIONS.threshold;
  const rotationThreshold = options.rotationThreshold ?? DEFAULT_SNAP_OPTIONS.rotationThreshold;
  const mode = options.mode ?? DEFAULT_SNAP_OPTIONS.mode;

  const rotation = snapRotation(transform.rotation, rotationThreshold);
  const { kx, ky } = unitHalfExtents(imageSize, rotation);
  const activeGuides: SnapGuide[] = [];

  if (mode === "scale") {
    const scale = snapScale(transform, kx, ky, viewport, threshold);
    if (Number.isNaN(scale)) {
      return { transform: { ...transform, rotation }, activeGuides };
    }
    const halfW = kx * scale;
    const halfH = ky * scale;
    guidesOnAxis(
      X_GUIDES,
      viewport.width,
      [transform.x - halfW, transform.x + halfW],
      activeGuides,
    );
    guidesOnAxis(
      Y_GUIDES,
      viewport.height,
      [transform.y - halfH, transform.y + halfH],
      activeGuides,
    );
    return { transform: { ...transform, rotation, scale }, activeGuides };
  }

  const halfW = kx * transform.scale;
  const halfH = ky * transform.scale;
  const snappedX = snapAxisMove(transform.x, halfW, viewport.width, threshold);
  const snappedY = snapAxisMove(transform.y, halfH, viewport.height, threshold);
  const x = Number.isNaN(snappedX) ? transform.x : snappedX;
  const y = Number.isNaN(snappedY) ? transform.y : snappedY;
  if (!Number.isNaN(snappedX)) {
    guidesOnAxis(X_GUIDES, viewport.width, [x - halfW, x, x + halfW], activeGuides);
  }
  if (!Number.isNaN(snappedY)) {
    guidesOnAxis(Y_GUIDES, viewport.height, [y - halfH, y, y + halfH], activeGuides);
  }
  return { transform: { ...transform, x, y, rotation }, activeGuides };
}

/**
 * Fine-adjust buttons: one step of `action` at the given speed (see NUDGE_STEPS).
 * Scale never goes below MIN_SCALE; rotation is normalized to (-180, 180].
 * `reset` restores x, y, scale and rotation from `options.base` (identity by default) and
 * keeps the current mirror.
 */
export function nudge(
  transform: Transform,
  action: NudgeAction,
  step: NudgeStep,
  options: NudgeOptions = {},
): Transform {
  "worklet";
  const { move, scale, rotate } = NUDGE_STEPS[step];
  let next: Transform;
  switch (action) {
    case "moveUp":
      next = { ...transform, y: transform.y - move };
      break;
    case "moveDown":
      next = { ...transform, y: transform.y + move };
      break;
    case "moveLeft":
      next = { ...transform, x: transform.x - move };
      break;
    case "moveRight":
      next = { ...transform, x: transform.x + move };
      break;
    case "scaleUp":
      next = { ...transform, scale: Math.max(MIN_SCALE, transform.scale * (1 + scale)) };
      break;
    case "scaleDown":
      // Never grows: a scale already below MIN_SCALE (e.g. fitTransform on a huge image) stays.
      next = {
        ...transform,
        scale:
          transform.scale < MIN_SCALE
            ? transform.scale
            : Math.max(MIN_SCALE, transform.scale / (1 + scale)),
      };
      break;
    case "rotateCw":
      next = { ...transform, rotation: transform.rotation + rotate };
      break;
    case "rotateCcw":
      next = { ...transform, rotation: transform.rotation - rotate };
      break;
    case "reset": {
      const base = options.base ?? IDENTITY_TRANSFORM;
      next = {
        x: base.x,
        y: base.y,
        scale: base.scale,
        rotation: base.rotation,
        flipX: transform.flipX,
        flipY: transform.flipY,
      };
      break;
    }
  }
  return { ...next, rotation: normalizeRotation(next.rotation) };
}

/** Centers the image in the viewport and scales it to fit entirely inside ("contain"). */
export function fitTransform(imageSize: Size, viewport: Size): Transform {
  "worklet";
  return {
    x: viewport.width / 2,
    y: viewport.height / 2,
    scale: Math.min(viewport.width / imageSize.width, viewport.height / imageSize.height),
    rotation: 0,
    flipX: false,
    flipY: false,
  };
}

/**
 * A transform saved for `savedViewport`, moved onto `viewport` (split screen, a foldable opened,
 * a rotated canvas): the image's center keeps its relative position and the scale follows the
 * short side, so the image covers the same share of the canvas. Rotation and flips are kept.
 * The same viewport, or an empty one on either side, returns the transform untouched.
 */
export function restoreTransform(
  transform: Transform,
  savedViewport: Size,
  viewport: Size,
): Transform {
  "worklet";
  if (
    savedViewport.width <= 0 ||
    savedViewport.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    (savedViewport.width === viewport.width && savedViewport.height === viewport.height)
  ) {
    return transform;
  }
  const shortRatio =
    Math.min(viewport.width, viewport.height) / Math.min(savedViewport.width, savedViewport.height);
  return {
    ...transform,
    x: (transform.x * viewport.width) / savedViewport.width,
    y: (transform.y * viewport.height) / savedViewport.height,
    scale: transform.scale * shortRatio,
  };
}

/** Rotation ignored below this many accumulated degrees, so a pinch that is not quite straight
 *  does not tilt the image. */
export const ROTATION_DEAD_ZONE_DEGREES = 4;

/**
 * Maps the gesture's raw accumulated rotation to the amount that should actually land on the
 * transform: 0 inside the dead zone, continuous at its edge (no jump once it is crossed).
 * Callers accumulate the gesture's raw per-frame change themselves and diff two calls to this
 * function to get the incremental amount to apply that frame (see `applyGesture`'s call sites).
 */
export function rotationDeadZone(accumulatedDegrees: number, zoneDegrees?: number): number {
  "worklet";
  // Default resolved in the body, not the signature: the worklets plugin only captures outer
  // variables the body uses, so a default parameter value is undefined on the UI thread.
  const zone = zoneDegrees ?? ROTATION_DEAD_ZONE_DEGREES;
  if (Math.abs(accumulatedDegrees) <= zone) return 0;
  return accumulatedDegrees - Math.sign(accumulatedDegrees) * zone;
}

/** One frame of a pan/pinch/rotation gesture, all relative to the previous frame (not the
 *  gesture's start): `changeX/Y` in viewport px, `scaleChange` as a ratio (1 = no change),
 *  `rotationChange` in degrees. `focalX/Y` is the pinch focal point or rotation anchor, in
 *  viewport px; irrelevant when `scaleChange` is 1 and `rotationChange` is 0 (pure pan). */
export type GestureStep = {
  changeX: number;
  changeY: number;
  scaleChange: number;
  rotationChange: number;
  focalX: number;
  focalY: number;
};

/**
 * Applies one frame of a simultaneous pan/pinch/rotation gesture to `transform`, scaling and
 * rotating around `focalX/Y` so the point under the fingers does not drift. Built to be called
 * once per gesture type per frame (pan with only `changeX/Y` set, pinch with only `scaleChange`,
 * rotation with only `rotationChange`), each call folding its own contribution into the same
 * transform — see apps/mobile's `useOverlayGestures`. Scale never drops below MIN_SCALE, same
 * floor as `nudge`/`fitTransform`; flips pass through untouched.
 *
 * Phase 3 magnet: display `snapTransform` on the result while the gesture runs; store the raw
 * (unsnapped) result as the base for the next frame, same contract as `snapTransform` today.
 */
export function applyGesture(transform: Transform, step: GestureStep): Transform {
  "worklet";
  const radians = (step.rotationChange * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = transform.x - step.focalX;
  const dy = transform.y - step.focalY;
  return {
    ...transform,
    x: step.focalX + step.changeX + step.scaleChange * (dx * cos - dy * sin),
    y: step.focalY + step.changeY + step.scaleChange * (dx * sin + dy * cos),
    scale: Math.max(MIN_SCALE, transform.scale * step.scaleChange),
    rotation: normalizeRotation(transform.rotation + step.rotationChange),
  };
}
