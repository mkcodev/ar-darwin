import { describe, expect, it } from "vitest";
import {
  clampPreviewPan,
  isPreviewZoomed,
  type PreviewView,
  panPreview,
  pinchPreview,
  previewContentPoint,
  UNZOOMED_VIEW,
} from "./previewZoom";

const FRAME = { width: 400, height: 300 };
const MAX = 4;

describe("pinchPreview", () => {
  const pinch = (
    start: PreviewView,
    from: [number, number],
    factor: number,
    to: [number, number] = from,
  ) => pinchPreview(start, from[0], from[1], factor, to[0], to[1], FRAME.width, FRAME.height, MAX);

  it("keeps the content point under the fingers where it was", () => {
    const view = pinch(UNZOOMED_VIEW, [300, 200], 2);
    expect(view.scale).toBe(2);
    expect(previewContentPoint(view, 300, 200)).toEqual({ x: 300, y: 200 });
  });

  it("keeps it on a second pinch of an already zoomed and panned view", () => {
    const first = pinch(UNZOOMED_VIEW, [300, 200], 2);
    const before = previewContentPoint(first, 120, 90);
    const second = pinch(first, [120, 90], 1.5);
    const after = previewContentPoint(second, 120, 90);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it("makes the starting content point follow the fingers while they drift and zoom", () => {
    const start = pinch(UNZOOMED_VIEW, [300, 200], 2);
    const anchor = previewContentPoint(start, 250, 150);
    const view = pinch(start, [250, 150], 1.4, [270, 140]);
    const under = previewContentPoint(view, 270, 140);
    expect(under.x).toBeCloseTo(anchor.x, 9);
    expect(under.y).toBeCloseTo(anchor.y, 9);
  });

  it("pans without zooming when the fingers only move", () => {
    const start = pinch(UNZOOMED_VIEW, [300, 200], 2);
    const view = pinch(start, [250, 150], 1, [230, 170]);
    expect(view.scale).toBe(2);
    expect(view.tx).toBeCloseTo(start.tx - 20, 9);
    expect(view.ty).toBeCloseTo(start.ty + 20, 9);
  });

  it("stays within 1..maxScale", () => {
    expect(pinch(UNZOOMED_VIEW, [0, 0], 9).scale).toBe(MAX);
    expect(pinch(UNZOOMED_VIEW, [0, 0], 0.2)).toEqual(UNZOOMED_VIEW);
  });

  it("zooming out to 1 returns to the unzoomed view from anywhere", () => {
    const zoomed = pinch(UNZOOMED_VIEW, [350, 250], 3);
    expect(pinch(zoomed, [100, 100], 0.01)).toEqual(UNZOOMED_VIEW);
  });

  it("never leaves an empty margin", () => {
    const view = pinch(UNZOOMED_VIEW, [10, 10], 3, [390, 290]);
    expect(view.tx).toBeLessThanOrEqual(0);
    expect(view.tx).toBeGreaterThanOrEqual(FRAME.width * (1 - view.scale));
  });
});

describe("clampPreviewPan", () => {
  it("keeps the zoomed content covering the frame", () => {
    const view = { scale: 2, tx: 50, ty: -900 };
    expect(clampPreviewPan(view, FRAME.width, FRAME.height)).toEqual({
      scale: 2,
      tx: 0,
      ty: -300,
    });
    expect(clampPreviewPan({ scale: 2, tx: -999, ty: 0 }, FRAME.width, FRAME.height).tx).toBe(-400);
  });

  it("cannot pan an unzoomed view", () => {
    expect(clampPreviewPan({ scale: 1, tx: 30, ty: -30 }, FRAME.width, FRAME.height)).toEqual(
      UNZOOMED_VIEW,
    );
  });
});

describe("panPreview", () => {
  it("moves the view and stops at the edges", () => {
    const zoomed = { scale: 2, tx: -100, ty: -100 };
    expect(panPreview(zoomed, -50, 20, FRAME.width, FRAME.height)).toEqual({
      scale: 2,
      tx: -150,
      ty: -80,
    });
    expect(panPreview(zoomed, 500, -500, FRAME.width, FRAME.height)).toEqual({
      scale: 2,
      tx: 0,
      ty: -300,
    });
  });
});

describe("previewContentPoint", () => {
  it("is the touch itself when unzoomed", () => {
    expect(previewContentPoint(UNZOOMED_VIEW, 123, 45)).toEqual({ x: 123, y: 45 });
  });

  it("undoes zoom and pan", () => {
    expect(previewContentPoint({ scale: 2, tx: -100, ty: -40 }, 200, 100)).toEqual({
      x: 150,
      y: 70,
    });
  });
});

describe("isPreviewZoomed", () => {
  it("tells a zoomed view from the rest position", () => {
    expect(isPreviewZoomed(UNZOOMED_VIEW)).toBe(false);
    expect(isPreviewZoomed({ scale: 1.0001, tx: 0, ty: 0 })).toBe(false);
    expect(isPreviewZoomed({ scale: 1.5, tx: 0, ty: 0 })).toBe(true);
  });
});
