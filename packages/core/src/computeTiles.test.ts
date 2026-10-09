import { describe, expect, it } from "vitest";
import { computeTiles, maxOverlapPx } from "./computeTiles";
import type { ImageSize, Rect, SplitConfig, Tile } from "./models";

function config(rows: number, cols: number, overlapPx = 0): SplitConfig {
  return { rows, cols, overlapPx, showOverlapTint: false };
}

function byId(tiles: Tile[], id: string): Tile {
  const tile = tiles.find((t) => t.id === id);
  if (!tile) throw new Error(`tile ${id} not found`);
  return tile;
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

describe("computeTiles", () => {
  it("returns the whole image for 1×1, ignoring overlap", () => {
    const tiles = computeTiles({ width: 800, height: 600 }, config(1, 1, 50));
    const image = { x: 0, y: 0, width: 800, height: 600 };
    expect(tiles).toEqual([{ id: "A1", row: 0, col: 0, rect: image, coreRect: image }]);
  });

  it("splits 2×2 flush with rect equal to coreRect", () => {
    const tiles = computeTiles({ width: 200, height: 100 }, config(2, 2));
    expect(tiles.map((t) => t.coreRect)).toEqual([
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 100, y: 0, width: 100, height: 50 },
      { x: 0, y: 50, width: 100, height: 50 },
      { x: 100, y: 50, width: 100, height: 50 },
    ]);
    for (const tile of tiles) expect(tile.rect).toEqual(tile.coreRect);
  });

  it("extends 2×2 tiles only across interior edges", () => {
    const tiles = computeTiles({ width: 200, height: 100 }, config(2, 2, 10));
    // A1: top-left → grows right and down.
    expect(byId(tiles, "A1").rect).toEqual({ x: 0, y: 0, width: 110, height: 60 });
    // A2: top-right → grows left and down.
    expect(byId(tiles, "A2").rect).toEqual({ x: 90, y: 0, width: 110, height: 60 });
    // B1: bottom-left → grows right and up.
    expect(byId(tiles, "B1").rect).toEqual({ x: 0, y: 40, width: 110, height: 60 });
    // B2: bottom-right → grows left and up.
    expect(byId(tiles, "B2").rect).toEqual({ x: 90, y: 40, width: 110, height: 60 });
    // coreRect is untouched by overlap.
    expect(byId(tiles, "B2").coreRect).toEqual({ x: 100, y: 50, width: 100, height: 50 });
  });

  it("spreads leftover pixels by rounding the boundaries (1 row × 3 cols)", () => {
    const tiles = computeTiles({ width: 100, height: 40 }, config(1, 3));
    expect(tiles.map((t) => t.coreRect)).toEqual([
      { x: 0, y: 0, width: 33, height: 40 },
      { x: 33, y: 0, width: 34, height: 40 },
      { x: 67, y: 0, width: 33, height: 40 },
    ]);
  });

  it("names tiles by row letter and 1-based column, ordered by rows", () => {
    const tiles = computeTiles({ width: 300, height: 300 }, config(3, 3));
    expect(tiles.map((t) => t.id)).toEqual(["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"]);
    expect(byId(tiles, "B3")).toMatchObject({ row: 1, col: 2 });
    const last = computeTiles({ width: 1000, height: 1000 }, config(10, 10)).at(-1);
    expect(last?.id).toBe("J10");
  });

  it("caps the overlap at half of the shortest cut side", () => {
    const image = { width: 3000, height: 200 };
    // Only columns are cut: the 200 px height does not limit the overlap.
    const fits = computeTiles(image, config(1, 3, 300));
    expect(byId(fits, "A2").rect).toEqual({ x: 700, y: 0, width: 1600, height: 200 });
    const capped = computeTiles(image, config(1, 3, 900));
    expect(byId(capped, "A1").rect).toEqual({ x: 0, y: 0, width: 1500, height: 200 });
  });

  it.each([
    ["rows 0", { width: 100, height: 100 }, config(0, 2)],
    ["cols 11", { width: 100, height: 100 }, config(2, 11)],
    ["rows 1.5", { width: 100, height: 100 }, config(1.5, 2)],
    ["negative overlap", { width: 100, height: 100 }, config(2, 2, -1)],
    ["fractional overlap", { width: 100, height: 100 }, config(2, 2, 2.5)],
    ["zero width", { width: 0, height: 100 }, config(1, 1)],
    ["width < cols", { width: 3, height: 100 }, config(1, 4)],
    ["height < rows", { width: 100, height: 2 }, config(3, 1)],
  ])("throws a clear error for %s", (_label, image, cfg) => {
    expect(() => computeTiles(image, cfg)).toThrowError(/^computeTiles: /);
  });

  describe("invariants for every rows × cols from 1 to 10", () => {
    const images: ImageSize[] = [
      { width: 97, height: 61 },
      { width: 1001, height: 333 },
    ];
    for (const image of images) {
      for (const overlapPx of [0, 7]) {
        it(`holds on ${image.width}×${image.height} with overlap ${overlapPx}`, () => {
          for (let rows = 1; rows <= 10; rows++) {
            for (let cols = 1; cols <= 10; cols++) {
              const tiles = computeTiles(image, config(rows, cols, overlapPx));
              expect(tiles).toHaveLength(rows * cols);

              // coreRects tile the image: same area, and each one touches its neighbours.
              const area = tiles.reduce((sum, t) => sum + t.coreRect.width * t.coreRect.height, 0);
              expect(area).toBe(image.width * image.height);
              for (const tile of tiles) {
                const { coreRect, row, col } = tile;
                expect(coreRect.width).toBeGreaterThan(0);
                expect(coreRect.height).toBeGreaterThan(0);
                if (col === 0) expect(coreRect.x).toBe(0);
                if (row === 0) expect(coreRect.y).toBe(0);
                const right = tiles[row * cols + col + 1];
                if (col < cols - 1 && right) {
                  expect(right.coreRect.x).toBe(coreRect.x + coreRect.width);
                  expect(right.coreRect.y).toBe(coreRect.y);
                } else {
                  expect(coreRect.x + coreRect.width).toBe(image.width);
                }
                const below = tiles[(row + 1) * cols + col];
                if (row < rows - 1 && below) {
                  expect(below.coreRect.y).toBe(coreRect.y + coreRect.height);
                  expect(below.coreRect.x).toBe(coreRect.x);
                } else {
                  expect(coreRect.y + coreRect.height).toBe(image.height);
                }

                // rect wraps coreRect and stays inside the image.
                const full = { x: 0, y: 0, width: image.width, height: image.height };
                expect(contains(tile.rect, coreRect)).toBe(true);
                expect(contains(full, tile.rect)).toBe(true);
              }
            }
          }
        });
      }
    }
  });
});

describe("maxOverlapPx", () => {
  it("is 0 for 1×1", () => {
    expect(maxOverlapPx({ width: 800, height: 600 }, 1, 1)).toBe(0);
  });

  it("only looks at the axis that is cut", () => {
    expect(maxOverlapPx({ width: 3000, height: 200 }, 1, 3)).toBe(500);
    expect(maxOverlapPx({ width: 200, height: 3000 }, 3, 1)).toBe(500);
  });

  it("takes the smallest cut side across both axes, floored", () => {
    // Widths 33/34/33, heights 50/50 → floor(33 / 2).
    expect(maxOverlapPx({ width: 100, height: 100 }, 2, 3)).toBe(16);
    // Widths 100/100, heights 25 → floor(25 / 2).
    expect(maxOverlapPx({ width: 200, height: 100 }, 4, 2)).toBe(12);
  });

  it("throws on invalid input", () => {
    expect(() => maxOverlapPx({ width: 100, height: 100 }, 0, 2)).toThrowError(/^maxOverlapPx: /);
    expect(() => maxOverlapPx({ width: 2, height: 100 }, 1, 3)).toThrowError(/^maxOverlapPx: /);
  });
});
