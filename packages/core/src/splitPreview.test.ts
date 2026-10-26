import { describe, expect, it } from "vitest";
import type { SplitConfig } from "./models";
import { separatedCenter, splitPreviewLayout, tileAtPoint } from "./splitPreview";

const IMAGE = { width: 1200, height: 900 };
const FRAME = { width: 360, height: 400 };
const GAP = 12;
const config = (patch: Partial<SplitConfig> = {}): SplitConfig => ({
  rows: 2,
  cols: 2,
  overlapPx: 0,
  showOverlapTint: true,
  ...patch,
});

/** Bounding box of the tiles once separated. */
function separatedBounds(layout: ReturnType<typeof splitPreviewLayout>) {
  const xs = layout.tiles.flatMap((t) => [
    t.rect.x + t.offset.x,
    t.rect.x + t.rect.width + t.offset.x,
  ]);
  const ys = layout.tiles.flatMap((t) => [
    t.rect.y + t.offset.y,
    t.rect.y + t.rect.height + t.offset.y,
  ]);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

describe("splitPreviewLayout", () => {
  it("fits the separated tiles in the frame, touching its limiting sides", () => {
    for (const patch of [{}, { overlapPx: 60 }, { rows: 3, cols: 4, overlapPx: 20 }]) {
      const layout = splitPreviewLayout(IMAGE, config(patch), FRAME, GAP);
      const b = separatedBounds(layout);
      expect(b.left).toBeGreaterThanOrEqual(-1e-6);
      expect(b.top).toBeGreaterThanOrEqual(-1e-6);
      expect(b.right).toBeLessThanOrEqual(FRAME.width + 1e-6);
      expect(b.bottom).toBeLessThanOrEqual(FRAME.height + 1e-6);
      // The image is 4:3 in a 360×400 frame: the width limits it.
      expect(b.right - b.left).toBeCloseTo(FRAME.width, 6);
    }
  });

  it("centres the separated tiles in the frame", () => {
    const layout = splitPreviewLayout(IMAGE, config({ overlapPx: 60 }), FRAME, GAP);
    const b = separatedBounds(layout);
    expect((b.left + b.right) / 2).toBeCloseTo(FRAME.width / 2, 6);
    expect((b.top + b.bottom) / 2).toBeCloseTo(FRAME.height / 2, 6);
  });

  it("leaves exactly tileGap between the crops of neighbouring tiles", () => {
    const layout = splitPreviewLayout(IMAGE, config({ overlapPx: 60 }), FRAME, GAP);
    const [a, b] = layout.tiles;
    if (!a || !b) throw new Error("expected two tiles");
    const gapBetween = b.rect.x + b.offset.x - (a.rect.x + a.rect.width + a.offset.x);
    expect(gapBetween).toBeCloseTo(GAP, 6);
  });

  it("joined, the core rects cover the image exactly where it sits", () => {
    const layout = splitPreviewLayout(IMAGE, config({ overlapPx: 60 }), FRAME, GAP);
    const left = Math.min(...layout.tiles.map((t) => t.coreRect.x));
    const right = Math.max(...layout.tiles.map((t) => t.coreRect.x + t.coreRect.width));
    expect(left).toBeCloseTo(layout.origin.x, 6);
    expect(right - left).toBeCloseTo(IMAGE.width * layout.scale, 6);
  });

  it("gives each tile the crop computeTiles gives, in screen px", () => {
    const layout = splitPreviewLayout(IMAGE, config({ overlapPx: 60 }), FRAME, GAP);
    const a1 = layout.tiles[0];
    if (!a1) throw new Error("expected a tile");
    expect(a1.id).toBe("A1");
    // A1 extends 60 px to the right and down only; its outer sides stay on the image border.
    expect(a1.rect.width).toBeCloseTo((600 + 60) * layout.scale, 6);
    expect(a1.rect.height).toBeCloseTo((450 + 60) * layout.scale, 6);
    expect(a1.coreRect.width).toBeCloseTo(600 * layout.scale, 6);
  });

  it("does not separate a single tile", () => {
    const layout = splitPreviewLayout(IMAGE, config({ rows: 1, cols: 1 }), FRAME, GAP);
    expect(layout.tiles).toHaveLength(1);
    expect(layout.tiles[0]?.offset).toEqual({ x: 0, y: 0 });
    expect(layout.scale).toBeCloseTo(FRAME.width / IMAGE.width, 6);
  });

  it("caps the overlap like computeTiles when asked for more", () => {
    const capped = splitPreviewLayout(IMAGE, config({ overlapPx: 9999 }), FRAME, GAP);
    const max = splitPreviewLayout(IMAGE, config({ overlapPx: 225 }), FRAME, GAP);
    expect(capped.scale).toBeCloseTo(max.scale, 9);
  });

  it("throws for an invalid split", () => {
    expect(() => splitPreviewLayout(IMAGE, config({ rows: 0 }), FRAME, GAP)).toThrow(
      /^computeTiles:/,
    );
  });

  it("never gives a negative scale to a frame too small for the gaps", () => {
    const layout = splitPreviewLayout(
      IMAGE,
      config({ rows: 10, cols: 10 }),
      { width: 50, height: 50 },
      GAP,
    );
    expect(layout.scale).toBe(0);
  });
});

describe("tileAtPoint", () => {
  const layout = splitPreviewLayout(IMAGE, config({ overlapPx: 60 }), FRAME, GAP);

  it("finds the tile under a point, with the tiles separated", () => {
    for (const tile of layout.tiles) {
      expect(tileAtPoint(layout, separatedCenter(tile))).toBe(tile.id);
    }
  });

  it("returns null in the gap between tiles and outside them", () => {
    const [a, b] = layout.tiles;
    if (!a || !b) throw new Error("expected two tiles");
    const midGap = {
      x: (a.rect.x + a.rect.width + a.offset.x + b.rect.x + b.offset.x) / 2,
      y: separatedCenter(a).y,
    };
    expect(tileAtPoint(layout, midGap)).toBeNull();
    expect(tileAtPoint(layout, { x: -5, y: -5 })).toBeNull();
  });
});
