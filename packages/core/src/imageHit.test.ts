import { describe, expect, it } from "vitest";
import { pointInImage } from "./imageHit";

const IMAGE = { width: 200, height: 100 };
const AT = { x: 300, y: 400, scale: 1, rotation: 0 };

describe("pointInImage", () => {
  it("the centre and the inside are hits", () => {
    expect(pointInImage({ x: 300, y: 400 }, AT, IMAGE)).toBe(true);
    expect(pointInImage({ x: 210, y: 440 }, AT, IMAGE)).toBe(true);
  });

  it("the edge counts, past it does not", () => {
    expect(pointInImage({ x: 400, y: 400 }, AT, IMAGE)).toBe(true);
    expect(pointInImage({ x: 401, y: 400 }, AT, IMAGE)).toBe(false);
    expect(pointInImage({ x: 300, y: 450 }, AT, IMAGE)).toBe(true);
    expect(pointInImage({ x: 300, y: 451 }, AT, IMAGE)).toBe(false);
  });

  it("scale grows and shrinks the footprint about the centre", () => {
    const big = { ...AT, scale: 2 };
    expect(pointInImage({ x: 300 + 199, y: 400 }, big, IMAGE)).toBe(true);
    expect(pointInImage({ x: 300 + 201, y: 400 }, big, IMAGE)).toBe(false);
    const small = { ...AT, scale: 0.5 };
    expect(pointInImage({ x: 300 + 49, y: 400 }, small, IMAGE)).toBe(true);
    expect(pointInImage({ x: 300 + 51, y: 400 }, small, IMAGE)).toBe(false);
  });

  it("rotating 90° swaps the horizontal and vertical extents", () => {
    const turned = { ...AT, rotation: 90 };
    expect(pointInImage({ x: 300, y: 400 + 99 }, turned, IMAGE)).toBe(true);
    expect(pointInImage({ x: 300, y: 400 + 101 }, turned, IMAGE)).toBe(false);
    expect(pointInImage({ x: 300 + 51, y: 400 }, turned, IMAGE)).toBe(false);
  });

  it("follows a rotation that is not a multiple of 90°", () => {
    const turned = { ...AT, rotation: 45 };
    // Along the rotated long axis (down-right), 90 px from the centre is still inside (half is 100).
    const d = 90 / Math.SQRT2;
    expect(pointInImage({ x: 300 + d, y: 400 + d }, turned, IMAGE)).toBe(true);
    // The unrotated corner (100, 50) is no longer covered.
    expect(pointInImage({ x: 400, y: 450 }, turned, IMAGE)).toBe(false);
  });

  it("a rotation of 360° is the same as none", () => {
    expect(pointInImage({ x: 390, y: 440 }, { ...AT, rotation: 360 }, IMAGE)).toBe(true);
  });

  it("nothing is a hit while the image has no size or the scale is not positive", () => {
    expect(pointInImage({ x: 300, y: 400 }, AT, { width: 0, height: 0 })).toBe(false);
    expect(pointInImage({ x: 300, y: 400 }, { ...AT, scale: 0 }, IMAGE)).toBe(false);
    expect(pointInImage({ x: 300, y: 400 }, { ...AT, scale: Number.NaN }, IMAGE)).toBe(false);
  });
});
