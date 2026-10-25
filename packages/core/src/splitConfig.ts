import { computeTiles, maxOverlapPx, shortestTileSide } from "./computeTiles";
import type { Rect, SplitConfig } from "./models";

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

type Image = { width: number; height: number };

export type SplitEdges = "flush" | "extended";

/**
 * What the splitter screen edits. Unlike SplitConfig it keeps the overlap as a percentage of a
 * tile and remembers it while the cut is flush (or there is no cut yet, 1×1), so going back to
 * «Bordes extendidos» or to a bigger grid brings the same thickness back, for as long as the
 * screen stays open: only `overlapPx` is stored, so a reopened flush split starts from the default.
 */
export type SplitDraft = {
  rows: number;
  cols: number;
  edges: SplitEdges;
  /** 0..MAX_OVERLAP_PERCENT of the shortest tile side on the cut axes. */
  overlapPercent: number;
  showOverlapTint: boolean;
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

/** A new project's splitter: 2×2 with 8 % extended edges and the tint on. */
export function defaultSplitDraft(): SplitDraft {
  return {
    rows: 2,
    cols: 2,
    edges: "extended",
    overlapPercent: DEFAULT_OVERLAP_PERCENT,
    showOverlapTint: true,
  };
}

/** The draft a saved config reopens as. «Extended» is simply `overlapPx > 0`. */
export function draftFromConfig(image: Image, config: SplitConfig): SplitDraft {
  const extended = config.overlapPx > 0;
  const percent = extended
    ? overlapPercent(image, config.rows, config.cols, config.overlapPx)
    : DEFAULT_OVERLAP_PERCENT;
  return {
    rows: config.rows,
    cols: config.cols,
    edges: extended ? "extended" : "flush",
    overlapPercent: percent > 0 ? percent : DEFAULT_OVERLAP_PERCENT,
    showOverlapTint: config.showOverlapTint,
  };
}

/** The config to store and to draw: flush (or 1×1) is `overlapPx: 0`. */
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

/**
 * The tile after the picked one, in reading order (A1, A2, … B1, …), wrapping from the last back
 * to A1. A1 when none is picked or the saved one no longer exists in the grid. A 1×1 grid has only
 * A1, so it stays on it.
 */
export function nextTileId(
  config: Pick<SplitConfig, "rows" | "cols">,
  currentTileId: string | undefined,
): string {
  const picked = pickedTileId(config, currentTileId);
  const row = picked.charCodeAt(0) - "A".charCodeAt(0);
  const col = Number(picked.slice(1)) - 1;
  const next = (row * config.cols + col + 1) % sheetCount(config);
  const nextRow = Math.floor(next / config.cols);
  return `${String.fromCharCode(65 + nextRow)}${(next % config.cols) + 1}`;
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
 * shows the whole image. A 1×1 split is the whole image as one tile. Throws like computeTiles for
 * an image too small for the grid.
 */
export function cameraCrop(
  image: { width: number; height: number },
  split: SplitConfig | undefined,
  currentTileId: string | undefined,
): CameraCrop | null {
  if (split === undefined) return null;
  const tileId = pickedTileId(split, currentTileId);
  const tile = computeTiles(image, split).find((t) => t.id === tileId);
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
