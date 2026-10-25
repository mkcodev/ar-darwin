import { describe, expect, it } from "vitest";
import type { Placement } from "./models";
import { samePlacement } from "./placement";

const placement = (overrides: Partial<Placement["transform"]> = {}, width = 400): Placement => ({
  transform: { x: 200, y: 400, scale: 0.5, rotation: 0, flipX: false, flipY: false, ...overrides },
  viewport: { width, height: 800 },
});

describe("samePlacement", () => {
  it("is true for the same placement", () => {
    expect(samePlacement(placement(), placement())).toBe(true);
  });

  it("tolerates sub-pixel, sub-percent and sub-degree differences", () => {
    expect(samePlacement(placement(), placement({ x: 200.4, y: 399.6 }))).toBe(true);
    expect(samePlacement(placement(), placement({ scale: 0.5004 }))).toBe(true);
    expect(samePlacement(placement(), placement({ rotation: 0.09 }))).toBe(true);
  });

  it("is false past the tolerance on any of them", () => {
    expect(samePlacement(placement(), placement({ x: 201 }))).toBe(false);
    expect(samePlacement(placement(), placement({ y: 398 }))).toBe(false);
    expect(samePlacement(placement(), placement({ scale: 0.51 }))).toBe(false);
    expect(samePlacement(placement(), placement({ rotation: 1 }))).toBe(false);
  });

  it("ignores the mirrors", () => {
    expect(samePlacement(placement(), placement({ flipX: true, flipY: true }))).toBe(true);
  });

  it("compares across canvases by moving one onto the other", () => {
    // A canvas twice as big on both sides: the same relative place has twice the px and scale.
    const big: Placement = {
      transform: { x: 400, y: 800, scale: 1, rotation: 0, flipX: false, flipY: false },
      viewport: { width: 800, height: 1600 },
    };
    expect(samePlacement(placement(), big)).toBe(true);
    expect(samePlacement(big, placement())).toBe(true);
    expect(samePlacement(placement({ x: 210 }), big)).toBe(false);
  });

  it("treats angles either side of ±180° as close", () => {
    expect(samePlacement(placement({ rotation: 179.97 }), placement({ rotation: -179.97 }))).toBe(
      true,
    );
  });
});
