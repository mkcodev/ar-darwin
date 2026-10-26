import { computeTiles } from "./computeTiles";
import type { Rect, SplitConfig, Tile } from "./models";
import { computePaperTiles, paperSheetMm } from "./paperSplit";

type Image = { width: number; height: number };

/**
 * The tiles of a split, whichever way it was made. A manual split is `computeTiles`. A split by
 * paper size gives one tile per sheet: `rect` is the sheet's window on the image (it can start
 * before the image or end past it, where the sheet is blank) and `coreRect` is that window without
 * the strip it shares with each neighbour, so the camera and the preview tint the same thing in both
 * modes: the ring between `rect` and `coreRect`. Throws like the function it calls.
 */
export function splitTiles(image: Image, split: SplitConfig): Tile[] {
  if (split.paper === undefined) return computeTiles(image, split);
  const plan = computePaperTiles(image, split.paper);
  const overlap = plan.overlapMm * plan.pxPerMm;
  return plan.sheets.map((sheet) => {
    const { rect } = sheet;
    const left = sheet.col > 0 ? overlap : 0;
    const right = sheet.col < plan.cols - 1 ? overlap : 0;
    const top = sheet.row > 0 ? overlap : 0;
    const bottom = sheet.row < plan.rows - 1 ? overlap : 0;
    return {
      id: sheet.id,
      row: sheet.row,
      col: sheet.col,
      rect,
      coreRect: {
        x: rect.x + left,
        y: rect.y + top,
        width: rect.width - left - right,
        height: rect.height - top - bottom,
      },
    };
  });
}

/**
 * What a thumbnail of the tile shows: a manual tile's flush crop (so neighbours do not repeat their
 * strip), a sheet's whole window.
 */
export function tileThumbnailRect(split: SplitConfig, tile: Tile): Rect {
  return split.paper === undefined ? tile.coreRect : tile.rect;
}

/**
 * Width over height of the grid of tiles laid side by side: the picture's own shape for a manual
 * split, `cols` sheets by `rows` sheets for a split by paper size. The minimap and the tile picker
 * size their cells from it.
 */
export function splitGridAspect(image: Image, split: SplitConfig | undefined): number {
  if (split?.paper === undefined) return image.width / image.height;
  const sheet = paperSheetMm(split.paper.paper, split.paper.orientation);
  return (split.cols * sheet.width) / (split.rows * sheet.height);
}
