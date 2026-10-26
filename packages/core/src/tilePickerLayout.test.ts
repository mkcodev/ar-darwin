import { describe, expect, it } from "vitest";
import { type TilePickerLayoutInput, tilePickerLayout } from "./tilePickerLayout";

const ROOM = { maxWidth: 320, maxHeight: 400, minCell: 44, gap: 4 };

function layout(patch: Partial<TilePickerLayoutInput>) {
  return tilePickerLayout({ rows: 2, cols: 2, aspect: 4 / 3, ...ROOM, ...patch });
}

describe("tilePickerLayout", () => {
  it("fills the width of the room with cells shaped like the tiles", () => {
    const l = layout({});
    // 2×2 of a 4:3 picture: tiles are 4:3 too. (320 - 4) / 2 = 158 wide.
    expect(l.cellWidth).toBe(158);
    expect(l.cellHeight).toBe(118);
    expect(l.width).toBe(320);
    expect(l.height).toBe(240);
    expect(l.scrollX).toBe(false);
    expect(l.scrollY).toBe(false);
  });

  it("is limited by the height when the room is short", () => {
    // A 1:2 picture in 3 rows: tiles are 3:2. The room is 400 tall, so a cell is (400 - 8) / 3 tall.
    const l = layout({ aspect: 1 / 2, rows: 3, cols: 1 });
    expect(l.cellHeight).toBe(130);
    expect(l.cellWidth).toBe(196);
    expect(l.scrollY).toBe(false);
  });

  it("keeps the shortest side of a cell at the minimum and scrolls when it does not fit", () => {
    const l = layout({ rows: 10, cols: 10, aspect: 1 });
    expect(l.cellWidth).toBe(44);
    expect(l.cellHeight).toBe(44);
    expect(l.width).toBe(10 * 44 + 9 * 4);
    expect(l.scrollX).toBe(true);
    expect(l.scrollY).toBe(true);
  });

  it("scrolls only the axis that does not fit", () => {
    const wide = layout({ rows: 1, cols: 10, aspect: 4 });
    expect(wide.scrollX).toBe(true);
    expect(wide.scrollY).toBe(false);
    const high = layout({ rows: 10, cols: 1, aspect: 1 / 4 });
    expect(high.scrollX).toBe(false);
    expect(high.scrollY).toBe(true);
  });

  it("keeps the proportion of landscape and portrait tiles at the minimum", () => {
    const landscape = layout({ rows: 10, cols: 10, aspect: 2 });
    expect(landscape.cellHeight).toBe(44);
    expect(landscape.cellWidth).toBe(88);
    const portrait = layout({ rows: 10, cols: 10, aspect: 0.5 });
    expect(portrait.cellWidth).toBe(44);
    expect(portrait.cellHeight).toBe(88);
  });

  it("never makes a cell smaller than the minimum", () => {
    for (const rows of [1, 2, 5, 10]) {
      for (const cols of [1, 3, 7, 10]) {
        for (const aspect of [0.4, 1, 1.5, 3]) {
          const l = layout({ rows, cols, aspect });
          expect(l.cellWidth).toBeGreaterThanOrEqual(44);
          expect(l.cellHeight).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  it("reports the size of the whole grid, gaps included", () => {
    const l = layout({ rows: 3, cols: 2, aspect: 1 });
    expect(l.width).toBe(2 * l.cellWidth + 4);
    expect(l.height).toBe(3 * l.cellHeight + 8);
  });

  it("throws for a grid or a size that makes no sense", () => {
    expect(() => layout({ rows: 0 })).toThrow(/^tilePickerLayout:/);
    expect(() => layout({ cols: 1.5 })).toThrow(/^tilePickerLayout:/);
    expect(() => layout({ aspect: 0 })).toThrow(/^tilePickerLayout:/);
    expect(() => layout({ maxWidth: -1 })).toThrow(/^tilePickerLayout:/);
  });
});
