import { describe, expect, it } from "vitest";
import {
  clampPreviewPan,
  isPreviewZoomed,
  panPreview,
  previewContentPoint,
  UNZOOMED_VIEW,
  zoomPreviewAt,
} from "./previewZoom";

const FRAME = { width: 400, height: 300 };
const MAX = 4;

describe("zoomPreviewAt", () => {
  it("keeps the content point under the focus where it was", () => {
    const view = zoomPreviewAt(UNZOOMED_VIEW, 2, 300, 200, FRAME.width, FRAME.height, MAX);
    expect(view.scale).toBe(2);
    expect(previewContentPoint(view, 300, 200)).toEqual({ x: 300, y: 200 });
  });

  it("keeps it on a second zoom of an already panned view", () => {
    const first = zoomPreviewAt(UNZOOMED_VIEW, 2, 300, 200, FRAME.width, FRAME.height, MAX);
    const before = previewContentPoint(first, 120, 90);
    const second = zoomPreviewAt(first, 3, 120, 90, FRAME.width, FRAME.height, MAX);
    const after = previewContentPoint(second, 120, 90);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it("stays within 1..maxScale", () => {
    expect(zoomPreviewAt(UNZOOMED_VIEW, 9, 0, 0, FRAME.width, FRAME.height, MAX).scale).toBe(MAX);
    expect(zoomPreviewAt(UNZOOMED_VIEW, 0.2, 0, 0, FRAME.width, FRAME.height, MAX)).toEqual(
      UNZOOMED_VIEW,
    );
  });

  it("zooming out to 1 returns to the unzoomed view from anywhere", () => {
    const zoomed = zoomPreviewAt(UNZOOMED_VIEW, 3, 350, 250, FRAME.width, FRAME.height, MAX);
    expect(zoomPreviewAt(zoomed, 1, 100, 100, FRAME.width, FRAME.height, MAX)).toEqual(
      UNZOOMED_VIEW,
    );
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
