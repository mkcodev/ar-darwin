import type { Project } from "@ar-darwin/core";
import { cameraBackdropColor } from "@ar-darwin/ui";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ProjectCameraScreen } from "../../../camera/ProjectCameraScreen";
import { getProject } from "../../../storage/projectRepository";

/**
 * A project's camera, opened from its card in the library. Loads the project first (dark
 * backdrop meanwhile); a project that no longer exists, or can't be read, leaves straight away.
 */
export default function ProjectCamera() {
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
        console.warn(`ProjectCamera: could not load project ${id}`, error);
        if (alive) leave();
      });
    return () => {
      alive = false;
    };
  }, [db, id, leave]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {project === null ? (
        <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]}>
          <StatusBar style="light" />
        </View>
      ) : (
        <ProjectCameraScreen project={project} onLeave={leave} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
});
