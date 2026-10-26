import { describe, expect, it } from "vitest";
import { maxOverlapPx, shortestTileSide } from "./computeTiles";
import {
  cameraCrop,
  configFromDraft,
  DEFAULT_OVERLAP_PERCENT,
  defaultSplitDraft,
  draftFromConfig,
  hasCuts,
  isTileInGrid,
  MAX_OVERLAP_PERCENT,
  nextTileId,
  overlapPercent,
  overlapPxForPercent,
  pickedTileId,
  previousTileId,
  SPLIT_PRESETS,
  sheetCount,
} from "./splitConfig";

const IMAGE = { width: 1200, height: 900 };

describe("shortestTileSide", () => {
  it("is the shortest tile side on the axes that are cut", () => {
    expect(shortestTileSide(IMAGE, 1, 2)).toBe(600);
    expect(shortestTileSide(IMAGE, 3, 1)).toBe(300);
    expect(shortestTileSide(IMAGE, 3, 2)).toBe(300);
  });

  it("is 0 for 1×1", () => {
    expect(shortestTileSide(IMAGE, 1, 1)).toBe(0);
  });

  it("takes the smallest span when the cuts leave leftover px", () => {
    // 100 px in 3 → boundaries 0, 33, 67, 100: spans 33, 34, 33.
    expect(shortestTileSide({ width: 100, height: 100 }, 1, 3)).toBe(33);
  });

  it("is the side maxOverlapPx halves, rounding down", () => {
    const side = shortestTileSide(IMAGE, 4, 4);
    expect(maxOverlapPx(IMAGE, 4, 4)).toBe(Math.floor(side / 2));
  });

  it("throws for an invalid grid", () => {
    expect(() => shortestTileSide(IMAGE, 0, 2)).toThrow(/^shortestTileSide:/);
  });
});

describe("overlapPxForPercent", () => {
  it("is the percentage of the shortest tile side, in image px", () => {
    expect(overlapPxForPercent(IMAGE, 2, 2, 8)).toBe(36); // 8 % of 450
    expect(overlapPxForPercent(IMAGE, 1, 2, 10)).toBe(60); // 10 % of 600
  });

  it("never exceeds what computeTiles allows", () => {
    expect(overlapPxForPercent(IMAGE, 2, 2, 50)).toBe(maxOverlapPx(IMAGE, 2, 2));
    expect(overlapPxForPercent(IMAGE, 2, 2, 90)).toBe(maxOverlapPx(IMAGE, 2, 2));
    // 33 px tiles, 50 % = 16.5 → rounds to 17, capped at floor(33 / 2) = 16.
    expect(overlapPxForPercent({ width: 100, height: 100 }, 1, 3, 50)).toBe(16);
  });

  it("is 0 for 1×1 and for 0 %", () => {
    expect(overlapPxForPercent(IMAGE, 1, 1, 30)).toBe(0);
    expect(overlapPxForPercent(IMAGE, 3, 3, 0)).toBe(0);
  });
});

describe("overlapPercent", () => {
  it("is a whole percent of the shortest tile side", () => {
    expect(overlapPercent(IMAGE, 2, 2, 36)).toBe(8);
    expect(overlapPercent(IMAGE, 2, 2, 0)).toBe(0);
  });

  it("is 0 for 1×1", () => {
    expect(overlapPercent(IMAGE, 1, 1, 20)).toBe(0);
  });

  it("tops out at MAX_OVERLAP_PERCENT", () => {
    expect(overlapPercent(IMAGE, 2, 2, maxOverlapPx(IMAGE, 2, 2))).toBe(MAX_OVERLAP_PERCENT);
    expect(overlapPercent(IMAGE, 2, 2, 100000)).toBe(MAX_OVERLAP_PERCENT);
  });

  it("round-trips every whole percent on a normal tile", () => {
    for (let percent = 1; percent <= MAX_OVERLAP_PERCENT; percent++) {
      const px = overlapPxForPercent(IMAGE, 3, 3, percent);
      expect(overlapPercent(IMAGE, 3, 3, px)).toBe(percent);
    }
  });
});

describe("the splitter draft", () => {
  it("opens 2×2 with extended edges at 8 % and the tint on", () => {
    expect(defaultSplitDraft()).toEqual({
      rows: 2,
      cols: 2,
      edges: "extended",
      overlapPercent: 8,
      showOverlapTint: true,
    });
    expect(DEFAULT_OVERLAP_PERCENT).toBe(8);
  });

  it("turns into the config that is stored and drawn", () => {
    expect(configFromDraft(IMAGE, defaultSplitDraft())).toEqual({
      rows: 2,
      cols: 2,
      overlapPx: 36,
      showOverlapTint: true,
    });
  });

  it("is flush with overlapPx 0 when the edges are flush, whatever the percentage", () => {
    const draft = { ...defaultSplitDraft(), edges: "flush" as const, overlapPercent: 30 };
    expect(configFromDraft(IMAGE, draft).overlapPx).toBe(0);
  });

  it("has no overlap without cuts", () => {
    const draft = { ...defaultSplitDraft(), rows: 1, cols: 1 };
    expect(configFromDraft(IMAGE, draft).overlapPx).toBe(0);
  });

  it("reopens a stored config: extended is overlapPx > 0", () => {
    const config = { rows: 3, cols: 2, overlapPx: 30, showOverlapTint: false };
    expect(draftFromConfig(IMAGE, config)).toEqual({
      rows: 3,
      cols: 2,
      edges: "extended",
      overlapPercent: 10,
      showOverlapTint: false,
    });
  });

  it("reopens a flush config with the default percentage ready", () => {
    const config = { rows: 2, cols: 2, overlapPx: 0, showOverlapTint: true };
    expect(draftFromConfig(IMAGE, config)).toMatchObject({
      edges: "flush",
      overlapPercent: DEFAULT_OVERLAP_PERCENT,
    });
  });

  it("keeps the config the draft came from", () => {
    const config = { rows: 3, cols: 4, overlapPx: 24, showOverlapTint: true };
    expect(configFromDraft(IMAGE, draftFromConfig(IMAGE, config))).toEqual(config);
  });
});

describe("grid helpers", () => {
  it("counts sheets and tells when the grid cuts", () => {
    expect(sheetCount({ rows: 3, cols: 4 })).toBe(12);
    expect(hasCuts({ rows: 1, cols: 1 })).toBe(false);
    expect(hasCuts({ rows: 1, cols: 2 })).toBe(true);
    expect(hasCuts({ rows: 2, cols: 1 })).toBe(true);
  });

  it("offers the five quick grids, all within the limits", () => {
    expect(SPLIT_PRESETS.map((p) => `${p.rows}×${p.cols}`)).toEqual([
      "1×2",
      "2×2",
      "2×3",
      "3×3",
      "4×4",
    ]);
  });
});

describe("the picked tile", () => {
  it("knows which ids belong to a grid", () => {
    const grid = { rows: 2, cols: 3 };
    expect(isTileInGrid(grid, "A1")).toBe(true);
    expect(isTileInGrid(grid, "B3")).toBe(true);
    expect(isTileInGrid(grid, "C1")).toBe(false);
    expect(isTileInGrid(grid, "A4")).toBe(false);
    expect(isTileInGrid(grid, "A0")).toBe(false);
    expect(isTileInGrid(grid, "a1")).toBe(false);
    expect(isTileInGrid(grid, "")).toBe(false);
  });

  it("is the saved tile while it exists, A1 otherwise", () => {
    expect(pickedTileId({ rows: 2, cols: 3 }, "B2")).toBe("B2");
    expect(pickedTileId({ rows: 2, cols: 3 }, undefined)).toBe("A1");
    expect(pickedTileId({ rows: 1, cols: 2 }, "B2")).toBe("A1");
  });
});

describe("nextTileId", () => {
  it("goes along the row, then down to the next one", () => {
    const grid = { rows: 3, cols: 3 };
    expect(nextTileId(grid, "A1")).toBe("A2");
    expect(nextTileId(grid, "A3")).toBe("B1");
    expect(nextTileId(grid, "B2")).toBe("B3");
    expect(nextTileId(grid, "B3")).toBe("C1");
  });

  it("wraps from the last tile back to A1", () => {
    expect(nextTileId({ rows: 2, cols: 2 }, "B2")).toBe("A1");
    expect(nextTileId({ rows: 1, cols: 2 }, "A2")).toBe("A1");
    expect(nextTileId({ rows: 3, cols: 1 }, "C1")).toBe("A1");
  });

  it("walks a column grid top to bottom", () => {
    expect(nextTileId({ rows: 3, cols: 1 }, "A1")).toBe("B1");
    expect(nextTileId({ rows: 3, cols: 1 }, "B1")).toBe("C1");
  });

  it("treats a missing or out-of-grid tile as A1, so the next is A2", () => {
    expect(nextTileId({ rows: 2, cols: 2 }, undefined)).toBe("A2");
    expect(nextTileId({ rows: 1, cols: 2 }, "B2")).toBe("A2");
  });

  it("stays on A1 in a 1×1 grid", () => {
    expect(nextTileId({ rows: 1, cols: 1 }, "A1")).toBe("A1");
    expect(nextTileId({ rows: 1, cols: 1 }, undefined)).toBe("A1");
  });

  it("visits every tile of the grid once before coming back", () => {
    const grid = { rows: 4, cols: 3 };
    const seen = new Set<string>();
    let id: string | undefined;
    for (let i = 0; i < sheetCount(grid); i++) {
      id = nextTileId(grid, id);
      seen.add(id);
    }
    expect(seen.size).toBe(sheetCount(grid));
    expect(nextTileId(grid, id)).toBe("A2");
  });
});

describe("previousTileId", () => {
  it("goes back along the row, then up to the end of the row above", () => {
    const grid = { rows: 3, cols: 3 };
    expect(previousTileId(grid, "B3")).toBe("B2");
    expect(previousTileId(grid, "B1")).toBe("A3");
    expect(previousTileId(grid, "C1")).toBe("B3");
  });

  it("wraps from A1 to the last tile", () => {
    expect(previousTileId({ rows: 2, cols: 2 }, "A1")).toBe("B2");
    expect(previousTileId({ rows: 1, cols: 2 }, "A1")).toBe("A2");
    expect(previousTileId({ rows: 3, cols: 1 }, "A1")).toBe("C1");
  });

  it("treats a missing or out-of-grid tile as A1, so the previous is the last", () => {
    expect(previousTileId({ rows: 2, cols: 2 }, undefined)).toBe("B2");
    expect(previousTileId({ rows: 1, cols: 2 }, "B2")).toBe("A2");
  });

  it("stays on A1 in a 1×1 grid", () => {
    expect(previousTileId({ rows: 1, cols: 1 }, "A1")).toBe("A1");
  });

  it("undoes nextTileId on every tile of the grid", () => {
    const grid = { rows: 4, cols: 3 };
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const id = `${String.fromCharCode(65 + row)}${col + 1}`;
        expect(previousTileId(grid, nextTileId(grid, id))).toBe(id);
      }
    }
  });
});

describe("cameraCrop", () => {
  const split = { rows: 2, cols: 2, overlapPx: 0, showOverlapTint: true };

  it("is null for a project that was never split: the camera shows the whole image", () => {
    expect(cameraCrop(IMAGE, undefined, "A1")).toBeNull();
  });

  it("is the picked tile, flush when there is no overlap", () => {
    expect(cameraCrop(IMAGE, split, "B2")).toEqual({
      rect: { x: 600, y: 450, width: 600, height: 450 },
      core: { x: 0, y: 0, width: 600, height: 450 },
      tileId: "B2",
    });
  });

  it("takes the neighbour's strip on interior edges only, with the flush crop relative to it", () => {
    const extended = { ...split, overlapPx: 60 };
    // A1 touches the image border on its top and left: it grows right and down only.
    expect(cameraCrop(IMAGE, extended, "A1")).toEqual({
      rect: { x: 0, y: 0, width: 660, height: 510 },
      core: { x: 0, y: 0, width: 600, height: 450 },
      tileId: "A1",
    });
    // B2 touches the right and bottom borders: it grows left and up, so its flush crop is inset.
    expect(cameraCrop(IMAGE, extended, "B2")).toEqual({
      rect: { x: 540, y: 390, width: 660, height: 510 },
      core: { x: 60, y: 60, width: 600, height: 450 },
      tileId: "B2",
    });
  });

  it("falls back to A1 while no tile is picked or the saved one is gone", () => {
    expect(cameraCrop(IMAGE, split, undefined)?.tileId).toBe("A1");
    expect(cameraCrop(IMAGE, { ...split, rows: 1 }, "B2")?.tileId).toBe("A1");
  });

  it("a 1×1 split is the whole image as one tile", () => {
    const whole = { rows: 1, cols: 1, overlapPx: 0, showOverlapTint: false };
    expect(cameraCrop(IMAGE, whole, undefined)).toEqual({
      rect: { x: 0, y: 0, width: 1200, height: 900 },
      core: { x: 0, y: 0, width: 1200, height: 900 },
      tileId: "A1",
    });
  });
});
