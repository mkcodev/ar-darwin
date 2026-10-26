import type { CameraState, SplitConfig } from "@ar-darwin/core";
import type { SQLiteDatabase } from "expo-sqlite";
import { saveCameraState, saveSplit } from "./projectRepository";

/**
 * Camera and splitter saves, one after another, at module level: a save started as a screen
 * unmounts still finishes after the screen is gone, and two saves never land out of order (an
 * older state overwriting a newer one). One chain for both screens, as they write the same row.
 * Errors are logged and never break the chain.
 */
let tail: Promise<void> = Promise.resolve();

function enqueue(what: string, id: string, save: () => Promise<void>): Promise<void> {
  tail = tail.then(save).catch((error: unknown) => {
    console.warn(`${what}: could not save project ${id}`, error);
  });
  return tail;
}

/** Resolves once every save queued so far has been written (or has failed and been logged). */
export function whenSavesSettle(): Promise<void> {
  return tail;
}

/** Queues a save of `state`, stamped with the time it was queued. */
export function enqueueCameraSave(
  db: SQLiteDatabase,
  id: string,
  state: CameraState,
  now: Date = new Date(),
): Promise<void> {
  const snapshot: CameraState = {
    ...state,
    transform: { ...state.transform },
    transformViewport: state.transformViewport && { ...state.transformViewport },
    imageAdjustments: state.imageAdjustments && { ...state.imageAdjustments },
    pinnedPlacement: state.pinnedPlacement && {
      transform: { ...state.pinnedPlacement.transform },
      viewport: { ...state.pinnedPlacement.viewport },
    },
  };
  return enqueue("enqueueCameraSave", id, () => saveCameraState(db, id, snapshot, now));
}

/** Queues a save of the splitter's `split` and `currentTileId`, stamped with the time it was queued. */
export function enqueueSplitSave(
  db: SQLiteDatabase,
  id: string,
  split: SplitConfig,
  currentTileId: string | undefined,
  now: Date = new Date(),
): Promise<void> {
  const snapshot: SplitConfig = { ...split };
  return enqueue("enqueueSplitSave", id, () => saveSplit(db, id, snapshot, currentTileId, now));
}
