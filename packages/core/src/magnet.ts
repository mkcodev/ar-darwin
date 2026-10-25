import type { Size, Transform } from "./models";
import { normalizeRotation } from "./transform";

// Worklets (see transform.ts): plain math on plain objects, safe to call on the UI thread. The
// camera runs `magnetize` on every frame of a gesture, so there is no allocation beyond the result.

/** What the image is currently held on. Feed the last one back in: that is the hysteresis. */
export type MagnetLock = {
  /** The image's center sits on the canvas's vertical axis (x = width / 2). */
  axisX: boolean;
  /** The image's center sits on the canvas's horizontal axis (y = height / 2). */
  axisY: boolean;
  /** The rotation sits on a multiple of 90°. */
  rotation: boolean;
  /** The whole transform sits on the pinned position; the axes and the rotation are then free. */
  pin: boolean;
};

export const NO_MAGNET_LOCK: MagnetLock = {
  axisX: false,
  axisY: false,
  rotation: false,
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
  /** Degrees from a multiple of 90°. */
  rotationEnter: number;
  rotationExit: number;
  /** Canvas px between the image's center and the pin's. */
  pinEnter: number;
  pinExit: number;
  /** Relative scale difference to the pin's (0.03 = 3 %). */
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
  pinEnter: 8,
  pinExit: 14,
  pinScaleEnter: 0.02,
  pinScaleExit: 0.04,
  pinRotationEnter: 2,
  pinRotationExit: 4,
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

/**
 * The magnet: given the raw transform (the one the fingers produced), returns the magnetized one.
 *
 * Priority: the pinned position wins when position, scale and rotation are all inside its radius;
 * otherwise the canvas's two axes and the nearest multiple of 90° each snap on their own. Mirror
 * flags pass through untouched and do not change what snaps (the matrix rotates before mirroring).
 *
 * Paint and store the result, but never feed it back as the gesture's base: the raw transform
 * keeps accumulating, or the image would get stuck on the guide. `prev` is the `lock` of the
 * previous frame (`NO_MAGNET_LOCK` at the start of a gesture). `pin` is the pinned transform
 * already restored onto this canvas, or null.
 */
export function magnetize(
  raw: Transform,
  prev: MagnetLock,
  viewport: Size,
  pin: Transform | null,
  options?: Partial<MagnetOptions>,
): MagnetResult {
  "worklet";
  const o = { ...DEFAULT_MAGNET_OPTIONS, ...options };

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
        lock: { axisX: false, axisY: false, rotation: false, pin: true },
      };
    }
  }

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const axisX = Math.abs(raw.x - centerX) < (prev.axisX ? o.exit : o.enter);
  const axisY = Math.abs(raw.y - centerY) < (prev.axisY ? o.exit : o.enter);

  const target = Math.round(raw.rotation / 90) * 90;
  const rotation =
    angleBetween(raw.rotation, target) < (prev.rotation ? o.rotationExit : o.rotationEnter);

  return {
    transform: {
      ...raw,
      x: axisX ? centerX : raw.x,
      y: axisY ? centerY : raw.y,
      rotation: rotation ? normalizeRotation(target) : raw.rotation,
    },
    lock: { axisX, axisY, rotation, pin: false },
  };
}

/** True when something just got grabbed (a flag went from off to on): the moment to vibrate. */
export function magnetEngaged(prev: MagnetLock, next: MagnetLock): boolean {
  "worklet";
  return (
    (next.axisX && !prev.axisX) ||
    (next.axisY && !prev.axisY) ||
    (next.rotation && !prev.rotation) ||
    (next.pin && !prev.pin)
  );
}
