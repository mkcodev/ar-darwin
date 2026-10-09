import * as z from "zod";

export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type Rect = z.infer<typeof RectSchema>;

export const ImageSizeSchema = z.object({
  width: z.int().positive(),
  height: z.int().positive(),
});
export type ImageSize = z.infer<typeof ImageSizeSchema>;

export const MAX_SPLIT = 10;

export const SplitConfigSchema = z.object({
  rows: z.int().min(1).max(MAX_SPLIT),
  cols: z.int().min(1).max(MAX_SPLIT),
  /** Extra pixels each tile takes from its neighbours. 0 = flush cut. */
  overlapPx: z.int().nonnegative(),
  showOverlapTint: z.boolean(),
});
export type SplitConfig = z.infer<typeof SplitConfigSchema>;

export type Tile = {
  /** Row letter + 1-based column number: "A1", "A2", "B1"... */
  id: string;
  /** 0-based row index. */
  row: number;
  /** 0-based column index. */
  col: number;
  /** Final crop: coreRect extended by the overlap on interior edges only. */
  rect: Rect;
  /** Flush crop, no overlap. All coreRects tile the image exactly. */
  coreRect: Rect;
};
