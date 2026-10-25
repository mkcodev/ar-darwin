import { describe, expect, it } from "vitest";
import { maxOverlapPx, shortestTileSide } from "./computeTiles";
import {
  configFromDraft,
  DEFAULT_OVERLAP_PERCENT,
  defaultSplitDraft,
  draftFromConfig,
  hasCuts,
  MAX_OVERLAP_PERCENT,
  overlapPercent,
  overlapPxForPercent,
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
