import type { Project } from "@ar-darwin/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { SplitterHeader } from "../../../splitter/SplitterHeader";
import { SplitterScreen } from "../../../splitter/SplitterScreen";
import { getProject } from "../../../storage/projectRepository";

/**
 * A project's splitter, opened from «Dividir» in its actions. Loads the project first; one that no
 * longer exists, or can't be read, leaves straight away.
 */
export default function ProjectSplit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  useEffect(() => {
    let alive = true;
    getProject(db, id)
      .then((found) => {
        if (!alive) return;
        if (found === null) leave();
        else setProject(found);
      })
      .catch((error: unknown) => {
        console.warn(`ProjectSplit: could not load project ${id}`, error);
        if (alive) leave();
      });
    return () => {
      alive = false;
    };
  }, [db, id, leave]);

  // Until the project loads, only the header: the stack shows its canvas colour under it.
  return project === null ? (
    <SplitterHeader />
  ) : (
    <SplitterScreen project={project} onLeave={leave} />
  );
}
