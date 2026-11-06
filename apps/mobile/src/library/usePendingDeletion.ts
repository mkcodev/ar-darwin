import type { Project } from "@ar-darwin/core";
import { library } from "@ar-darwin/ui";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";

export type PendingDeletion = {
  /** The project waiting to be deleted, already hidden from the library; `null` when none. */
  pending: Project | null;
  /** Hides the project and starts the undo window. A deletion still pending is committed first. */
  schedule: (project: Project) => void;
  /** Brings the pending project back; nothing was deleted. */
  undo: () => void;
};

/**
 * «Delete» with undo: the project disappears at once and is deleted for good when the undo window
 * ends (`library.undoMs`, longer with a screen reader), when the library loses focus (opening the
 * camera or Settings) or when the app goes to the background. If the app dies inside the window,
 * the project survives: nothing the person cannot undo happens before the window closes.
 */
export function usePendingDeletion(
  commit: (project: Project) => Promise<boolean>,
): PendingDeletion {
  const [pending, setPending] = useState<Project | null>(null);
  const pendingRef = useRef<Project | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenReader = useRef(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (alive) screenReader.current = on;
    });
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", (on) => {
      screenReader.current = on;
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const flush = useCallback(() => {
    clearTimer();
    const project = pendingRef.current;
    if (project === null) return;
    pendingRef.current = null;
    setPending(null);
    commit(project);
  }, [clearTimer, commit]);

  const schedule = useCallback(
    (project: Project) => {
      flush();
      pendingRef.current = project;
      setPending(project);
      const ms = screenReader.current ? library.undoScreenReaderMs : library.undoMs;
      timer.current = setTimeout(flush, ms);
    },
    [flush],
  );

  const undo = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    setPending(null);
  }, [clearTimer]);

  // Leaving the library (camera, splitter, Settings) or the app ends the window: delete now.
  // Through a ref, so a new `flush` never re-runs these effects (their cleanup would delete early).
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useFocusEffect(useCallback(() => () => flushRef.current(), []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") flushRef.current();
    });
    return () => subscription.remove();
  }, []);

  return { pending, schedule, undo };
}
