import { describe, expect, it } from "vitest";
import {
  blendOver,
  contrastRatio,
  deltaEOk,
  parseColor,
  relativeLuminance,
  toOklab,
} from "./contrast";

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

describe("OKLab", () => {
  it("matches the reference white and black", () => {
    const [l, a, b] = toOklab("#FFFFFF");
    expect(l).toBeCloseTo(1, 3);
    expect(a).toBeCloseTo(0, 3);
    expect(b).toBeCloseTo(0, 3);
    expect(toOklab("#000000")[0]).toBeCloseTo(0, 5);
  });
  it("ΔE is 0 for the same colour, symmetric and 1 from black to white", () => {
    expect(deltaEOk("#FF5A1F", "#FF5A1F")).toBe(0);
    expect(deltaEOk("#FF5A1F", "#7FD3F7")).toBeCloseTo(deltaEOk("#7FD3F7", "#FF5A1F"), 10);
    expect(deltaEOk("#000000", "#FFFFFF")).toBeCloseTo(1, 3);
  });
});

describe("blendOver and luminance", () => {
  it("half black over white is mid grey", () => {
    const c = blendOver("rgba(0, 0, 0, 0.5)", "#FFFFFF");
    expect(c.r).toBeCloseTo(127.5, 5);
    expect(relativeLuminance(c)).toBeGreaterThan(0.2);
  });
});
