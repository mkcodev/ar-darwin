import type { SplitConfig } from "./models";
import {
  isTileInGrid,
  nextPendingTileId,
  pickedTileId,
  previousTileId,
  sheetCount,
  tileProgress,
} from "./splitConfig";

type Grid = Pick<SplitConfig, "rows" | "cols">;

/**
 * What the camera's dock offers for the tile being traced: `pending` (the tile is not marked: the
 * main action marks it), `done` (it is, and others are left: the main action goes to the next
 * pending one) or `complete` (every tile is done).
 */
export type DockPhase = "pending" | "done" | "complete";

export type DockModel = {
  phase: DockPhase;
  /** The tile being traced: the picked one, or A1. */
  tileId: string;
  /** Tiles done and tiles in all, ids outside the grid not counted: the «4/9». */
  done: number;
  total: number;
  /**
   * Where «Siguiente trozo» goes: the first pending tile after this one in reading order, wrapping
   * (it can be before this one). `undefined` when no other tile is pending.
   */
  nextPendingId: string | undefined;
  /** The tile «Anterior» goes to: the one before in reading order, wrapping from A1 to the last. */
  previousId: string;
};

/** The dock's state for a split with `completed` tiles done and `currentTileId` picked. */
export function dockModel(
  config: Grid,
  completed: readonly string[],
  currentTileId: string | undefined,
): DockModel {
  const tileId = pickedTileId(config, currentTileId);
  const { done, total } = tileProgress(config, completed);
  const phase: DockPhase =
    done === total ? "complete" : completed.includes(tileId) ? "done" : "pending";
  return {
    phase,
    tileId,
    done,
    total,
    nextPendingId: nextPendingTileId(config, completed, tileId),
    previousId: previousTileId(config, tileId),
  };
}

/** Most tiles that get a segment each in the progress bar; more are drawn as one continuous bar. */
export const MAX_PROGRESS_SEGMENTS = 16;

export type ProgressSegment = {
  id: string;
  /** Marked as done. */
  done: boolean;
  /** The tile being traced («aquí»), done or not. */
  current: boolean;
};

export type ProgressBar =
  | { kind: "segments"; items: ProgressSegment[] }
  | {
      kind: "bar";
      /** Tiles done over all of them, 0..1. */
      fraction: number;
    };

/**
 * The dock's progress: one segment per tile in reading order when there are at most
 * `MAX_PROGRESS_SEGMENTS`, else a continuous bar (a hundred slivers would be noise).
 */
export function progressBar(
  config: Grid,
  completed: readonly string[],
  currentTileId: string | undefined,
): ProgressBar {
  const count = sheetCount(config);
  const current = pickedTileId(config, currentTileId);
  if (count > MAX_PROGRESS_SEGMENTS) {
    return { kind: "bar", fraction: tileProgress(config, completed).done / count };
  }
  const items: ProgressSegment[] = [];
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const id = `${String.fromCharCode(65 + row)}${col + 1}`;
      items.push({
        id,
        done: completed.includes(id) && isTileInGrid(config, id),
        current: id === current,
      });
    }
  }
  return { kind: "segments", items };
}

/**
 * True when marking a tile took the grid from «not all done» to «all done»: the moment for the
 * celebration. Opening a project that is already complete, or unmarking, is not.
 */
export function justCompleted(previousDone: number, nowDone: number, total: number): boolean {
  return total > 0 && previousDone < total && nowDone === total;
}
