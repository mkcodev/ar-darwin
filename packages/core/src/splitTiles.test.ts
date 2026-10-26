import { describe, expect, it } from "vitest";
import { computeTiles } from "./computeTiles";
import type { SplitConfig } from "./models";
import { computePaperTiles } from "./paperSplit";
import { splitGridAspect, splitTiles, tileThumbnailRect } from "./splitTiles";

const IMAGE = { width: 1200, height: 900 };

const manual: SplitConfig = { rows: 2, cols: 3, overlapPx: 20, showOverlapTint: true };

function paperSplit(overlapMm: number): SplitConfig {
  const paper = {
    paper: "A4" as const,
    orientation: "portrait" as const,
    widthCm: 42,
    overlapMm,
  };
  const sheets = computePaperTiles(IMAGE, paper);
  return {
    rows: sheets.rows,
    cols: sheets.cols,
    overlapPx: Math.round(overlapMm * sheets.pxPerMm),
    showOverlapTint: true,
    paper,
  };
}

describe("splitTiles", () => {
  it("is computeTiles for a manual split", () => {
    expect(splitTiles(IMAGE, manual)).toEqual(computeTiles(IMAGE, manual));
  });

  it("gives one tile per sheet, with the same ids and order as computePaperTiles", () => {
    const split = paperSplit(10);
    const tiles = splitTiles(IMAGE, split);
    const sheets = computePaperTiles(IMAGE, split.paper as NonNullable<SplitConfig["paper"]>);
    expect(tiles.map((t) => t.id)).toEqual(sheets.sheets.map((s) => s.id));
    expect(tiles.map((t) => t.rect)).toEqual(sheets.sheets.map((s) => s.rect));
    expect(tiles.map((t) => [t.row, t.col])).toEqual(sheets.sheets.map((s) => [s.row, s.col]));
  });

  it("insets the core by the shared strip on interior sides only", () => {
    const split = paperSplit(10);
    const sheets = computePaperTiles(IMAGE, split.paper as NonNullable<SplitConfig["paper"]>);
    const overlap = sheets.overlapMm * sheets.pxPerMm;
    const tiles = splitTiles(IMAGE, split);
    const first = tiles[0];
    const last = tiles[tiles.length - 1];
    if (first === undefined || last === undefined) throw new Error("no sheets");
    expect(first.coreRect.x).toBe(first.rect.x);
    expect(first.coreRect.y).toBe(first.rect.y);
    expect(first.coreRect.width).toBeCloseTo(first.rect.width - overlap, 6);
    expect(first.coreRect.height).toBeCloseTo(first.rect.height - overlap, 6);
    expect(last.coreRect.x).toBeCloseTo(last.rect.x + overlap, 6);
    expect(last.coreRect.y).toBeCloseTo(last.rect.y + overlap, 6);
    expect(last.coreRect.width).toBeCloseTo(last.rect.width - overlap, 6);
  });

  it("has no strip when the sheets only touch, and none for a single sheet", () => {
    for (const tile of splitTiles(IMAGE, paperSplit(0))) {
      expect(tile.coreRect).toEqual(tile.rect);
    }
    const one: SplitConfig = {
      rows: 1,
      cols: 1,
      overlapPx: 0,
      showOverlapTint: true,
      paper: { paper: "A3", orientation: "landscape", widthCm: 20, overlapMm: 10 },
    };
    const [tile] = splitTiles(IMAGE, one);
    expect(tile?.coreRect).toEqual(tile?.rect);
  });

  it("lets a sheet start before the image and end past it", () => {
    const tiles = splitTiles(IMAGE, paperSplit(10));
    expect(tiles.some((t) => t.rect.x < 0 || t.rect.y < 0)).toBe(true);
    expect(tiles.some((t) => t.rect.x + t.rect.width > IMAGE.width)).toBe(true);
  });
});

describe("tileThumbnailRect", () => {
  it("is the flush crop of a manual tile and the whole window of a sheet", () => {
    const [m] = splitTiles(IMAGE, manual);
    if (m === undefined) throw new Error("no tiles");
    expect(tileThumbnailRect(manual, m)).toEqual(m.coreRect);
    const split = paperSplit(10);
    const [p] = splitTiles(IMAGE, split);
    if (p === undefined) throw new Error("no sheets");
    expect(tileThumbnailRect(split, p)).toEqual(p.rect);
  });
});

describe("splitGridAspect", () => {
  it("is the picture's own shape for a manual split or none", () => {
    expect(splitGridAspect(IMAGE, manual)).toBeCloseTo(4 / 3, 9);
    expect(splitGridAspect(IMAGE, undefined)).toBeCloseTo(4 / 3, 9);
  });

  it("is cols sheets by rows sheets for a split by paper size", () => {
    const split = paperSplit(10);
    expect(splitGridAspect(IMAGE, split)).toBeCloseTo((split.cols * 210) / (split.rows * 297), 9);
    const landscape: SplitConfig = {
      ...split,
      paper: { ...(split.paper as NonNullable<SplitConfig["paper"]>), orientation: "landscape" },
    };
    expect(splitGridAspect(IMAGE, landscape)).toBeCloseTo(
      (split.cols * 297) / (split.rows * 210),
      9,
    );
  });
});
