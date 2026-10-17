import * as z from "zod";
import { clamp } from "./controls";

// Brightness, contrast and invert of the overlay image, stored per project. The functions run on
// Reanimated's UI thread (the camera derives the colour matrix every frame a slider moves), so
// they follow transform.ts's worklet rules: "worklet" directive, plain math, no outer constants.

export type ImageAdjustments = {
  /** -1 (darker) .. 1 (lighter). 0 = untouched. */
  brightness: number;
  /** -1 (flat grey) .. 1 (twice the contrast). 0 = untouched. */
  contrast: number;
  /** Negative of the image. */
  invert: boolean;
};

export const NEUTRAL_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  invert: false,
};

/** A number in [-1, 1]: out of range is clamped, anything else (NaN, ±∞, not a number) is 0. */
const AdjustmentLevelSchema = z
  .number()
  .catch(0)
  .transform((value) => clamp(value, -1, 1));

/**
 * Lenient on purpose: unknown keys are dropped and each bad or missing field falls back to its
 * neutral value, so a stored value never fails to load and adding a new adjustment later needs
 * no migration.
 */
export const ImageAdjustmentsSchema = z.object({
  brightness: AdjustmentLevelSchema,
  contrast: AdjustmentLevelSchema,
  invert: z.boolean().catch(false),
});

export function isNeutralAdjustments(adjustments: ImageAdjustments): boolean {
  "worklet";
  return adjustments.brightness === 0 && adjustments.contrast === 0 && !adjustments.invert;
}

/**
 * 4 × 5 row-major colour matrix (20 numbers) for Skia's `<ColorMatrix>`. `invert` goes from 0 to 1
 * so it can be animated. Per RGB channel, with v in 0..1:
 * `v' = c · (s · v + o − 0.5) + 0.5 + b`, where s = 1 − 2 · invert and o = invert (the negative),
 * c = 1 + contrast (pivots on mid grey) and b = brightness · 0.5. Alpha is left as it is.
 */
export function adjustmentColorMatrix(
  brightness: number,
  contrast: number,
  invert: number,
): number[] {
  "worklet";
  const brightnessRange = 0.5;
  const c = 1 + clamp(contrast, -1, 1);
  const b = clamp(brightness, -1, 1) * brightnessRange;
  const i = clamp(invert, 0, 1);
  const gain = c * (1 - 2 * i);
  const offset = c * (i - 0.5) + 0.5 + b;
  // biome-ignore format: one matrix row per line
  return [
    gain, 0, 0, 0, offset,
    0, gain, 0, 0, offset,
    0, 0, gain, 0, offset,
    0, 0, 0, 1, 0,
  ];
}
