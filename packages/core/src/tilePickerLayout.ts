export type TilePickerLayoutInput = {
  rows: number;
  cols: number;
  /** Width over height of the whole picture. */
  aspect: number;
  /** Room for the grid; a grid that needs more scrolls. */
  maxWidth: number;
  maxHeight: number;
  /** The shortest side a cell may have (a touch target). */
  minCell: number;
  /** Space between cells. */
  gap: number;
};

export type TilePickerLayout = {
  cellWidth: number;
  cellHeight: number;
  /** The whole grid, gaps included. */
  width: number;
  height: number;
  /** The grid is wider / taller than the room it was given. */
  scrollX: boolean;
  scrollY: boolean;
};

/**
 * Size of the grid in the tile picker: every cell has the proportion of a tile of the picture and
 * the grid is as big as the room allows. When that would make a cell's shortest side smaller than
 * `minCell`, the cells stay at `minCell` and the grid scrolls on the axis that no longer fits.
 * Whole px. Throws an Error starting with "tilePickerLayout:" for a grid or a size that makes no
 * sense.
 */
export function tilePickerLayout(input: TilePickerLayoutInput): TilePickerLayout {
  const { rows, cols, aspect, maxWidth, maxHeight, minCell, gap } = input;
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new Error(`tilePickerLayout: invalid grid ${rows} × ${cols}`);
  }
  if (!(aspect > 0) || !(maxWidth > 0) || !(maxHeight > 0) || !(minCell > 0) || gap < 0) {
    throw new Error("tilePickerLayout: aspect, room and minimum cell must be positive");
  }

  // A tile is (width / cols) by (height / rows) of the picture.
  const tileAspect = (aspect * rows) / cols;
  const fitWidth = (maxWidth - gap * (cols - 1)) / cols;
  const fitHeight = (maxHeight - gap * (rows - 1)) / rows;
  const width = Math.min(fitWidth, fitHeight * tileAspect);
  const height = width / tileAspect;

  const cellWidth = Math.max(minCell, Math.floor(width));
  const cellHeight = Math.max(minCell, Math.floor(height));
  // At the minimum the other side keeps the tile's proportion instead of staying at the minimum.
  const small = Math.min(width, height) < minCell;
  const finalWidth = small ? Math.ceil(minCell * Math.max(1, tileAspect)) : cellWidth;
  const finalHeight = small ? Math.ceil(minCell * Math.max(1, 1 / tileAspect)) : cellHeight;

  const totalWidth = cols * finalWidth + gap * (cols - 1);
  const totalHeight = rows * finalHeight + gap * (rows - 1);
  return {
    cellWidth: finalWidth,
    cellHeight: finalHeight,
    width: totalWidth,
    height: totalHeight,
    scrollX: totalWidth > maxWidth,
    scrollY: totalHeight > maxHeight,
  };
}
