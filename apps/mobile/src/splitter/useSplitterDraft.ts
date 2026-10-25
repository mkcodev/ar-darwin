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
  /**
   * Marks the tile and stores it at once. Resolves when the write has landed, so the camera, which
   * loads the project as it opens, never reads the previous tile.
   */
  pickTile: (id: string) => Promise<void>;
};

/**
 * The splitter's draft of a project: its saved split (or 2×2 with 8 % extended edges), the tile
 * picked last, and the saves. Edits are stored after `SAVE_DELAY_MS` of quiet and when the screen
 * goes, through the camera's queue so the two never write out of order. A save only happens when
 * what would be stored differs from what was last stored (or loaded): opening the screen and
 * leaving it untouched, or putting a value back, writes nothing.
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
  const lastSaved = useRef(JSON.stringify(latest.current));

  const flush = useCallback((): Promise<void> => {
    const pending = JSON.stringify(latest.current);
    if (pending === lastSaved.current) return Promise.resolve();
    lastSaved.current = pending;
    return enqueueSplitSave(db, project.id, latest.current.config, latest.current.currentTileId);
  }, [db, project.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a change of either value is the trigger
  useEffect(() => {
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [config, currentTileId, flush]);

  // The screen going away stores what is pending.
  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

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
      setCurrentTileId(id);
      return flush();
    },
    [flush],
  );

  return { draft, config, currentTileId, update, pickTile };
}
