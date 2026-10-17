import { describe, expect, it } from "vitest";
import {
  adjustmentColorMatrix,
  ImageAdjustmentsSchema,
  isNeutralAdjustments,
  NEUTRAL_ADJUSTMENTS,
} from "./imageAdjustments";

/** Applies the matrix to one grey level v (0..1) on the red channel, alpha 1. */
function applyRed(matrix: number[], v: number): number {
  return (matrix[0] ?? 0) * v + (matrix[3] ?? 0) + (matrix[4] ?? 0);
}

const IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

describe("adjustmentColorMatrix", () => {
  it("is the identity when neutral", () => {
    const m = adjustmentColorMatrix(0, 0, 0);
    expect(m).toHaveLength(20);
    m.forEach((value, i) => {
      expect(value).toBeCloseTo(IDENTITY[i] ?? Number.NaN);
    });
  });

  it("inverts fully at 1 and halfway lands on mid grey", () => {
    const full = adjustmentColorMatrix(0, 0, 1);
    expect(applyRed(full, 0)).toBeCloseTo(1);
    expect(applyRed(full, 1)).toBeCloseTo(0);
    expect(applyRed(full, 0.25)).toBeCloseTo(0.75);
    const half = adjustmentColorMatrix(0, 0, 0.5);
    expect(applyRed(half, 0)).toBeCloseTo(0.5);
    expect(applyRed(half, 1)).toBeCloseTo(0.5);
  });

  it("pivots contrast on mid grey", () => {
    for (const contrast of [-1, -0.5, 0.5, 1]) {
      expect(applyRed(adjustmentColorMatrix(0, contrast, 0), 0.5)).toBeCloseTo(0.5);
    }
    expect(applyRed(adjustmentColorMatrix(0, 1, 0), 0.75)).toBeCloseTo(1);
    expect(applyRed(adjustmentColorMatrix(0, -1, 0), 0.9)).toBeCloseTo(0.5);
  });

  it("adds brightness as an offset of up to ±0.5", () => {
    expect(applyRed(adjustmentColorMatrix(1, 0, 0), 0.2)).toBeCloseTo(0.7);
    expect(applyRed(adjustmentColorMatrix(-0.5, 0, 0), 0.6)).toBeCloseTo(0.35);
  });

  it("keeps alpha and does not mix channels", () => {
    const m = adjustmentColorMatrix(0.3, 0.4, 0.2);
    expect(m.slice(15)).toEqual([0, 0, 0, 1, 0]);
    expect([m[1], m[2], m[5], m[7], m[10], m[11]]).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("clamps inputs out of range", () => {
    expect(adjustmentColorMatrix(5, -3, 2)).toEqual(adjustmentColorMatrix(1, -1, 1));
  });
});

describe("isNeutralAdjustments", () => {
  it("is true only with every field at its neutral value", () => {
    expect(isNeutralAdjustments(NEUTRAL_ADJUSTMENTS)).toBe(true);
    expect(isNeutralAdjustments({ ...NEUTRAL_ADJUSTMENTS, brightness: 0.01 })).toBe(false);
    expect(isNeutralAdjustments({ ...NEUTRAL_ADJUSTMENTS, contrast: -0.2 })).toBe(false);
    expect(isNeutralAdjustments({ ...NEUTRAL_ADJUSTMENTS, invert: true })).toBe(false);
  });
});

describe("ImageAdjustmentsSchema", () => {
  it("keeps a valid value as it is", () => {
    const value = { brightness: -0.4, contrast: 0.25, invert: true };
    expect(ImageAdjustmentsSchema.parse(value)).toEqual(value);
  });

  it("fills missing fields with neutral values and drops unknown keys", () => {
    expect(ImageAdjustmentsSchema.parse({ contrast: 0.5, sharpness: 2 })).toEqual({
      brightness: 0,
      contrast: 0.5,
      invert: false,
    });
    expect(ImageAdjustmentsSchema.parse({})).toEqual(NEUTRAL_ADJUSTMENTS);
  });

  it("clamps out-of-range levels", () => {
    expect(ImageAdjustmentsSchema.parse({ brightness: 3, contrast: -9, invert: false })).toEqual({
      brightness: 1,
      contrast: -1,
      invert: false,
    });
  });

  it.each([
    ["strings", { brightness: "0.5", contrast: null, invert: "yes" }],
    ["NaN and infinity", { brightness: Number.NaN, contrast: Number.POSITIVE_INFINITY, invert: 1 }],
  ])("turns %s into neutral values", (_, value) => {
    expect(ImageAdjustmentsSchema.parse(value)).toEqual(NEUTRAL_ADJUSTMENTS);
  });

  it("rejects a value that is not an object", () => {
    expect(ImageAdjustmentsSchema.safeParse(42).success).toBe(false);
    expect(ImageAdjustmentsSchema.safeParse(null).success).toBe(false);
  });
});
