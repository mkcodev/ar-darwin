import type { Size, Transform } from "./models";

// Worklets (see transform.ts): plain math on plain objects, safe to call on the UI thread. The
// fine-adjust pad's hold-to-repeat runs there frame by frame, so distances are functions of the
// time held and never of the frame rate.

export type NudgeDirection = "up" | "down" | "left" | "right";

/** Hold-to-repeat curve of the fine-adjust pad. Distances are px of the canvas, as `Transform`. */
export type NudgeHoldConfig = {
  /** One short tap: how far it moves. */
  tapPx: number;
  /** Held this long before the repetition starts. */
  delayMs: number;
  /** Speed (px/s) at the moment the repetition starts: still a precise creep. */
  startSpeed: number;
  /** Speed (px/s) once the ramp is over. */
  maxSpeed: number;
  /** Time from `startSpeed` to `maxSpeed`, with a quadratic ease-in (slow first, then faster). */
  rampMs: number;
};

export const NUDGE_HOLD: NudgeHoldConfig = {
  tapPx: 1,
  // Same pause as the steppers' hold-to-repeat (`holdRepeat.delayMs` in packages/ui).
  delayMs: 380,
  // About what a 1 px step every 70 ms gave before the acceleration existed.
  startSpeed: 20,
  // Crosses a ~400 px wide canvas in one second.
  maxSpeed: 400,
  rampMs: 1500,
};

/** Speed in px/s after the image has been held for `heldMs` (0 until the repetition starts). */
export function holdSpeed(heldMs: number, config?: NudgeHoldConfig): number {
  "worklet";
  const c = config ?? NUDGE_HOLD;
  const t = heldMs - c.delayMs;
  if (t < 0) return 0;
  if (t >= c.rampMs) return c.maxSpeed;
  const k = t / c.rampMs;
  return c.startSpeed + (c.maxSpeed - c.startSpeed) * k * k;
}

/**
 * Distance in px travelled by the repetition after `heldMs` of holding, not counting the tap.
 * It is the integral of `holdSpeed`, so it is continuous and increasing. A frame moves by
 * `holdDistance(now) - holdDistance(previous)`: same result at 60 and 120 Hz, and a dropped frame
 * catches up instead of slowing the image down.
 */
export function holdDistance(heldMs: number, config?: NudgeHoldConfig): number {
  "worklet";
  const c = config ?? NUDGE_HOLD;
  const t = heldMs - c.delayMs;
  if (t <= 0) return 0;
  const rampS = c.rampMs / 1000;
  const spread = c.maxSpeed - c.startSpeed;
  const rampedS = Math.min(t, c.rampMs) / 1000;
  const ramp =
    c.startSpeed * rampedS + (spread * rampedS * rampedS * rampedS) / (3 * rampS * rampS);
  const cruiseS = Math.max(0, t - c.rampMs) / 1000;
  return ramp + c.maxSpeed * cruiseS;
}

/**
 * `value + delta` kept inside [min, max] in the direction of travel. A value that already lies
 * outside (the image was dragged there) may still move back in, and never jumps to the range:
 * it only stops moving further out. `hitLimit` is true when the result sits on, or still beyond,
 * the limit it is heading to, so a caller can fire one haptic and stop repeating.
 */
export function moveWithin(
  value: number,
  delta: number,
  min: number,
  max: number,
): { next: number; hitLimit: boolean } {
  "worklet";
  if (delta > 0) {
    const next = value >= max ? value : Math.min(value + delta, max);
    return { next, hitLimit: next >= max };
  }
  if (delta < 0) {
    const next = value <= min ? value : Math.max(value + delta, min);
    return { next, hitLimit: next <= min };
  }
  return { next: value, hitLimit: false };
}

/**
 * Moves the image `distance` px along a screen axis (up is -y). x/y are the image's center in
 * canvas px, so this is the same on screen whatever the rotation, scale or mirror. The center
 * stays inside the canvas: the image can never be pushed out of reach. Scale, rotation and mirror
 * pass through untouched.
 */
export function nudgeMove(
  transform: Transform,
  direction: NudgeDirection,
  distance: number,
  viewport: Size,
): { transform: Transform; hitLimit: boolean } {
  "worklet";
  if (direction === "left" || direction === "right") {
    const delta = direction === "right" ? distance : -distance;
    const { next, hitLimit } = moveWithin(transform.x, delta, 0, viewport.width);
    return { transform: { ...transform, x: next }, hitLimit };
  }
  const delta = direction === "down" ? distance : -distance;
  const { next, hitLimit } = moveWithin(transform.y, delta, 0, viewport.height);
  return { transform: { ...transform, y: next }, hitLimit };
}
