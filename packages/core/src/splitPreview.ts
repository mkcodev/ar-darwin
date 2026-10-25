import { computeTiles, maxOverlapPx } from "./computeTiles";
import type { Rect, Size, SplitConfig } from "./models";

export type ScreenPoint = { x: number; y: number };

export type PreviewTile = {
  id: string;
  row: number;
  col: number;
  /** Final crop on screen, with the tiles joined (the image where it would sit, uncut). */
  rect: Rect;
  /** Flush crop on screen, joined. */
  coreRect: Rect;
  /** Where the tile ends up once separated: add it to `rect` and `coreRect`. */
  offset: ScreenPoint;
};

export type SplitPreviewLayout = {
  /** Screen px per image px. */
  scale: number;
  /** Top-left of the joined image in the frame. */
  origin: ScreenPoint;
  /** Distance between the origins of two neighbouring tiles once separated. */
  gap: number;
  rows: number;
  cols: number;
  tiles: PreviewTile[];
};

/**
 * Lays the split out inside `frame` for the splitter's preview. The scale fits the image with
 * its tiles *separated* (a gap of `tileGap` screen px between crops, plus twice the overlap so
 * each tinted strip reads as a band of its own), so the separated state never leaves the frame
 * and the joined one sits centred inside it. Throws like computeTiles for an invalid split.
 */
export function splitPreviewLayout(
  image: { width: number; height: number },
  config: SplitConfig,
  frame: Size,
  tileGap: number,
): SplitPreviewLayout {
  const tiles = computeTiles(image, config);
  const overlap = Math.min(config.overlapPx, maxOverlapPx(image, config.rows, config.cols));
  const fitW =
    (frame.width - (config.cols - 1) * tileGap) / (image.width + 2 * (config.cols - 1) * overlap);
  const fitH =
    (frame.height - (config.rows - 1) * tileGap) / (image.height + 2 * (config.rows - 1) * overlap);
  const scale = Math.max(Math.min(fitW, fitH), 0);
  const gap = tileGap + 2 * overlap * scale;
  const origin = {
    x: (frame.width - image.width * scale) / 2,
    y: (frame.height - image.height * scale) / 2,
  };
  const toScreen = (r: Rect): Rect => ({
    x: origin.x + r.x * scale,
    y: origin.y + r.y * scale,
    width: r.width * scale,
    height: r.height * scale,
  });
  return {
    scale,
    origin,
    gap,
    rows: config.rows,
    cols: config.cols,
    tiles: tiles.map((tile) => ({
      id: tile.id,
      row: tile.row,
      col: tile.col,
      rect: toScreen(tile.rect),
      coreRect: toScreen(tile.coreRect),
      offset: {
        x: (tile.col - (config.cols - 1) / 2) * gap,
        y: (tile.row - (config.rows - 1) / 2) * gap,
      },
    })),
  };
}

/** Centre of a tile's crop once separated, in frame px. */
export function separatedCenter(tile: PreviewTile): ScreenPoint {
  return {
    x: tile.rect.x + tile.rect.width / 2 + tile.offset.x,
    y: tile.rect.y + tile.rect.height / 2 + tile.offset.y,
  };
}

/** Id of the tile under `point` (frame px) once separated, or null in the gaps. */
export function tileAtPoint(layout: SplitPreviewLayout, point: ScreenPoint): string | null {
  // Reverse order: the tile drawn last is on top.
  for (let i = layout.tiles.length - 1; i >= 0; i--) {
    const tile = layout.tiles[i];
    if (tile === undefined) continue;
    const x = tile.rect.x + tile.offset.x;
    const y = tile.rect.y + tile.offset.y;
    if (
      point.x >= x &&
      point.x <= x + tile.rect.width &&
      point.y >= y &&
      point.y <= y + tile.rect.height
    ) {
      return tile.id;
    }
  }
  return null;
}
