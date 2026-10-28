import { describe, expect, it } from "vitest";
import { dockModel, justCompleted, MAX_PROGRESS_SEGMENTS, progressBar } from "./tileDock";

const GRID = { rows: 2, cols: 2 };

describe("dockModel", () => {
  it("pending: the tile is not marked, the next pending one follows it", () => {
    expect(dockModel(GRID, ["A1"], "A2")).toEqual({
      phase: "pending",
      tileId: "A2",
      done: 1,
      total: 4,
      nextPendingId: "B1",
      previousId: "A1",
    });
  });

  it("done: the tile is marked and others are left", () => {
    const model = dockModel(GRID, ["A1", "A2"], "A2");
    expect(model).toMatchObject({ phase: "done", done: 2, nextPendingId: "B1", previousId: "A1" });
  });

  it("complete: every tile is done, there is nothing pending", () => {
    const model = dockModel(GRID, ["A1", "A2", "B1", "B2"], "B2");
    expect(model).toMatchObject({ phase: "complete", done: 4, total: 4, nextPendingId: undefined });
  });

  it("is complete whichever tile is picked", () => {
    expect(dockModel(GRID, ["B2", "A1", "A2", "B1"], "A1").phase).toBe("complete");
  });

  it("goes back to a pending tile before the current one after marking the last in order", () => {
    const model = dockModel(GRID, ["A2", "B1", "B2"], "B2");
    expect(model).toMatchObject({ phase: "done", done: 3, nextPendingId: "A1" });
  });

  it("skips the tiles already done and wraps", () => {
    expect(dockModel({ rows: 1, cols: 4 }, ["A2", "A3"], "A1").nextPendingId).toBe("A4");
    expect(dockModel({ rows: 1, cols: 4 }, ["A2", "A3", "A4"], "A1").nextPendingId).toBeUndefined();
    expect(dockModel({ rows: 1, cols: 4 }, ["A1", "A2", "A3"], "A4").nextPendingId).toBeUndefined();
    expect(dockModel({ rows: 1, cols: 4 }, ["A1", "A3"], "A4").nextPendingId).toBe("A2");
  });

  it("never offers the current tile as the next pending one", () => {
    expect(dockModel(GRID, [], "B2").nextPendingId).toBe("A1");
    expect(dockModel({ rows: 1, cols: 2 }, ["A2"], "A1").nextPendingId).toBeUndefined();
  });

  it("1×1: pending until marked, then complete, with nothing to go to", () => {
    const one = { rows: 1, cols: 1 };
    expect(dockModel(one, [], "A1")).toMatchObject({
      phase: "pending",
      total: 1,
      nextPendingId: undefined,
      previousId: "A1",
    });
    expect(dockModel(one, ["A1"], "A1")).toMatchObject({ phase: "complete", done: 1 });
  });

  it("starts from A1 when no tile is picked or the saved one left the grid", () => {
    expect(dockModel(GRID, [], undefined).tileId).toBe("A1");
    expect(dockModel(GRID, [], "C9").tileId).toBe("A1");
  });

  it("ignores done tiles that are no longer in the grid", () => {
    const model = dockModel(GRID, ["A1", "C3", "A1"], "A2");
    expect(model).toMatchObject({ phase: "pending", done: 1, total: 4 });
    expect(dockModel(GRID, ["C3", "D4", "E5", "F6"], "A1").phase).toBe("pending");
  });
});

describe("progressBar", () => {
  it("gives one segment per tile in reading order, marking done and current", () => {
    expect(progressBar(GRID, ["A1", "B2"], "A2")).toEqual({
      kind: "segments",
      items: [
        { id: "A1", done: true, current: false },
        { id: "A2", done: false, current: true },
        { id: "B1", done: false, current: false },
        { id: "B2", done: true, current: false },
      ],
    });
  });

  it("the current tile can be done too", () => {
    const bar = progressBar(GRID, ["A1"], "A1");
    expect(bar.kind === "segments" && bar.items[0]).toEqual({
      id: "A1",
      done: true,
      current: true,
    });
  });

  it("drops done ids that are not in the grid", () => {
    const bar = progressBar(GRID, ["C3"], "A1");
    expect(bar.kind === "segments" && bar.items.every((s) => !s.done)).toBe(true);
  });

  it("uses segments up to the limit and a continuous bar above it", () => {
    const at = { rows: 4, cols: MAX_PROGRESS_SEGMENTS / 4 };
    expect(progressBar(at, [], "A1").kind).toBe("segments");
    const over = { rows: 1, cols: MAX_PROGRESS_SEGMENTS + 1 };
    expect(progressBar(over, ["A1", "A2", "A3"], "A1")).toEqual({
      kind: "bar",
      fraction: 3 / (MAX_PROGRESS_SEGMENTS + 1),
    });
  });

  it("the continuous bar does not count ids outside the grid", () => {
    const over = { rows: 1, cols: 20 };
    expect(progressBar(over, ["A1", "A21", "B1"], "A1")).toEqual({ kind: "bar", fraction: 1 / 20 });
  });
});

describe("justCompleted", () => {
  it("is true only when the last pending tile is marked", () => {
    expect(justCompleted(3, 4, 4)).toBe(true);
    expect(justCompleted(0, 1, 1)).toBe(true);
  });

  it("is false while tiles are left, when unmarking and when it was already complete", () => {
    expect(justCompleted(2, 3, 4)).toBe(false);
    expect(justCompleted(4, 3, 4)).toBe(false);
    expect(justCompleted(4, 4, 4)).toBe(false);
    expect(justCompleted(0, 0, 0)).toBe(false);
  });
});
