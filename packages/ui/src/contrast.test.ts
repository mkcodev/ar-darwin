import { describe, expect, it } from "vitest";
import { blendOver, contrastRatio, parseColor, relativeLuminance } from "./contrast";

describe("parseColor", () => {
  it("reads hex and rgba", () => {
    expect(parseColor("#FF5A1F")).toEqual({ r: 255, g: 90, b: 31, a: 1 });
    expect(parseColor("rgba(127, 211, 247, 0.3)")).toEqual({ r: 127, g: 211, b: 247, a: 0.3 });
    expect(parseColor("rgb(1,2,3)")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });
  it("rejects anything else", () => {
    expect(() => parseColor("red")).toThrow(/parseColor/);
    expect(() => parseColor("#FFF")).toThrow(/parseColor/);
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
  it("is symmetric", () => {
    expect(contrastRatio("#FF5A1F", "#161614")).toBeCloseTo(
      contrastRatio("#161614", "#FF5A1F"),
      10,
    );
  });
  it("matches a known reference (#767676 on white ≈ 4.54)", () => {
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });
  it("composites translucent foregrounds over the background", () => {
    expect(contrastRatio("rgba(0, 0, 0, 0)", "#FFFFFF")).toBeCloseTo(1, 5);
  });
});

describe("blendOver and luminance", () => {
  it("half black over white is mid grey", () => {
    const c = blendOver("rgba(0, 0, 0, 0.5)", "#FFFFFF");
    expect(c.r).toBeCloseTo(127.5, 5);
    expect(relativeLuminance(c)).toBeGreaterThan(0.2);
  });
});
