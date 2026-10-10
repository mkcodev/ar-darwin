import { describe, expect, it } from "vitest";
import {
  clamp,
  fractionOfRange,
  inkDiameter,
  retreatOffset,
  sheetRelease,
  sheetScrimOpacity,
  snapToStep,
  staggeredProgress,
  staggeredTotalMs,
  stepValue,
  valueFromTrack,
} from "./controls";

describe("clamp", () => {
  it("keeps values inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("snapToStep", () => {
  it("rounds to the nearest step from min", () => {
    expect(snapToStep(7, 0, 5)).toBe(5);
    expect(snapToStep(8, 0, 5)).toBe(10);
    expect(snapToStep(4, 1, 2)).toBe(5);
  });

  it("does not leak floating point noise", () => {
    expect(snapToStep(0.30000000000000004, 0, 0.05)).toBe(0.3);
    expect(snapToStep(0.62, 0, 0.05)).toBe(0.6);
  });

  it("leaves the value alone with a non-positive step", () => {
    expect(snapToStep(0.37, 0, 0)).toBe(0.37);
  });
});

describe("valueFromTrack", () => {
  it("maps the touch onto the range and the step grid", () => {
    expect(valueFromTrack(50, 200, 0, 100, 1)).toBe(25);
    expect(valueFromTrack(51, 200, 0, 100, 5)).toBe(25);
    expect(valueFromTrack(100, 200, 1, 10, 1)).toBe(6);
  });

  it("clamps touches outside the track", () => {
    expect(valueFromTrack(-30, 200, 0, 100, 1)).toBe(0);
    expect(valueFromTrack(260, 200, 0, 100, 1)).toBe(100);
  });

  it("returns min before the track is measured", () => {
    expect(valueFromTrack(40, 0, 3, 9, 1)).toBe(3);
  });
});

describe("fractionOfRange", () => {
  it("is the position along the track", () => {
    expect(fractionOfRange(25, 0, 100)).toBe(0.25);
    expect(fractionOfRange(150, 0, 100)).toBe(1);
    expect(fractionOfRange(5, 5, 5)).toBe(0);
  });
});

describe("stepValue", () => {
  it("steps within the limits", () => {
    expect(stepValue(2, 1, 1, 10)).toEqual({ next: 3, hitLimit: false });
    expect(stepValue(2, -1, 1, 10)).toEqual({ next: 1, hitLimit: false });
  });

  it("reports a limit when the value cannot move", () => {
    expect(stepValue(10, 1, 1, 10)).toEqual({ next: 10, hitLimit: true });
    expect(stepValue(1, -1, 1, 10)).toEqual({ next: 1, hitLimit: true });
  });
});

describe("sheetRelease", () => {
  const height = 400;

  it("closes past the distance threshold", () => {
    expect(sheetRelease(140, 0, height, 0.33, 900)).toBe("close");
    expect(sheetRelease(120, 0, height, 0.33, 900)).toBe("settle");
  });

  it("closes on a fast flick even when short", () => {
    expect(sheetRelease(20, 1200, height, 0.33, 900)).toBe("close");
  });

  it("settles when flicked upwards", () => {
    expect(sheetRelease(-10, -1500, height, 0.33, 900)).toBe("settle");
  });
});

describe("sheetScrimOpacity", () => {
  it("fades in proportion to how open the sheet is", () => {
    expect(sheetScrimOpacity(0, 400)).toBe(1);
    expect(sheetScrimOpacity(100, 400)).toBe(0.75);
    expect(sheetScrimOpacity(500, 400)).toBe(0);
    expect(sheetScrimOpacity(-20, 400)).toBe(1);
  });

  it("is fully visible before the sheet is measured", () => {
    expect(sheetScrimOpacity(0, 0)).toBe(1);
  });
});

describe("inkDiameter", () => {
  it("covers the button from its farthest corner", () => {
    expect(inkDiameter(30, 40)).toBe(100);
  });
});

describe("retreatOffset", () => {
  it("moves towards the edge", () => {
    expect(retreatOffset("up", 8)).toEqual({ x: 0, y: -8 });
    expect(retreatOffset("down", 8)).toEqual({ x: 0, y: 8 });
    expect(retreatOffset("left", 8)).toEqual({ x: -8, y: 0 });
    expect(retreatOffset("right", 8)).toEqual({ x: 8, y: 0 });
  });
});

describe("staggeredProgress", () => {
  it("starts each item after its stagger", () => {
    expect(staggeredProgress(0, 0, 60, 300)).toBe(0);
    expect(staggeredProgress(150, 0, 60, 300)).toBe(0.5);
    expect(staggeredProgress(60, 1, 60, 300)).toBe(0);
    expect(staggeredProgress(210, 1, 60, 300)).toBe(0.5);
    expect(staggeredProgress(1000, 2, 60, 300)).toBe(1);
  });

  it("jumps when the duration is zero", () => {
    expect(staggeredProgress(59, 1, 60, 0)).toBe(0);
    expect(staggeredProgress(60, 1, 60, 0)).toBe(1);
  });

  it("totals the sequence", () => {
    expect(staggeredTotalMs(3, 60, 300)).toBe(420);
    expect(staggeredTotalMs(1, 60, 300)).toBe(300);
    expect(staggeredTotalMs(0, 60, 300)).toBe(300);
  });
});
