import {
  configFromDraft,
  defaultSplitDraft,
  draftFromConfig,
  type ImageSize,
  type Project,
  type SplitConfig,
  type SplitDraft,
} from "@ar-darwin/core";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { enqueueSplitSave } from "../storage/cameraStateQueue";

/** Edits wait this long after the last change before they are stored. */
const SAVE_DELAY_MS = 400;

export type SplitterDraft = {
  draft: SplitDraft;
  /** What is drawn and stored: `draft` as image px. */
  config: SplitConfig;
  currentTileId: string | undefined;
  update: (patch: Partial<SplitDraft>) => void;
  /** Marks the tile and stores it at once: the camera opens right after. */
  pickTile: (id: string) => void;
};

/**
 * The splitter's draft of a project: its saved split (or 2×2 with 8 % extended edges), the tile
 * picked last, and the saves. Edits are stored after `SAVE_DELAY_MS` of quiet and when the screen
 * goes, through the camera's queue so the two never write out of order. Opening the screen and
 * leaving it untouched stores nothing.
 */
export function useSplitterDraft(project: Project, image: ImageSize): SplitterDraft {
  const db = useSQLiteContext();
  const [draft, setDraft] = useState<SplitDraft>(() =>
    project.split ? draftFromConfig(image, project.split) : defaultSplitDraft(),
  );
  const [currentTileId, setCurrentTileId] = useState(project.currentTileId);
  const config = useMemo(() => configFromDraft(image, draft), [image, draft]);

  const latest = useRef({ config, currentTileId });
  latest.current = { config, currentTileId };
  const dirty = useRef(false);
  const started = useRef(false);

  const flush = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    enqueueSplitSave(db, project.id, latest.current.config, latest.current.currentTileId);
  }, [db, project.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a change of either value is the trigger
  useEffect(() => {
    // The first run is the saved state itself, not an edit.
    if (!started.current) {
      started.current = true;
      return;
    }
    dirty.current = true;
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [config, currentTileId, flush]);

  // The screen going away stores what is pending.
  useEffect(() => flush, [flush]);

  const update = useCallback((patch: Partial<SplitDraft>) => {
    // The same values again (a slider re-reporting its percent) must not count as an edit.
    setDraft((previous) => {
      const changed = (Object.keys(patch) as (keyof SplitDraft)[]).some(
        (key) => patch[key] !== previous[key],
      );
      return changed ? { ...previous, ...patch } : previous;
    });
  }, []);

  const pickTile = useCallback(
    (id: string) => {
      latest.current = { ...latest.current, currentTileId: id };
      dirty.current = true;
      setCurrentTileId(id);
      flush();
    },
    [flush],
  );

  return { draft, config, currentTileId, update, pickTile };
}
