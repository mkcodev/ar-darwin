import { computeTiles, maxOverlapPx } from "./computeTiles";
import type { Rect, Size, SplitConfig } from "./models";
import { computePaperTiles } from "./paperSplit";
import { splitTiles } from "./splitTiles";

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
  /** A split by paper size: the tiles are sheets, which can reach past the image. */
  paper: boolean;
  tiles: PreviewTile[];
};

/**
 * The preview of a split by paper size. The scale fits the sheets *separated* (`tileGap` screen px
 * between them), and the grid of sheets, not the image, is what sits centred in the frame: the image
 * is placed on it wherever `computePaperTiles` put it. Neighbouring sheets overlap when joined, so
 * pulling them apart by `tileGap` plus the overlap leaves exactly `tileGap` between them.
 */
function paperPreviewLayout(
  image: { width: number; height: number },
  config: SplitConfig,
  paper: NonNullable<SplitConfig["paper"]>,
  frame: Size,
  tileGap: number,
): SplitPreviewLayout {
  const plan = computePaperTiles(image, paper);
  const tiles = splitTiles(image, config);
  const sheetW = plan.sheetMm.width * plan.pxPerMm;
  const sheetH = plan.sheetMm.height * plan.pxPerMm;
  const overlap = plan.overlapMm * plan.pxPerMm;
  const fitW = (frame.width - (plan.cols - 1) * tileGap) / (plan.cols * sheetW);
  const fitH = (frame.height - (plan.rows - 1) * tileGap) / (plan.rows * sheetH);
  const scale = Math.max(Math.min(fitW, fitH), 0);
  const gap = tileGap + overlap * scale;
  const spanW = plan.cols * sheetW - (plan.cols - 1) * overlap;
  const spanH = plan.rows * sheetH - (plan.rows - 1) * overlap;
  const first = plan.sheets[0]?.rect ?? { x: 0, y: 0, width: sheetW, height: sheetH };
  const origin = {
    x: (frame.width - spanW * scale) / 2 - first.x * scale,
    y: (frame.height - spanH * scale) / 2 - first.y * scale,
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
    rows: plan.rows,
    cols: plan.cols,
    paper: true,
    tiles: tiles.map((tile) => ({
      id: tile.id,
      row: tile.row,
      col: tile.col,
      rect: toScreen(tile.rect),
      coreRect: toScreen(tile.coreRect),
      offset: {
        x: (tile.col - (plan.cols - 1) / 2) * gap,
        y: (tile.row - (plan.rows - 1) / 2) * gap,
      },
    })),
  };
}

/**
 * Lays the split out inside `frame` for the splitter's preview. The scale fits the image with
 * its tiles *separated* (a gap of `tileGap` screen px between crops, plus twice the overlap so
 * each tinted strip reads as a band of its own), so the separated state never leaves the frame
 * and the joined one sits centred inside it. A split by paper size lays out its sheets instead
 * (`paperPreviewLayout`). Throws like computeTiles for an invalid split.
 */
export function splitPreviewLayout(
  image: { width: number; height: number },
  config: SplitConfig,
  frame: Size,
  tileGap: number,
): SplitPreviewLayout {
  if (config.paper !== undefined) {
    return paperPreviewLayout(image, config, config.paper, frame, tileGap);
  }
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
    paper: false,
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
