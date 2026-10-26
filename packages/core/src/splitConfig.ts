import { maxOverlapPx, shortestTileSide } from "./computeTiles";
import type { Orientation, PaperSize, PaperSplitConfig, Rect, SplitConfig } from "./models";
import { computePaperTiles, isPaperGridTooLargeError, type PaperTiles } from "./paperSplit";
import { splitTiles } from "./splitTiles";

/** Overlap the splitter opens with: enough to match one sheet against the next. */
export const DEFAULT_OVERLAP_PERCENT = 8;

/** Largest overlap the splitter offers: half of a tile's shortest side, the cap of computeTiles. */
export const MAX_OVERLAP_PERCENT = 50;

/** Quick grids of the splitter, as rows × cols. */
export const SPLIT_PRESETS = [
  { rows: 1, cols: 2 },
  { rows: 2, cols: 2 },
  { rows: 2, cols: 3 },
  { rows: 3, cols: 3 },
  { rows: 4, cols: 4 },
] as const satisfies readonly { rows: number; cols: number }[];

/** Width a split by paper size opens with: two A4 sheets across, less the default overlap. */
export const DEFAULT_PAPER_WIDTH_CM = 41;

/** Overlap between sheets a split by paper size opens with, in mm. */
export const DEFAULT_PAPER_OVERLAP_MM = 10;

type Image = { width: number; height: number };

export type SplitEdges = "flush" | "extended";

/** «Manual» cuts the picture in rows × cols; «paper» lays real sheets over it. */
export type SplitMode = "manual" | "paper";

/**
 * What the splitter screen edits. Unlike SplitConfig it keeps the overlap as a percentage of a
 * tile and remembers it while the cut is flush (or there is no cut yet, 1×1), so going back to
 * «Bordes extendidos» or to a bigger grid brings the same thickness back, for as long as the
 * screen stays open: only `overlapPx` is stored, so a reopened flush split starts from the default.
 * It holds both modes at once, so switching from one to the other and back loses nothing.
 */
export type SplitDraft = {
  mode: SplitMode;
  rows: number;
  cols: number;
  edges: SplitEdges;
  /** 0..MAX_OVERLAP_PERCENT of the shortest tile side on the cut axes. */
  overlapPercent: number;
  showOverlapTint: boolean;
  /** Mode «paper»: the sheet, its orientation, the final width of the drawing and the overlap. */
  paper: PaperSize;
  orientation: Orientation;
  widthCm: number;
  overlapMm: number;
};

/** Overlap in image px for `percent` of a tile's shortest side, never above computeTiles's cap. */
export function overlapPxForPercent(
  image: Image,
  rows: number,
  cols: number,
  percent: number,
): number {
  const side = shortestTileSide(image, rows, cols);
  const px = Math.round((side * percent) / 100);
  return Math.max(0, Math.min(px, maxOverlapPx(image, rows, cols)));
}

/** The reverse of {@link overlapPxForPercent}: `px` as a whole percent of a tile's shortest side. */
export function overlapPercent(image: Image, rows: number, cols: number, px: number): number {
  const side = shortestTileSide(image, rows, cols);
  if (side === 0) return 0;
  return Math.min(MAX_OVERLAP_PERCENT, Math.round((px / side) * 100));
}

/** The splitter of a new project: manual 2×2 with 8 % extended edges and the tint on; A4 upright as paper. */
export function defaultSplitDraft(): SplitDraft {
  return {
    mode: "manual",
    rows: 2,
    cols: 2,
    edges: "extended",
    overlapPercent: DEFAULT_OVERLAP_PERCENT,
    showOverlapTint: true,
    paper: "A4",
    orientation: "portrait",
    widthCm: DEFAULT_PAPER_WIDTH_CM,
    overlapMm: DEFAULT_PAPER_OVERLAP_MM,
  };
}

/** The draft a saved config reopens as. «Extended» is simply `overlapPx > 0`. */
export function draftFromConfig(image: Image, config: SplitConfig): SplitDraft {
  const extended = config.overlapPx > 0;
  const percent = extended
    ? overlapPercent(image, config.rows, config.cols, config.overlapPx)
    : DEFAULT_OVERLAP_PERCENT;
  return {
    mode: config.paper === undefined ? "manual" : "paper",
    rows: config.rows,
    cols: config.cols,
    edges: extended ? "extended" : "flush",
    overlapPercent: percent > 0 ? percent : DEFAULT_OVERLAP_PERCENT,
    showOverlapTint: config.showOverlapTint,
    paper: config.paper?.paper ?? "A4",
    orientation: config.paper?.orientation ?? "portrait",
    widthCm: config.paper?.widthCm ?? DEFAULT_PAPER_WIDTH_CM,
    overlapMm: config.paper?.overlapMm ?? DEFAULT_PAPER_OVERLAP_MM,
  };
}

/** The manual config of a draft, whatever its mode: flush (or 1×1) is `overlapPx: 0`. */
export function configFromDraft(image: Image, draft: SplitDraft): SplitConfig {
  const overlapPx =
    draft.edges === "extended"
      ? overlapPxForPercent(image, draft.rows, draft.cols, draft.overlapPercent)
      : 0;
  return {
    rows: draft.rows,
    cols: draft.cols,
    overlapPx,
    showOverlapTint: draft.showOverlapTint,
  };
}

/** What the draft stores and draws, or why a split by paper size does not fit. */
export type SplitPlan =
  | {
      ok: true;
      config: SplitConfig;
      /** The sheets, in mode «paper». */
      sheets: PaperTiles | null;
    }
  | {
      ok: false;
      /** The axis that needs more than `MAX_SPLIT` sheets. */
      axis: "columns" | "rows";
      /** Sheets that axis needs. */
      needed: number;
      /** Widest drawing in cm that fits; 0 = none on this paper. */
      maxWidthCm: number;
    };

/**
 * The config of a draft. Manual: `configFromDraft`. Paper: `computePaperTiles` decides the grid,
 * and `rows`, `cols` and `overlapPx` are stored from it (the sheets are the source of truth, those
 * three keep everything that only needs the grid working). A drawing too big for 10 sheets on an
 * axis is not a failure: it comes back as `ok: false`, to be shown, and nothing is stored.
 */
export function splitPlan(image: Image, draft: SplitDraft): SplitPlan {
  if (draft.mode === "manual") {
    return { ok: true, config: configFromDraft(image, draft), sheets: null };
  }
  const paper: PaperSplitConfig = {
    paper: draft.paper,
    orientation: draft.orientation,
    widthCm: draft.widthCm,
    overlapMm: draft.overlapMm,
  };
  try {
    const sheets = computePaperTiles(image, paper);
    return {
      ok: true,
      config: {
        rows: sheets.rows,
        cols: sheets.cols,
        overlapPx: Math.round(sheets.overlapMm * sheets.pxPerMm),
        showOverlapTint: draft.showOverlapTint,
        paper,
      },
      sheets,
    };
  } catch (error) {
    if (!isPaperGridTooLargeError(error)) throw error;
    return { ok: false, axis: error.axis, needed: error.needed, maxWidthCm: error.maxWidthCm };
  }
}

/** The size of the whole drawing and the number of sheets: «Mural de 84 × 59,4 cm · 6 folios». */
export function paperSummary(sheets: PaperTiles): {
  widthCm: number;
  heightCm: number;
  count: number;
} {
  return {
    widthCm: Math.round(sheets.imageMm.width) / 10,
    heightCm: Math.round(sheets.imageMm.height) / 10,
    count: sheets.count,
  };
}

/** Number of sheets the split makes. */
export function sheetCount(config: Pick<SplitConfig, "rows" | "cols">): number {
  return config.rows * config.cols;
}

/** True when the grid cuts the image at all (anything but 1×1): only then does an overlap exist. */
export function hasCuts(config: Pick<SplitConfig, "rows" | "cols">): boolean {
  return config.rows > 1 || config.cols > 1;
}

/** True when `id` («A1», «B3») names a tile of a rows × cols grid. */
export function isTileInGrid(config: Pick<SplitConfig, "rows" | "cols">, id: string): boolean {
  const match = /^([A-Z])([1-9]\d*)$/.exec(id);
  if (match === null) return false;
  const row = (match[1] ?? "").charCodeAt(0) - "A".charCodeAt(0);
  const col = Number(match[2]);
  return row < config.rows && col <= config.cols;
}

/** The tile the splitter has picked: the saved one while it still exists in the grid, else A1. */
export function pickedTileId(
  config: Pick<SplitConfig, "rows" | "cols">,
  currentTileId: string | undefined,
): string {
  return currentTileId !== undefined && isTileInGrid(config, currentTileId) ? currentTileId : "A1";
}

/** Position of `id` in reading order (A1 = 0, A2 = 1, … B1 = `cols`, …). `id` must be in the grid. */
function tileIndex(config: Pick<SplitConfig, "rows" | "cols">, id: string): number {
  const row = id.charCodeAt(0) - "A".charCodeAt(0);
  const col = Number(id.slice(1)) - 1;
  return row * config.cols + col;
}

/** The id at `index` in reading order. */
function tileIdAt(config: Pick<SplitConfig, "rows" | "cols">, index: number): string {
  return `${String.fromCharCode(65 + Math.floor(index / config.cols))}${(index % config.cols) + 1}`;
}

/**
 * The tile after the picked one, in reading order (A1, A2, … B1, …), wrapping from the last back
 * to A1. A1 when none is picked or the saved one no longer exists in the grid. A 1×1 grid has only
 * A1, so it stays on it.
 */
export function nextTileId(
  config: Pick<SplitConfig, "rows" | "cols">,
  currentTileId: string | undefined,
): string {
  const index = tileIndex(config, pickedTileId(config, currentTileId));
  return tileIdAt(config, (index + 1) % sheetCount(config));
}

/**
 * The tile before the picked one, in reading order, wrapping from A1 to the last tile. A1 when none
 * is picked or the saved one no longer exists in the grid, so the previous is the last.
 */
export function previousTileId(
  config: Pick<SplitConfig, "rows" | "cols">,
  currentTileId: string | undefined,
): string {
  const index = tileIndex(config, pickedTileId(config, currentTileId));
  const count = sheetCount(config);
  return tileIdAt(config, (index + count - 1) % count);
}

/** What the camera shows of a split project: one tile of the image, as the image it traces. */
export type CameraCrop = {
  /** The tile's final crop, in image px (extended edges included). */
  rect: Rect;
  /** The flush crop, in px relative to `rect`: what is outside it is the neighbour's strip. */
  core: Rect;
  /** Which tile this is: the picked one, or A1. */
  tileId: string;
};

/**
 * The part of the image the camera shows: the picked tile of the project's split (A1 while none is
 * picked or the saved one no longer exists). `null` for a project that was never split: the camera
 * shows the whole image. A 1×1 split is the whole image as one tile. For a split by paper size the
 * crop is the sheet itself: `rect` can start before the image or end past it (that part is blank).
 * Throws like `splitTiles` for an image too small for the grid.
 */
export function cameraCrop(
  image: { width: number; height: number },
  split: SplitConfig | undefined,
  currentTileId: string | undefined,
): CameraCrop | null {
  if (split === undefined) return null;
  const tileId = pickedTileId(split, currentTileId);
  const tile = splitTiles(image, split).find((t) => t.id === tileId);
  if (tile === undefined) return null;
  return {
    rect: tile.rect,
    core: {
      x: tile.coreRect.x - tile.rect.x,
      y: tile.coreRect.y - tile.rect.y,
      width: tile.coreRect.width,
      height: tile.coreRect.height,
    },
    tileId,
  };
}
