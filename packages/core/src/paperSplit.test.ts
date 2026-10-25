import { describe, expect, it } from "vitest";
import { MAX_SPLIT } from "./models";
import {
  computePaperTiles,
  maxPaperOverlapMm,
  type Orientation,
  PAPER_SIZES,
  type PaperSheet,
  type PaperSize,
  type PaperSplitConfig,
  type PaperTiles,
} from "./paperSplit";

const PAPERS: PaperSize[] = ["A4", "A3", "Letter"];
const ORIENTATIONS: Orientation[] = ["portrait", "landscape"];
const IMAGES = [
  { width: 1000, height: 1000 },
  { width: 4000, height: 3000 },
  { width: 3000, height: 4000 },
  { width: 1920, height: 1080 },
  { width: 1237, height: 893 },
  { width: 6000, height: 400 },
  { width: 400, height: 6000 },
];
const WIDTHS_CM = [5, 21, 29.7, 42, 60, 84.1, 120];
const OVERLAPS_MM = [0, 1, 5, 10, 25.5];
const TOLERANCE = 1e-6;

function config(
  paper: PaperSize,
  orientation: Orientation,
  widthCm: number,
  overlapMm = 0,
): PaperSplitConfig {
  return { paper, orientation, widthCm, overlapMm };
}

/** Runs `check` over every combination that fits the sheet limit. */
function forEachCase(
  check: (
    result: PaperTiles,
    ctx: { image: { width: number; height: number }; cfg: PaperSplitConfig },
  ) => void,
): number {
  let cases = 0;
  for (const paper of PAPERS) {
    for (const orientation of ORIENTATIONS) {
      for (const image of IMAGES) {
        for (const widthCm of WIDTHS_CM) {
          for (const overlapMm of OVERLAPS_MM) {
            const cfg = config(paper, orientation, widthCm, overlapMm);
            let result: PaperTiles;
            try {
              result = computePaperTiles(image, cfg);
            } catch (error) {
              // Only the sheet limit may reject an otherwise valid case.
              expect(String(error)).toContain(`the limit is ${MAX_SPLIT}`);
              continue;
            }
            check(result, { image, cfg });
            cases++;
          }
        }
      }
    }
  }
  return cases;
}

function sheetAt(result: PaperTiles, row: number, col: number): PaperSheet {
  const sheet = result.sheets[row * result.cols + col];
  if (!sheet) throw new Error(`sheet ${row},${col} not found`);
  return sheet;
}

describe("PAPER_SIZES", () => {
  it("has the real dimensions in mm, portrait", () => {
    expect(PAPER_SIZES.A4).toEqual({ width: 210, height: 297 });
    expect(PAPER_SIZES.A3).toEqual({ width: 297, height: 420 });
    expect(PAPER_SIZES.Letter).toEqual({ width: 215.9, height: 279.4 });
  });
});

describe("maxPaperOverlapMm", () => {
  it("is half of the shortest side, whatever the orientation", () => {
    expect(maxPaperOverlapMm("A4", "portrait")).toBe(105);
    expect(maxPaperOverlapMm("A4", "landscape")).toBe(105);
    expect(maxPaperOverlapMm("A3", "portrait")).toBe(148.5);
    expect(maxPaperOverlapMm("Letter", "landscape")).toBeCloseTo(107.95, 10);
  });

  it("rejects unknown paper or orientation with a prefixed error", () => {
    expect(() => maxPaperOverlapMm("A5" as PaperSize, "portrait")).toThrow(/^maxPaperOverlapMm:/);
    expect(() => maxPaperOverlapMm("A4", "diagonal" as Orientation)).toThrow(/^maxPaperOverlapMm:/);
  });
});

describe("computePaperTiles", () => {
  it("fits a drawing in one centred sheet", () => {
    // 10 cm wide square on A4 portrait (210 × 297 mm): 1 × 1, blank space all around.
    const result = computePaperTiles({ width: 1000, height: 1000 }, config("A4", "portrait", 10));
    expect(result.rows).toBe(1);
    expect(result.cols).toBe(1);
    expect(result.count).toBe(1);
    expect(result.mmPerPx).toBeCloseTo(0.1, 12);
    expect(result.pxPerMm).toBeCloseTo(10, 12);
    const sheet = sheetAt(result, 0, 0);
    expect(sheet.id).toBe("A1");
    // Sheet is 2100 × 2970 px; the 1000 × 1000 image sits in the middle.
    expect(sheet.rect.width).toBeCloseTo(2100, 9);
    expect(sheet.rect.height).toBeCloseTo(2970, 9);
    expect(sheet.rect.x).toBeCloseTo(-550, 9);
    expect(sheet.rect.y).toBeCloseTo(-985, 9);
    expect(sheet.imageRect).toEqual({ x: 0, y: 0, width: 1000, height: 1000 });
  });

  it("lays out a known 2 × 2 grid with overlap", () => {
    // A4 portrait, overlap 10 mm: 2 cols span 410 mm, 2 rows span 584 mm.
    // Drawing 40 cm × 57 cm (image 4000 × 5700 px): leftover 10 mm and 14 mm.
    const result = computePaperTiles(
      { width: 4000, height: 5700 },
      config("A4", "portrait", 40, 10),
    );
    expect(result.cols).toBe(2);
    expect(result.rows).toBe(2);
    expect(result.sheets.map((s) => s.id)).toEqual(["A1", "A2", "B1", "B2"]);
    // 10 px per mm; leftover/2 = 5 mm × 10 = 50 px horizontally, 7 mm × 10 = 70 px vertically.
    const a1 = sheetAt(result, 0, 0);
    expect(a1.rect.x).toBeCloseTo(-50, 9);
    expect(a1.rect.y).toBeCloseTo(-70, 9);
    const b2 = sheetAt(result, 1, 1);
    expect(b2.rect.x).toBeCloseTo(-50 + 2000, 9);
    expect(b2.rect.y).toBeCloseTo(-70 + 2870, 9);
    expect(b2.rect.x + b2.rect.width).toBeCloseTo(4050, 9);
    expect(b2.rect.y + b2.rect.height).toBeCloseTo(5770, 9);
    expect(b2.imageRect.width).toBeCloseTo(4000 - b2.rect.x, 9);
  });

  it("swaps width and height between portrait and landscape", () => {
    const image = { width: 3000, height: 2000 };
    const portrait = computePaperTiles(image, config("A4", "portrait", 50));
    const landscape = computePaperTiles(image, config("A4", "landscape", 50));
    expect(portrait.sheetMm).toEqual({ width: 210, height: 297 });
    expect(landscape.sheetMm).toEqual({ width: 297, height: 210 });
    // 500 × 333.3 mm: portrait needs 3 × 2 sheets, landscape 2 × 2.
    expect([portrait.cols, portrait.rows]).toEqual([3, 2]);
    expect([landscape.cols, landscape.rows]).toEqual([2, 2]);
  });

  it("uses each paper's real size for the sheet window", () => {
    const image = { width: 2000, height: 2000 };
    for (const paper of PAPERS) {
      const { sheetMm, pxPerMm, sheets } = computePaperTiles(image, config(paper, "portrait", 20));
      expect(sheetMm).toEqual(PAPER_SIZES[paper]);
      const first = sheets[0];
      expect(first?.rect.width).toBeCloseTo(PAPER_SIZES[paper].width * pxPerMm, 9);
      expect(first?.rect.height).toBeCloseTo(PAPER_SIZES[paper].height * pxPerMm, 9);
    }
  });

  it("returns exact adjacent sheets, with no gaps, when overlap is 0", () => {
    // A4 portrait, 63 cm × 59.4 cm: exactly 3 × 2 sheets, nothing left over.
    const result = computePaperTiles({ width: 630, height: 594 }, config("A4", "portrait", 63));
    expect([result.cols, result.rows]).toEqual([3, 2]);
    for (const sheet of result.sheets) {
      expect(sheet.imageRect.x).toBeCloseTo(sheet.rect.x, 9);
      expect(sheet.imageRect.y).toBeCloseTo(sheet.rect.y, 9);
      expect(sheet.imageRect.width).toBeCloseTo(sheet.rect.width, 9);
      expect(sheet.imageRect.height).toBeCloseTo(sheet.rect.height, 9);
    }
    expect(sheetAt(result, 0, 0).rect.x).toBe(0);
    expect(sheetAt(result, 0, 0).rect.y).toBe(0);
  });

  it("treats an exact fit with overlap as a fit, not as one more sheet", () => {
    // 3 A4 portrait sheets with 10 mm overlap span 610 mm; 2 × 297 - 10 = 584 mm tall.
    const result = computePaperTiles(
      { width: 6100, height: 5840 },
      config("A4", "portrait", 61, 10),
    );
    expect([result.cols, result.rows]).toEqual([3, 2]);
    expect(sheetAt(result, 0, 0).rect.x).toBeCloseTo(0, 9);
    expect(sheetAt(result, 0, 0).rect.y).toBeCloseTo(0, 9);
  });

  it("adds a sheet as soon as the drawing is a hair bigger than the grid", () => {
    const fit = computePaperTiles({ width: 2100, height: 2970 }, config("A4", "portrait", 21));
    expect([fit.cols, fit.rows]).toEqual([1, 1]);
    const over = computePaperTiles({ width: 2101, height: 2970 }, config("A4", "portrait", 21.01));
    expect([over.cols, over.rows]).toEqual([2, 1]);
  });

  it("handles very wide and very tall images", () => {
    const wide = computePaperTiles({ width: 12000, height: 300 }, config("A4", "portrait", 100));
    expect(wide.rows).toBe(1);
    expect(wide.cols).toBe(5);
    expect(sheetAt(wide, 0, 0).rect.height).toBeGreaterThan(300);
    const tall = computePaperTiles({ width: 300, height: 12000 }, config("A3", "landscape", 7));
    expect(tall.cols).toBe(1);
    expect(tall.rows).toBe(10);
    expect(tall.sheets.map((s) => s.id)).toEqual([
      "A1",
      "B1",
      "C1",
      "D1",
      "E1",
      "F1",
      "G1",
      "H1",
      "I1",
      "J1",
    ]);
  });

  it("caps the overlap at half the shortest side and reports the applied value", () => {
    const capped = computePaperTiles(
      { width: 2000, height: 2000 },
      config("A4", "portrait", 40, 500),
    );
    expect(capped.overlapMm).toBe(105);
    const same = computePaperTiles(
      { width: 2000, height: 2000 },
      config("A4", "portrait", 40, 105),
    );
    expect(same.sheets).toEqual(capped.sheets);
    const kept = computePaperTiles({ width: 2000, height: 2000 }, config("A4", "portrait", 40, 7));
    expect(kept.overlapMm).toBe(7);
  });

  it("is deterministic and does not mutate its input", () => {
    const image = { width: 1500, height: 1000 };
    const cfg = config("Letter", "landscape", 70, 12);
    const frozen = JSON.stringify([image, cfg]);
    expect(computePaperTiles(image, cfg)).toEqual(computePaperTiles(image, cfg));
    expect(JSON.stringify([image, cfg])).toBe(frozen);
  });
});

describe("computePaperTiles invariants", () => {
  it("runs a meaningful number of cases", () => {
    const cases = forEachCase(() => {});
    expect(cases).toBeGreaterThan(500);
  });

  it("gives every sheet the proportion of the paper", () => {
    forEachCase((result) => {
      const ratio = result.sheetMm.width / result.sheetMm.height;
      for (const sheet of result.sheets) {
        expect(sheet.rect.width / sheet.rect.height).toBeCloseTo(ratio, 9);
        expect(sheet.rect.width).toBeCloseTo(result.sheetMm.width * result.pxPerMm, 6);
      }
    });
  });

  it("overlaps neighbouring sheets by exactly overlapMm", () => {
    forEachCase((result, { cfg }) => {
      const expectedPx = result.overlapMm * result.pxPerMm;
      expect(result.overlapMm).toBeLessThanOrEqual(cfg.overlapMm);
      for (const sheet of result.sheets) {
        if (sheet.col < result.cols - 1) {
          const right = sheetAt(result, sheet.row, sheet.col + 1);
          const shared = sheet.rect.x + sheet.rect.width - right.rect.x;
          expect(Math.abs(shared - expectedPx)).toBeLessThan(TOLERANCE);
          expect(right.rect.y).toBeCloseTo(sheet.rect.y, 9);
        }
        if (sheet.row < result.rows - 1) {
          const below = sheetAt(result, sheet.row + 1, sheet.col);
          const shared = sheet.rect.y + sheet.rect.height - below.rect.y;
          expect(Math.abs(shared - expectedPx)).toBeLessThan(TOLERANCE);
          expect(below.rect.x).toBeCloseTo(sheet.rect.x, 9);
        }
      }
    });
  });

  it("covers the whole image, with no gaps between sheets", () => {
    forEachCase((result, { image }) => {
      const first = sheetAt(result, 0, 0);
      const last = sheetAt(result, result.rows - 1, result.cols - 1);
      expect(first.rect.x).toBeLessThanOrEqual(TOLERANCE);
      expect(first.rect.y).toBeLessThanOrEqual(TOLERANCE);
      expect(last.rect.x + last.rect.width).toBeGreaterThanOrEqual(image.width - TOLERANCE);
      expect(last.rect.y + last.rect.height).toBeGreaterThanOrEqual(image.height - TOLERANCE);

      // Sample points, including both borders, each land in at least one sheet's imageRect.
      for (let i = 0; i <= 20; i++) {
        for (let j = 0; j <= 20; j++) {
          const px = (image.width * i) / 20;
          const py = (image.height * j) / 20;
          const hit = result.sheets.some(
            (s) =>
              px >= s.imageRect.x - TOLERANCE &&
              px <= s.imageRect.x + s.imageRect.width + TOLERANCE &&
              py >= s.imageRect.y - TOLERANCE &&
              py <= s.imageRect.y + s.imageRect.height + TOLERANCE,
          );
          expect(hit).toBe(true);
        }
      }
    });
  });

  it("centres the image: equal leftover on opposite sides, less than a step", () => {
    forEachCase((result, { image }) => {
      const first = sheetAt(result, 0, 0);
      const last = sheetAt(result, result.rows - 1, result.cols - 1);
      const leftX = -first.rect.x;
      const rightX = last.rect.x + last.rect.width - image.width;
      const topY = -first.rect.y;
      const bottomY = last.rect.y + last.rect.height - image.height;
      expect(Math.abs(leftX - rightX)).toBeLessThan(TOLERANCE);
      expect(Math.abs(topY - bottomY)).toBeLessThan(TOLERANCE);
      expect(leftX).toBeGreaterThan(-TOLERANCE);
      expect(topY).toBeGreaterThan(-TOLERANCE);
      // Fewer sheets could not have covered the image: leftover is under one step per axis.
      // With a single sheet on an axis the bound is the sheet itself, not a step.
      const limitX =
        (result.sheetMm.width - (result.cols > 1 ? result.overlapMm : 0)) * result.pxPerMm;
      const limitY =
        (result.sheetMm.height - (result.rows > 1 ? result.overlapMm : 0)) * result.pxPerMm;
      expect(leftX * 2).toBeLessThan(limitX);
      expect(topY * 2).toBeLessThan(limitY);
    });
  });

  it("keeps imageRect inside both the image and its sheet, never empty", () => {
    forEachCase((result, { image }) => {
      for (const { rect, imageRect } of result.sheets) {
        expect(imageRect.width).toBeGreaterThan(0);
        expect(imageRect.height).toBeGreaterThan(0);
        expect(imageRect.x).toBeGreaterThanOrEqual(0);
        expect(imageRect.y).toBeGreaterThanOrEqual(0);
        expect(imageRect.x + imageRect.width).toBeLessThanOrEqual(image.width);
        expect(imageRect.y + imageRect.height).toBeLessThanOrEqual(image.height);
        expect(imageRect.x).toBeGreaterThanOrEqual(rect.x - TOLERANCE);
        expect(imageRect.y).toBeGreaterThanOrEqual(rect.y - TOLERANCE);
        expect(imageRect.x + imageRect.width).toBeLessThanOrEqual(rect.x + rect.width + TOLERANCE);
        expect(imageRect.y + imageRect.height).toBeLessThanOrEqual(
          rect.y + rect.height + TOLERANCE,
        );
      }
    });
  });

  it("tiles the image exactly with the imageRects when overlap is 0", () => {
    forEachCase((result, { image, cfg }) => {
      if (cfg.overlapMm !== 0) return;
      const area = result.sheets.reduce(
        (sum, s) => sum + s.imageRect.width * s.imageRect.height,
        0,
      );
      expect(area).toBeCloseTo(image.width * image.height, 3);
    });
  });

  it("numbers sheets like computeTiles: by rows, left to right, row letter + column", () => {
    forEachCase((result) => {
      expect(result.sheets).toHaveLength(result.count);
      expect(result.count).toBe(result.rows * result.cols);
      result.sheets.forEach((sheet, index) => {
        expect(sheet.row).toBe(Math.floor(index / result.cols));
        expect(sheet.col).toBe(index % result.cols);
        expect(sheet.id).toBe(`${String.fromCharCode(65 + sheet.row)}${sheet.col + 1}`);
      });
    });
  });

  it("uses the smallest grid that covers the drawing", () => {
    forEachCase((result) => {
      const { width, height } = result.sheetMm;
      const step = (sheet: number) => sheet - result.overlapMm;
      // n sheets cover sheet + (n - 1) * step; n - 1 sheets must have fallen short.
      const spanX = (n: number) => width + (n - 1) * step(width);
      const spanY = (n: number) => height + (n - 1) * step(height);
      expect(spanX(result.cols)).toBeGreaterThanOrEqual(result.imageMm.width - 1e-6);
      expect(spanY(result.rows)).toBeGreaterThanOrEqual(result.imageMm.height - 1e-6);
      if (result.cols > 1) expect(spanX(result.cols - 1)).toBeLessThan(result.imageMm.width);
      if (result.rows > 1) expect(spanY(result.rows - 1)).toBeLessThan(result.imageMm.height);
    });
  });

  it("scales consistently: mmPerPx * pxPerMm = 1 and width matches widthCm", () => {
    forEachCase((result, { image, cfg }) => {
      expect(result.mmPerPx * result.pxPerMm).toBeCloseTo(1, 12);
      expect(result.mmPerPx * image.width).toBeCloseTo(cfg.widthCm * 10, 9);
      expect(result.imageMm.width).toBeCloseTo(cfg.widthCm * 10, 9);
      expect(result.imageMm.height).toBeCloseTo(image.height * result.mmPerPx, 9);
    });
  });
});

describe("computePaperTiles errors", () => {
  const image = { width: 1000, height: 800 };
  const valid = config("A4", "portrait", 30, 5);

  it("rejects an invalid image", () => {
    for (const bad of [
      { width: 0, height: 10 },
      { width: 10, height: -1 },
      { width: 10.5, height: 10 },
      { width: Number.NaN, height: 10 },
    ]) {
      expect(() => computePaperTiles(bad, valid)).toThrow(/^computePaperTiles: invalid input/);
    }
  });

  it("rejects an invalid config", () => {
    const bad: unknown[] = [
      { ...valid, widthCm: 0 },
      { ...valid, widthCm: -5 },
      { ...valid, widthCm: Number.NaN },
      { ...valid, widthCm: Number.POSITIVE_INFINITY },
      { ...valid, overlapMm: -1 },
      { ...valid, overlapMm: Number.NaN },
      { ...valid, paper: "A5" },
      { ...valid, orientation: "square" },
      { paper: "A4", orientation: "portrait" },
    ];
    for (const cfg of bad) {
      expect(() => computePaperTiles(image, cfg as PaperSplitConfig)).toThrow(
        /^computePaperTiles: invalid input/,
      );
    }
  });

  it("throws a helpful error when columns exceed the limit", () => {
    // 10 m wide on A4 portrait = 48 columns.
    expect(() => computePaperTiles(image, config("A4", "portrait", 1000))).toThrow(
      /^computePaperTiles: 1000 cm wide needs \d+ columns of A4 portrait, but the limit is 10\. Use a width of at most \d/,
    );
  });

  it("throws a helpful error when rows exceed the limit", () => {
    expect(() =>
      computePaperTiles({ width: 100, height: 5000 }, config("A4", "portrait", 100)),
    ).toThrow(/^computePaperTiles: 100 cm wide needs 169 rows of A4 portrait, but the limit is 10/);
  });

  it("suggests a width that actually works", () => {
    const tooBig = config("A4", "portrait", 500, 10);
    let message = "";
    try {
      computePaperTiles(image, tooBig);
    } catch (error) {
      message = String(error);
    }
    const match = /at most ([\d.]+) cm/.exec(message);
    expect(match).not.toBeNull();
    const suggested = Number(match?.[1]);
    const result = computePaperTiles(image, { ...tooBig, widthCm: suggested });
    expect(result.cols).toBeLessThanOrEqual(MAX_SPLIT);
    expect(result.rows).toBeLessThanOrEqual(MAX_SPLIT);
  });

  it("accepts exactly MAX_SPLIT sheets on an axis", () => {
    // 10 A4 portrait columns with no overlap = 2100 mm.
    const result = computePaperTiles({ width: 2100, height: 297 }, config("A4", "portrait", 210));
    expect(result.cols).toBe(MAX_SPLIT);
    expect(result.rows).toBe(1);
  });
});
