import * as z from "zod";
import {
  ImageSizeSchema,
  MAX_SPLIT,
  type Orientation,
  OrientationSchema,
  type PaperSize,
  PaperSizeSchema,
  type PaperSplitConfig,
  PaperSplitConfigSchema,
  type Rect,
} from "./models";

/** Sheet sizes in mm, portrait (width × height). */
export const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
} as const;

export type PaperSheet = {
  /** Row letter + 1-based column number, same as computeTiles: "A1", "A2", "B1"... */
  id: string;
  /** 0-based row index. */
  row: number;
  /** 0-based column index. */
  col: number;
  /** The sheet window in image px. Has the paper's proportion; may extend past the image. */
  rect: Rect;
  /** `rect` clipped to the image: where the photo actually is on this sheet. */
  imageRect: Rect;
};

export type PaperTiles = {
  /** Ordered by rows, left to right. */
  sheets: PaperSheet[];
  rows: number;
  cols: number;
  /** rows * cols. */
  count: number;
  /** Real size of one image px, in mm. */
  mmPerPx: number;
  /** Image px per real mm. */
  pxPerMm: number;
  /** Overlap actually applied: the requested one, capped at {@link maxPaperOverlapMm}. */
  overlapMm: number;
  /** One sheet in mm, already rotated by the orientation. */
  sheetMm: { width: number; height: number };
  /** The whole drawing in mm. */
  imageMm: { width: number; height: number };
};

/** Relative slack for "does it fit exactly" when counting sheets. */
const FIT_EPSILON = 1e-9;

function parseOrThrow<T>(fn: string, schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${fn}: invalid input\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function sheetSizeMm(
  paper: PaperSize,
  orientation: Orientation,
): { width: number; height: number } {
  const { width, height } = PAPER_SIZES[paper];
  return orientation === "portrait" ? { width, height } : { width: height, height: width };
}

/** Sheets needed along one axis so that n sheets, `overlap` apart, cover `total`. */
function axisSheetCount(total: number, sheet: number, overlap: number): number {
  const step = sheet - overlap;
  const extra = (total - sheet) / step;
  if (extra <= FIT_EPSILON) return 1;
  return 1 + Math.ceil(extra - FIT_EPSILON * Math.max(1, extra));
}

/** Largest span n sheets cover along one axis. */
function spanMm(count: number, sheet: number, overlap: number): number {
  return count * sheet - (count - 1) * overlap;
}

/**
 * Largest overlap computePaperTiles will apply: half of the sheet's shortest side, in mm.
 * Throws an Error starting with "maxPaperOverlapMm:" if the input is invalid.
 */
export function maxPaperOverlapMm(paper: PaperSize, orientation: Orientation): number {
  const fn = "maxPaperOverlapMm";
  const sheet = sheetSizeMm(
    parseOrThrow(fn, PaperSizeSchema, paper),
    parseOrThrow(fn, OrientationSchema, orientation),
  );
  return Math.min(sheet.width, sheet.height) / 2;
}

/** `PaperGridTooLargeError.code`: stable tag that survives a bundler that breaks `instanceof`. */
export const PAPER_GRID_TOO_LARGE_CODE = "PAPER_GRID_TOO_LARGE";

/**
 * The drawing at the requested width would need more than {@link MAX_SPLIT} sheets on an axis. The
 * screen turns the fields into its own warning; `message` is the English text for logs and tests.
 */
export class PaperGridTooLargeError extends Error {
  readonly code = PAPER_GRID_TOO_LARGE_CODE;

  constructor(
    message: string,
    /** The axis that overflows. */
    readonly axis: "columns" | "rows",
    /** Sheets that axis would need. */
    readonly needed: number,
    /** Widest drawing (cm, 0.1 steps) that still fits {@link MAX_SPLIT} sheets each way; 0 = none. */
    readonly maxWidthCm: number,
  ) {
    super(message);
    this.name = "PaperGridTooLargeError";
    // Subclassing Error can lose the prototype when a transform turns classes into functions.
    Object.setPrototypeOf(this, PaperGridTooLargeError.prototype);
  }
}

/** True for a `PaperGridTooLargeError`, also if it crossed a boundary that broke `instanceof`. */
export function isPaperGridTooLargeError(error: unknown): error is PaperGridTooLargeError {
  if (error instanceof PaperGridTooLargeError) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === PAPER_GRID_TOO_LARGE_CODE
  );
}

function tooManySheetsError(
  axis: "columns" | "rows",
  needed: number,
  config: PaperSplitConfig,
  image: { width: number; height: number },
  sheet: { width: number; height: number },
  overlap: number,
): PaperGridTooLargeError {
  // Widest drawing (cm) that still fits MAX_SPLIT × MAX_SPLIT sheets, for this image's shape.
  const byWidth = spanMm(MAX_SPLIT, sheet.width, overlap);
  const byHeight = (spanMm(MAX_SPLIT, sheet.height, overlap) * image.width) / image.height;
  const maxWidthCm = Math.floor(Math.min(byWidth, byHeight)) / 10;
  const advice =
    maxWidthCm > 0
      ? `Use a width of at most ${maxWidthCm} cm`
      : "No width fits an image this elongated on this paper";
  const options =
    overlap > 0
      ? "less overlap, a bigger sheet or another orientation"
      : "a bigger sheet or another orientation";
  return new PaperGridTooLargeError(
    `computePaperTiles: ${config.widthCm} cm wide needs ${needed} ${axis} of ${config.paper} ${config.orientation}, but the limit is ${MAX_SPLIT}. ${advice}, ${options}`,
    axis,
    needed,
    maxWidthCm,
  );
}

/**
 * Splits an image into real paper sheets for tracing it at actual size.
 *
 * - The drawing is `widthCm` wide in total (height follows the image's aspect ratio), so one
 *   image px is `mmPerPx` mm. Sheets are laid out in a grid with `overlapMm` shared between
 *   neighbours and the image is centred on it: the leftover blank space is split equally on
 *   both sides, per axis.
 * - Every `rect` has the paper's proportion and is measured in image px; it may start below 0
 *   or end past the image size. `imageRect` is the part of it that lies on the image.
 * - Order, `row`, `col` and `id` follow computeTiles (rows, left to right; "A1", "B3"...).
 * - `overlapMm` is capped at {@link maxPaperOverlapMm}; the applied value is in the result.
 * - Sheets are the full paper: no printable margins are subtracted.
 *
 * Throws an Error starting with "computePaperTiles:" if the input is invalid or the grid
 * would need more than MAX_SPLIT sheets on either axis.
 */
export function computePaperTiles(
  image: { width: number; height: number },
  config: PaperSplitConfig,
): PaperTiles {
  const fn = "computePaperTiles";
  const size = parseOrThrow(fn, ImageSizeSchema, image);
  const parsed = parseOrThrow(fn, PaperSplitConfigSchema, config);

  const sheet = sheetSizeMm(parsed.paper, parsed.orientation);
  const overlap = Math.min(parsed.overlapMm, maxPaperOverlapMm(parsed.paper, parsed.orientation));

  const imageWidthMm = parsed.widthCm * 10;
  const mmPerPx = imageWidthMm / size.width;
  const pxPerMm = size.width / imageWidthMm;
  const imageMm = { width: imageWidthMm, height: size.height * mmPerPx };

  const cols = axisSheetCount(imageMm.width, sheet.width, overlap);
  const rows = axisSheetCount(imageMm.height, sheet.height, overlap);
  if (cols > MAX_SPLIT) {
    throw tooManySheetsError("columns", cols, parsed, size, sheet, overlap);
  }
  if (rows > MAX_SPLIT) {
    throw tooManySheetsError("rows", rows, parsed, size, sheet, overlap);
  }

  // The grid is at least as big as the image; the surplus is split between both sides.
  const offsetX = Math.max(0, spanMm(cols, sheet.width, overlap) - imageMm.width) / 2;
  const offsetY = Math.max(0, spanMm(rows, sheet.height, overlap) - imageMm.height) / 2;
  const stepX = sheet.width - overlap;
  const stepY = sheet.height - overlap;
  const sheetWidthPx = sheet.width * pxPerMm;
  const sheetHeightPx = sheet.height * pxPerMm;

  const sheets: PaperSheet[] = [];
  for (let row = 0; row < rows; row++) {
    const y = (row * stepY - offsetY) * pxPerMm;
    for (let col = 0; col < cols; col++) {
      const x = (col * stepX - offsetX) * pxPerMm;
      const rect: Rect = { x, y, width: sheetWidthPx, height: sheetHeightPx };
      const left = Math.max(x, 0);
      const top = Math.max(y, 0);
      const right = Math.min(x + sheetWidthPx, size.width);
      const bottom = Math.min(y + sheetHeightPx, size.height);
      const imageRect: Rect = { x: left, y: top, width: right - left, height: bottom - top };
      sheets.push({ id: `${String.fromCharCode(65 + row)}${col + 1}`, row, col, rect, imageRect });
    }
  }

  return {
    sheets,
    rows,
    cols,
    count: rows * cols,
    mmPerPx,
    pxPerMm,
    overlapMm: overlap,
    sheetMm: sheet,
    imageMm,
  };
}
