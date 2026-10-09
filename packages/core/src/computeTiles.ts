import * as z from "zod";
import {
  ImageSizeSchema,
  type Rect,
  type SplitConfig,
  SplitConfigSchema,
  type Tile,
} from "./models";

type Grid = { xs: number[]; ys: number[] };

function parseOrThrow<T>(fn: string, schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${fn}: invalid input\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Cut positions along one axis: Math.round(i * size / parts), from 0 to size. */
function boundaries(size: number, parts: number): number[] {
  return Array.from({ length: parts + 1 }, (_, i) => Math.round((i * size) / parts));
}

function validatedGrid(fn: string, image: unknown, rows: unknown, cols: unknown): Grid {
  const size = parseOrThrow(fn, ImageSizeSchema, image);
  const counts = parseOrThrow(fn, SplitConfigSchema.pick({ rows: true, cols: true }), {
    rows,
    cols,
  });
  if (size.width < counts.cols || size.height < counts.rows) {
    throw new Error(
      `${fn}: image ${size.width}×${size.height} is too small for ${counts.rows} rows × ${counts.cols} cols (needs at least 1 px per tile)`,
    );
  }
  return { xs: boundaries(size.width, counts.cols), ys: boundaries(size.height, counts.rows) };
}

function minSpan(cuts: number[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 1; i < cuts.length; i++) {
    min = Math.min(min, (cuts[i] ?? 0) - (cuts[i - 1] ?? 0));
  }
  return min;
}

function overlapLimit({ xs, ys }: Grid): number {
  const sides: number[] = [];
  if (xs.length > 2) sides.push(minSpan(xs));
  if (ys.length > 2) sides.push(minSpan(ys));
  return sides.length === 0 ? 0 : Math.floor(Math.min(...sides) / 2);
}

/**
 * Largest overlap computeTiles will apply: half of the shortest tile side, measured only
 * on the axes that are actually cut (widths if cols > 1, heights if rows > 1). 0 for 1×1.
 * Throws if the input is invalid.
 */
export function maxOverlapPx(
  image: { width: number; height: number },
  rows: number,
  cols: number,
): number {
  return overlapLimit(validatedGrid("maxOverlapPx", image, rows, cols));
}

/**
 * Splits an image into rows × cols tiles, ordered by rows, left to right.
 *
 * - `row` and `col` are 0-based; `id` is the row letter plus the 1-based column ("A1", "B3").
 * - `coreRect`s cover the image with no gaps or overlaps; boundaries are rounded with
 *   Math.round(i * size / parts).
 * - `rect` is `coreRect` extended by `overlapPx` on interior edges only (never the image
 *   border), capped at {@link maxOverlapPx}.
 *
 * Throws an Error starting with "computeTiles:" if the image or config is invalid.
 */
export function computeTiles(
  image: { width: number; height: number },
  config: SplitConfig,
): Tile[] {
  const grid = validatedGrid("computeTiles", image, config.rows, config.cols);
  const { overlapPx } = parseOrThrow("computeTiles", SplitConfigSchema, config);
  const overlap = Math.min(overlapPx, overlapLimit(grid));
  const { xs, ys } = grid;
  const rows = ys.length - 1;
  const cols = xs.length - 1;

  const tiles: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    const top = ys[row] ?? 0;
    const bottom = ys[row + 1] ?? 0;
    for (let col = 0; col < cols; col++) {
      const left = xs[col] ?? 0;
      const right = xs[col + 1] ?? 0;
      const coreRect: Rect = { x: left, y: top, width: right - left, height: bottom - top };

      const x0 = col > 0 ? left - overlap : left;
      const x1 = col < cols - 1 ? right + overlap : right;
      const y0 = row > 0 ? top - overlap : top;
      const y1 = row < rows - 1 ? bottom + overlap : bottom;
      const rect: Rect = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };

      tiles.push({ id: `${String.fromCharCode(65 + row)}${col + 1}`, row, col, rect, coreRect });
    }
  }
  return tiles;
}
