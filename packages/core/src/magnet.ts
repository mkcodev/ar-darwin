import { MIN_SCALE, type Size, type Transform } from "./models";
import { normalizeRotation } from "./transform";

// Worklets (see transform.ts): plain math on plain objects, safe to call on the UI thread. The
// camera runs `magnetize` on every frame of a gesture, so there is no allocation beyond the result.

/** What the image is currently held on. Feed the last one back in: that is the hysteresis. */
export type MagnetLock = {
  /** The image's center sits on the canvas's vertical axis (x = width / 2). */
  axisX: boolean;
  /** The image's center sits on the canvas's horizontal axis (y = height / 2). */
  axisY: boolean;
  /** The rotation sits on a multiple of 90°, or on the angle the gesture started with. */
  rotation: boolean;
  /** The image spans the canvas's width: its left and right edges sit on the canvas's sides. */
  width: boolean;
  /** The whole transform sits on the pinned position; the other targets are then free. */
  pin: boolean;
};

export const NO_MAGNET_LOCK: MagnetLock = {
  axisX: false,
  axisY: false,
  rotation: false,
  width: false,
  pin: false,
};

/**
 * Each target has an `enter` threshold (it grabs the image when closer than this) and a larger
 * `exit` one (it lets go only when farther than this), so a finger resting at the edge does not
 * make the image flicker in and out.
 */
export type MagnetOptions = {
  /** Canvas px between the image's center and an axis. */
  enter: number;
  exit: number;
  /** Degrees from a multiple of 90° (or from the angle the gesture started with). */
  rotationEnter: number;
  rotationExit: number;
  /** Canvas px between each side edge of the image and the matching side of the canvas. */
  fitEnter: number;
  fitExit: number;
  /** Canvas px between the image's center and the pin's. */
  pinEnter: number;
  pinExit: number;
  /** Relative scale difference to the pin's (0.02 = 2 %). */
  pinScaleEnter: number;
  pinScaleExit: number;
  /** Degrees from the pin's rotation. */
  pinRotationEnter: number;
  pinRotationExit: number;
};

/**
 * The thresholds in one place, easy to tune by feel. Each pair is (grab, let go): let go is the
 * larger one. The pin's scale and rotation margins follow its position margin and the rotation's.
 */
export const DEFAULT_MAGNET_OPTIONS: MagnetOptions = {
  enter: 5,
  exit: 9,
  rotationEnter: 2,
  rotationExit: 4,
  fitEnter: 12,
  fitExit: 20,
  pinEnter: 8,
  pinExit: 14,
  pinScaleEnter: 0.02,
  pinScaleExit: 0.04,
  pinRotationEnter: 2,
  pinRotationExit: 4,
};

/** What `magnetize` needs to know besides the transform itself. */
export type MagnetContext = {
  viewport: Size;
  /** The image's natural size, to measure its box on the canvas. */
  image: Size;
  /** The pinned transform already restored onto this canvas, or null. */
  pin: Transform | null;
  /**
   * The raw transform is being scaled (a pinch). Only then can the width fit be grabbed; once
   * grabbed it is held by any gesture until the image really leaves it.
   */
  scaling: boolean;
  /** Rotation the gesture started with: a target to come back to. Null = none. */
  origin: number | null;
};

export type MagnetResult = {
  /** What to paint, and to store when the finger lifts. */
  transform: Transform;
  lock: MagnetLock;
};

/** Smallest angle between two rotations in degrees, 0 to 180, for any input (negative, > 360°). */
function angleBetween(a: number, b: number): number {
  "worklet";
  return Math.abs(normalizeRotation(a - b));
}

/** |cos| or |sin| with float noise removed, so right angles give exactly 0 and 1. */
function cleanTrig(value: number): number {
  "worklet";
  const abs = Math.abs(value);
  return abs < 1e-12 ? 0 : abs;
}

/**
 * The magnet: given the raw transform (the one the fingers produced), returns the magnetized one.
 *
 * Priority: the pinned position wins when position, scale and rotation are all inside its radius;
 * otherwise the targets snap each on their own:
 * - rotation, to the nearest multiple of 90° or to `context.origin`, the angle the gesture started
 *   with (so turning away and coming back finds the way it was);
 * - the width: scale and x together, so the image's left and right edges land on the canvas's sides;
 * - the canvas's two axes, with the image's center.
 * Mirror flags pass through untouched and do not change what snaps (the matrix rotates before
 * mirroring).
 *
 * Paint and store the result, but never feed it back as the gesture's base: the raw transform
 * keeps accumulating, or the image would get stuck on the guide. `prev` is the `lock` of the
 * previous frame (`NO_MAGNET_LOCK` at the start of a gesture).
 */
export function magnetize(
  raw: Transform,
  prev: MagnetLock,
  context: MagnetContext,
  options?: Partial<MagnetOptions>,
): MagnetResult {
  "worklet";
  const o = { ...DEFAULT_MAGNET_OPTIONS, ...options };
  const { viewport, image, pin, scaling, origin } = context;

  if (pin !== null) {
    const distance = Math.hypot(raw.x - pin.x, raw.y - pin.y);
    const scaleOff = Math.abs(raw.scale / pin.scale - 1);
    const turnOff = angleBetween(raw.rotation, pin.rotation);
    const held = prev.pin;
    if (
      distance < (held ? o.pinExit : o.pinEnter) &&
      scaleOff < (held ? o.pinScaleExit : o.pinScaleEnter) &&
      turnOff < (held ? o.pinRotationExit : o.pinRotationEnter)
    ) {
      return {
        transform: {
          ...raw,
          x: pin.x,
          y: pin.y,
          scale: pin.scale,
          rotation: normalizeRotation(pin.rotation),
        },
        lock: { ...NO_MAGNET_LOCK, pin: true },
      };
    }
  }

  // Rotation: the nearer of the right angle and the angle the gesture began with.
  const right = Math.round(raw.rotation / 90) * 90;
  const target =
    origin !== null && angleBetween(raw.rotation, origin) < angleBetween(raw.rotation, right)
      ? origin
      : right;
  const turned =
    angleBetween(raw.rotation, target) < (prev.rotation ? o.rotationExit : o.rotationEnter);
  const rotation = turned ? normalizeRotation(target) : raw.rotation;

  // Width: both side edges of the rotated box close to the canvas's sides.
  const radians = (rotation * Math.PI) / 180;
  const unitWidth =
    image.width * cleanTrig(Math.cos(radians)) + image.height * cleanTrig(Math.sin(radians));
  const fitScale = unitWidth > 0 ? viewport.width / unitWidth : 0;
  let scale = raw.scale;
  let fitted = false;
  if (fitScale >= MIN_SCALE) {
    const half = (unitWidth * raw.scale) / 2;
    const limit = prev.width ? o.fitExit : scaling ? o.fitEnter : 0;
    fitted = Math.abs(raw.x - half) < limit && Math.abs(raw.x + half - viewport.width) < limit;
    if (fitted) scale = fitScale;
  }

  // Axes: the image's center on the canvas's middle lines.
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const axisX = Math.abs(raw.x - centerX) < (prev.axisX ? o.exit : o.enter);
  const axisY = Math.abs(raw.y - centerY) < (prev.axisY ? o.exit : o.enter);

  return {
    transform: {
      ...raw,
      x: fitted || axisX ? centerX : raw.x,
      y: axisY ? centerY : raw.y,
      scale,
      rotation,
    },
    lock: { axisX, axisY, rotation: turned, width: fitted, pin: false },
  };
}

/** True when something just got grabbed (a flag went from off to on): the moment to vibrate. */
export function magnetEngaged(prev: MagnetLock, next: MagnetLock): boolean {
  "worklet";
  return (
    (next.axisX && !prev.axisX) ||
    (next.axisY && !prev.axisY) ||
    (next.rotation && !prev.rotation) ||
    (next.width && !prev.width) ||
    (next.pin && !prev.pin)
  );
}
