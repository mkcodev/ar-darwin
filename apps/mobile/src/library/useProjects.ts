import {
  copyName,
  createProjectId,
  duplicateProject,
  type Project,
  setProjectDone,
} from "@ar-darwin/core";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { t } from "../i18n";
import { copyProjectDir, deleteProjectDir } from "../storage/files";
import { deleteProject, listProjects, saveProject } from "../storage/projectRepository";
import { playHaptic } from "../theme/playHaptic";
import { importProject } from "./importProject";
import { fromPickerResult, type ImportSource, type PickedImage } from "./importSources";

/**
 * Android can kill the app while the system camera or picker is open; the result then waits in
 * `getPendingResultAsync`. Checked once per app run, not on every mount of the library.
 */
let pendingResultChecked = false;

export type LibraryState = {
  /** `null` while the first load runs. Most recently updated first. */
  projects: Project[] | null;
  importing: boolean;
  /** Last error or warning to show (import failed, camera permission denied…). */
  notice: string | null;
  importFrom: (source: ImportSource) => Promise<void>;
  /** Deletes for good (the screen hides it first and calls this once the undo window is over). */
  remove: (project: Project) => Promise<boolean>;
  rename: (project: Project, name: string) => Promise<boolean>;
  setCategories: (project: Project, categoryIds: readonly string[]) => Promise<boolean>;
  setDone: (project: Project, done: boolean) => Promise<boolean>;
  /** A clean copy (see `duplicateProject`); resolves to it, or `null` if it failed. */
  duplicate: (project: Project) => Promise<Project | null>;
};

/** The library's projects in SQLite, plus importing, editing, duplicating and deleting them. */
export function useProjects(): LibraryState {
  const db = useSQLiteContext();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setProjects(await listProjects(db));
    } catch (error) {
      console.warn("useProjects: could not list projects", error);
      setProjects((current) => current ?? []);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const runImport = useCallback(
    async (picked: PickedImage) => {
      setImporting(true);
      try {
        await importProject(db, picked);
        await reload();
      } catch (error) {
        console.warn("useProjects: import failed", error);
        setNotice(t("library.importError"));
        playHaptic("error");
      } finally {
        setImporting(false);
      }
    },
    [db, reload],
  );

  useEffect(() => {
    if (pendingResultChecked) return;
    pendingResultChecked = true;
    ImagePicker.getPendingResultAsync()
      .then((result) => {
        if (result === null) return;
        if ("code" in result) {
          setNotice(t("library.importError"));
          return;
        }
        const picked = fromPickerResult(result);
        if (typeof picked !== "string") return runImport(picked);
      })
      .catch((error: unknown) => console.warn("useProjects: pending picker result", error));
  }, [runImport]);

  const importFrom = useCallback(
    async (source: ImportSource) => {
      setNotice(null);
      let picked: Awaited<ReturnType<ImportSource["pick"]>>;
      try {
        picked = await source.pick();
      } catch (error) {
        console.warn(`useProjects: ${source.id} picker failed`, error);
        setNotice(t("library.importError"));
        return;
      }
      if (picked === "cancelled") return;
      if (picked === "denied") {
        setNotice(t("library.cameraDenied"));
        return;
      }
      await runImport(picked);
    },
    [runImport],
  );

  const remove = useCallback(
    async (project: Project) => {
      setNotice(null);
      try {
        await deleteProject(db, project.id);
      } catch (error) {
        console.warn("useProjects: delete failed", error);
        setNotice(t("library.actions.deleteError"));
        playHaptic("error");
        return false;
      }
      setProjects((current) => current?.filter((p) => p.id !== project.id) ?? null);
      return true;
    },
    [db],
  );

  /** Saves an edited project (stamping `updatedAt`) and reloads, so the order stays «recent first». */
  const update = useCallback(
    async (next: Project) => {
      setNotice(null);
      try {
        await saveProject(db, next);
      } catch (error) {
        console.warn("useProjects: save failed", error);
        setNotice(t("library.actions.saveError"));
        playHaptic("error");
        return false;
      }
      await reload();
      return true;
    },
    [db, reload],
  );

  const rename = useCallback(
    (project: Project, name: string) => update({ ...project, name }),
    [update],
  );
  const setCategories = useCallback(
    (project: Project, categoryIds: readonly string[]) =>
      update({ ...project, categoryIds: [...categoryIds] }),
    [update],
  );
  const setDone = useCallback(
    (project: Project, done: boolean) => update(setProjectDone(project, done, new Date())),
    [update],
  );

  const duplicate = useCallback(
    async (project: Project) => {
      setNotice(null);
      const id = createProjectId();
      const name = copyName(
        project.name,
        (projects ?? []).map((p) => p.name),
        (base, n) =>
          n === 1
            ? t("library.actions.copyName", { name: base })
            : t("library.actions.copyNameNumbered", { name: base, n }),
      );
      try {
        await copyProjectDir(project.id, id);
        const copy = await saveProject(
          db,
          duplicateProject(project, { id, name, now: new Date() }),
        );
        await reload();
        return copy;
      } catch (error) {
        console.warn("useProjects: duplicate failed", error);
        try {
          deleteProjectDir(id);
        } catch (cleanup) {
          console.warn("useProjects: could not remove the half-made copy", cleanup);
        }
        setNotice(t("library.actions.duplicateError"));
        playHaptic("error");
        return null;
      }
    },
    [db, projects, reload],
  );

  return {
    projects,
    importing,
    notice,
    importFrom,
    remove,
    rename,
    setCategories,
    setDone,
    duplicate,
  };
}
