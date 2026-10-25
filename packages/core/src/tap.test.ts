import { describe, expect, it } from "vitest";
import { TAP_SLOP_PX, tapEnd, tapMove, tapStart } from "./tap";

describe("tap", () => {
  it("a finger that goes down and up in place is a tap", () => {
    const down = tapStart(null, 100, 200, 1);
    expect(down).toEqual({ x: 100, y: 200, moved: false });
    expect(tapEnd(down, 0)).toEqual({ state: null, tapped: true });
  });

  it("tiny drift stays a tap", () => {
    const down = tapStart(null, 100, 200, 1);
    const drifted = tapMove(down, 100 + TAP_SLOP_PX - 1, 200, 1);
    expect(tapEnd(drifted, 0).tapped).toBe(true);
  });

  it("moving past the slop is not a tap", () => {
    const down = tapStart(null, 100, 200, 1);
    const dragged = tapMove(down, 100, 200 + TAP_SLOP_PX + 1, 1);
    expect(dragged?.moved).toBe(true);
    expect(tapEnd(dragged, 0)).toEqual({ state: null, tapped: false });
  });

  it("the slop is measured from where the finger came down, in any direction", () => {
    const down = tapStart(null, 100, 200, 1);
    const diagonal = tapMove(down, 100 + 8, 200 + 8, 1);
    expect(diagonal?.moved).toBe(true);
  });

  it("once moved, coming back does not make it a tap again", () => {
    const down = tapStart(null, 100, 200, 1);
    const dragged = tapMove(down, 150, 200, 1);
    const back = tapMove(dragged, 100, 200, 1);
    expect(tapEnd(back, 0).tapped).toBe(false);
  });

  it("a second finger makes it a pinch or a rotation, not a tap", () => {
    const first = tapStart(null, 100, 200, 1);
    const second = tapStart(first, 140, 200, 2);
    expect(second.moved).toBe(true);
    expect(tapEnd(second, 1).tapped).toBe(false);
    expect(tapEnd({ ...second }, 0).tapped).toBe(false);
  });

  it("two fingers down while moving is not a tap", () => {
    const down = tapStart(null, 100, 200, 1);
    expect(tapMove(down, 101, 200, 2)?.moved).toBe(true);
  });

  it("a finger lifting while another is still down is not a tap", () => {
    const down = tapStart(null, 100, 200, 1);
    expect(tapEnd(down, 1)).toEqual({
      state: { x: 100, y: 200, moved: true },
      tapped: false,
    });
  });

  it("a new first finger starts over even if the previous touch was never closed", () => {
    const stale = { x: 1, y: 1, moved: true };
    expect(tapStart(stale, 50, 60, 1)).toEqual({ x: 50, y: 60, moved: false });
  });

  it("with no touch in progress, moves and ends are ignored", () => {
    expect(tapMove(null, 1, 1, 1)).toBeNull();
    expect(tapEnd(null, 0)).toEqual({ state: null, tapped: false });
  });
});
