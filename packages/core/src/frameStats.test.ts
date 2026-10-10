import { describe, expect, it } from "vitest";
import {
  addFrame,
  emptyFrameWindow,
  type FrameWindow,
  frameBudgetMs,
  summarizeFrameWindow,
} from "./frameStats";

const HZ_60 = 1000 / 60;
const HZ_120 = 1000 / 120;

function feed(deltas: number[], budgetMs: number): FrameWindow {
  return deltas.reduce((window, delta) => addFrame(window, delta, budgetMs), emptyFrameWindow());
}

describe("summarizeFrameWindow", () => {
  it("reports 0 fps for an empty window", () => {
    expect(summarizeFrameWindow(emptyFrameWindow())).toEqual({
      fps: 0,
      worstMs: 0,
      longFrames: 0,
    });
  });

  it("reports 60 fps for a steady 60 Hz second", () => {
    const window = feed(Array<number>(60).fill(HZ_60), HZ_60);
    expect(summarizeFrameWindow(window)).toEqual({ fps: 60, worstMs: 17, longFrames: 0 });
  });

  it("reports 120 fps for a steady 120 Hz second", () => {
    const window = feed(Array<number>(120).fill(HZ_120), HZ_120);
    expect(summarizeFrameWindow(window).fps).toBe(120);
  });

  it("counts a dropped frame as long and keeps the worst interval", () => {
    const deltas = [...Array<number>(56).fill(HZ_60), HZ_60 * 4];
    const summary = summarizeFrameWindow(feed(deltas, HZ_60));
    expect(summary.longFrames).toBe(1);
    expect(summary.worstMs).toBe(67);
    expect(summary.fps).toBe(57);
  });

  it("does not count jitter under 1.5× the budget as long", () => {
    expect(summarizeFrameWindow(feed([HZ_60 * 1.4, HZ_60], HZ_60)).longFrames).toBe(0);
  });
});

describe("addFrame", () => {
  it("ignores the null-ish first interval and bad values", () => {
    const window = feed([0, -5, Number.NaN, Number.POSITIVE_INFINITY], HZ_60);
    expect(window).toEqual(emptyFrameWindow());
  });
});

describe("frameBudgetMs", () => {
  it("snaps jittery intervals to the nearest common refresh rate", () => {
    expect(frameBudgetMs(16.1)).toBeCloseTo(HZ_60);
    expect(frameBudgetMs(11.2)).toBeCloseTo(1000 / 90);
    expect(frameBudgetMs(8.1)).toBeCloseTo(HZ_120);
    expect(frameBudgetMs(6.9)).toBeCloseTo(1000 / 144);
  });

  it("falls back to 60 Hz without a valid interval", () => {
    expect(frameBudgetMs(0)).toBeCloseTo(HZ_60);
    expect(frameBudgetMs(Number.POSITIVE_INFINITY)).toBeCloseTo(HZ_60);
  });
});
