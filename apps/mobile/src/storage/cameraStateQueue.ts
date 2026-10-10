import type { CameraState } from "@ar-darwin/core";
import type { SQLiteDatabase } from "expo-sqlite";
import { saveCameraState } from "./projectRepository";

/**
 * Camera saves, one after another, at module level: a save started as the camera screen
 * unmounts still finishes after the screen is gone, and two saves never land out of order (an
 * older state overwriting a newer one). Errors are logged and never break the chain.
 */
let tail: Promise<void> = Promise.resolve();

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
  };
  tail = tail
    .then(() => saveCameraState(db, id, snapshot, now))
    .catch((error: unknown) => {
      console.warn(`enqueueCameraSave: could not save the camera state of project ${id}`, error);
    });
  return tail;
}
