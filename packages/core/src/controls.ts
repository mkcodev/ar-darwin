// Math behind apps/mobile's base components (slider, stepper, bottom sheet, ink press, floating
// pill, icons drawing themselves). Gesture callbacks and derived values call these on
// Reanimated's UI thread, so they follow transform.ts's worklet rules: "worklet" directive,
// plain objects, no throws, no outer constants in default parameters.

export function clamp(value: number, min: number, max: number): number {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

/**
 * Nearest multiple of `step` counted from `min`. Rounded to 1e-9 so 0.1 + 0.2 lands on 0.3.
 * A non-positive step leaves the value as it is.
 */
export function snapToStep(value: number, min: number, step: number): number {
  "worklet";
  if (!(step > 0)) return value;
  const snapped = min + Math.round((value - min) / step) * step;
  return Math.round(snapped * 1e9) / 1e9;
}

/** Slider: a touch at `x` px along a track `width` px wide, as a value on the step grid. */
export function valueFromTrack(
  x: number,
  width: number,
  min: number,
  max: number,
  step: number,
): number {
  "worklet";
  if (!(width > 0)) return min;
  const raw = min + clamp(x / width, 0, 1) * (max - min);
  return clamp(snapToStep(raw, min, step), min, max);
}

/** Slider: where a value sits along the track, from 0 to 1. */
export function fractionOfRange(value: number, min: number, max: number): number {
  "worklet";
  if (!(max > min)) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

export type StepResult = {
  next: number;
  /** The step could not move because the value already sits on that limit. */
  hitLimit: boolean;
};

/** Stepper: one press of − or +, kept within [min, max]. */
export function stepValue(value: number, delta: number, min: number, max: number): StepResult {
  "worklet";
  const next = clamp(value + delta, min, max);
  return { next, hitLimit: next === value };
}

/**
 * Bottom sheet released after a drag of `offsetY` px (down is positive) at `velocityY` px/s:
 * it closes past `threshold` (a fraction of its height) or faster than `closeVelocity`.
 */
export function sheetRelease(
  offsetY: number,
  velocityY: number,
  height: number,
  threshold: number,
  closeVelocity: number,
): "close" | "settle" {
  "worklet";
  if (offsetY > height * threshold || velocityY > closeVelocity) return "close";
  return "settle";
}

/** Scrim opacity while the sheet sits `y` px below its open position: 1 open, 0 off-screen. */
export function sheetScrimOpacity(y: number, height: number): number {
  "worklet";
  if (!(height > 0)) return 1;
  return clamp(1 - y / height, 0, 1);
}

/** Ink press: a circle this wide covers the button from any touch point inside it. */
export function inkDiameter(width: number, height: number): number {
  "worklet";
  return Math.hypot(width, height) * 2;
}

export type RetreatEdge = "up" | "down" | "left" | "right";

/** Floating pill: where it moves when it retreats `distance` px towards an edge. */
export function retreatOffset(towards: RetreatEdge, distance: number): { x: number; y: number } {
  "worklet";
  if (towards === "up") return { x: 0, y: -distance };
  if (towards === "down") return { x: 0, y: distance };
  if (towards === "left") return { x: -distance, y: 0 };
  return { x: distance, y: 0 };
}

/**
 * Progress (0–1, linear) of item `index` in a sequence where each item lasts `durationMs` and
 * starts `staggerMs` after the previous one, `elapsedMs` after the first started. Icons drawing
 * themselves use it per stroke; the caller applies the easing.
 */
export function staggeredProgress(
  elapsedMs: number,
  index: number,
  staggerMs: number,
  durationMs: number,
): number {
  "worklet";
  if (!(durationMs > 0)) return elapsedMs >= index * staggerMs ? 1 : 0;
  return clamp((elapsedMs - index * staggerMs) / durationMs, 0, 1);
}

/** Total length of a staggered sequence of `count` items. */
export function staggeredTotalMs(count: number, staggerMs: number, durationMs: number): number {
  "worklet";
  return Math.max(0, count - 1) * staggerMs + durationMs;
}
