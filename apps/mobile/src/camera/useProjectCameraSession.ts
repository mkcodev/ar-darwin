import {
  addTimeSpent,
  type CameraState,
  drainClock,
  IDLE_CLOCK,
  type Project,
  startClock,
  statusOnOpen,
  stopClock,
} from "@ar-darwin/core";
import { useIsFocused } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { enqueueCameraSave } from "../storage/cameraStateQueue";
import type { OverlayPlacement } from "./useOverlayGestures";

/** Quiet time after the last change before saving: a burst of adjustments is one write. */
const SAVE_DEBOUNCE_MS = 1000;

export type ProjectCameraSession = {
  /** Where to put the image: the saved transform with its canvas, or `null` to fit it. */
  initialPlacement: OverlayPlacement | null;
  initialOpacity: number;
  onPlacementSettle: (placement: OverlayPlacement) => void;
  onOpacitySettle: (opacity: number) => void;
};

/**
 * Keeps a project in sync with its camera while `active` (its image is up: never for a missing
 * image): `pending → in_progress` on open (saved straight away), the settled transform and opacity saved after `SAVE_DEBOUNCE_MS` of quiet, and the time
 * spent counted only while this screen is focused and the app in the foreground. Leaving the
 * screen, going to the background or unmounting saves at once. Every write goes through
 * `enqueueCameraSave`, which outlives the screen and keeps them in order.
 */
export function useProjectCameraSession(project: Project, active: boolean): ProjectCameraSession {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const running = active && isFocused && appActive;

  // Read once: the session owns the project's camera state from here on.
  const [initial] = useState(() => ({
    placement:
      project.transformViewport === undefined
        ? null
        : { transform: project.transform, viewport: project.transformViewport },
    opacity: project.opacity,
  }));
  const state = useRef<CameraState>({
    transform: project.transform,
    transformViewport: project.transformViewport,
    opacity: project.opacity,
    status: statusOnOpen(project.status),
    timeSpentMs: project.timeSpentMs,
  });
  const clock = useRef(IDLE_CLOCK);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = project.id;

  const saveNow = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const reading = drainClock(clock.current, Date.now());
    clock.current = reading.clock;
    state.current = {
      ...state.current,
      timeSpentMs: addTimeSpent(state.current.timeSpentMs, reading.elapsedMs),
    };
    enqueueCameraSave(db, id, state.current);
  }, [db, id]);

  const saveSoon = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
  }, [saveNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      setAppActive(next === "active");
    });
    return () => subscription.remove();
  }, []);

  // Opening a pending project starts it once its image is up; saved now, not on the first
  // adjustment.
  const startsProject = active && state.current.status !== project.status;
  useEffect(() => {
    if (startsProject) saveNow();
  }, [startsProject, saveNow]);

  // The clock runs only while focused and in the foreground. Stopping it (blur, background,
  // unmount) saves at once, with any pending debounced change.
  useEffect(() => {
    if (!running) return;
    clock.current = startClock(clock.current, Date.now());
    return () => {
      const reading = stopClock(clock.current, Date.now());
      clock.current = reading.clock;
      state.current = {
        ...state.current,
        timeSpentMs: addTimeSpent(state.current.timeSpentMs, reading.elapsedMs),
      };
      saveNow();
    };
  }, [running, saveNow]);

  // A change still waiting for its debounce when the screen goes is saved, not dropped.
  useEffect(
    () => () => {
      if (timer.current !== null) saveNow();
    },
    [saveNow],
  );

  const onPlacementSettle = useCallback(
    ({ transform, viewport }: OverlayPlacement) => {
      state.current = { ...state.current, transform, transformViewport: viewport };
      saveSoon();
    },
    [saveSoon],
  );

  const onOpacitySettle = useCallback(
    (opacity: number) => {
      state.current = { ...state.current, opacity };
      saveSoon();
    },
    [saveSoon],
  );

  return {
    initialPlacement: initial.placement,
    initialOpacity: initial.opacity,
    onPlacementSettle,
    onOpacitySettle,
  };
}
