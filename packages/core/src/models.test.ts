import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORY_IDS,
  defaultCategoryKey,
  IDENTITY_TRANSFORM,
  ImageSizeSchema,
  MAX_SPLIT,
  ProjectStatusSchema,
  RectSchema,
  SplitConfigSchema,
  TransformSchema,
  ViewportSchema,
} from "./models";

describe("TransformSchema", () => {
  it("accepts the identity and a flipped, rotated transform", () => {
    expect(TransformSchema.safeParse(IDENTITY_TRANSFORM).success).toBe(true);
    const flipped = { x: -40, y: 1200.5, scale: 0.01, rotation: -179.9, flipX: true, flipY: true };
    expect(TransformSchema.safeParse(flipped).success).toBe(true);
  });

  it.each([
    ["zero scale", { scale: 0 }],
    ["negative scale", { scale: -1 }],
    ["NaN position", { x: Number.NaN }],
    ["infinite position", { y: Number.POSITIVE_INFINITY }],
    ["infinite scale", { scale: Number.POSITIVE_INFINITY }],
    ["NaN rotation", { rotation: Number.NaN }],
    ["flip as a number", { flipX: 1 }],
    ["missing flipY", { flipY: undefined }],
  ])("rejects %s", (_, patch) => {
    expect(TransformSchema.safeParse({ ...IDENTITY_TRANSFORM, ...patch }).success).toBe(false);
  });
});

describe("SplitConfigSchema", () => {
  const split = { rows: 2, cols: 3, overlapPx: 0, showOverlapTint: false };

  it("accepts 1 × 1 up to MAX_SPLIT × MAX_SPLIT, with or without overlap", () => {
    expect(SplitConfigSchema.safeParse({ ...split, rows: 1, cols: 1 }).success).toBe(true);
    expect(
      SplitConfigSchema.safeParse({ ...split, rows: MAX_SPLIT, cols: MAX_SPLIT, overlapPx: 40 })
        .success,
    ).toBe(true);
  });

  it.each([
    ["0 rows", { rows: 0 }],
    ["more rows than MAX_SPLIT", { rows: MAX_SPLIT + 1 }],
    ["more cols than MAX_SPLIT", { cols: MAX_SPLIT + 1 }],
    ["fractional cols", { cols: 1.5 }],
    ["negative overlap", { overlapPx: -1 }],
    ["fractional overlap", { overlapPx: 0.5 }],
  ])("rejects %s", (_, patch) => {
    expect(SplitConfigSchema.safeParse({ ...split, ...patch }).success).toBe(false);
  });
});

describe("ImageSizeSchema / ViewportSchema", () => {
  it("image sizes are positive integers", () => {
    expect(ImageSizeSchema.safeParse({ width: 4096, height: 1 }).success).toBe(true);
    expect(ImageSizeSchema.safeParse({ width: 0, height: 10 }).success).toBe(false);
    expect(ImageSizeSchema.safeParse({ width: 10.5, height: 10 }).success).toBe(false);
  });

  it("viewports are positive but may be fractional", () => {
    expect(ViewportSchema.safeParse({ width: 392.7, height: 803.3 }).success).toBe(true);
    expect(ViewportSchema.safeParse({ width: 0, height: 800 }).success).toBe(false);
    expect(ViewportSchema.safeParse({ width: 400, height: -1 }).success).toBe(false);
  });
});

describe("RectSchema", () => {
  it("takes any finite numbers, negative origin included", () => {
    expect(RectSchema.safeParse({ x: -10, y: 0, width: 20.5, height: 3 }).success).toBe(true);
    expect(RectSchema.safeParse({ x: 0, y: 0, width: 1 }).success).toBe(false);
  });
});

describe("ProjectStatusSchema", () => {
  it("knows exactly pending, in_progress and done", () => {
    expect(ProjectStatusSchema.options).toEqual(["pending", "in_progress", "done"]);
    expect(ProjectStatusSchema.safeParse("In_progress").success).toBe(false);
  });
});

describe("defaultCategoryKey", () => {
  it("maps every built-in category to its i18n key", () => {
    for (const id of DEFAULT_CATEGORY_IDS) {
      expect(defaultCategoryKey(id)).toBe(`categories.${id}`);
    }
  });
});
