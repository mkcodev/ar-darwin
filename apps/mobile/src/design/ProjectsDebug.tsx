import { type Category, createProject, createProjectId, type Project } from "@ar-darwin/core";
import { opacity, space, type TypeRoleName, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { ImageFormat, useImage } from "@shopify/react-native-skia";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { categoryLabel } from "../storage/categoryLabel";
import { storedFileExists, writeProjectFile } from "../storage/files";
import {
  deleteProject,
  listCategories,
  listProjects,
  saveProject,
} from "../storage/projectRepository";
import { useTheme } from "../theme/ThemeProvider";

const calibration = require("../../assets/images/test/calibration.png");

function fileState(stored: string): string {
  return storedFileExists(stored)
    ? t("devDesign.projects.fileExists")
    : t("devDesign.projects.fileMissing");
}

/**
 * Dev-only check of the SQLite storage on a real phone: create a test project (the calibration
 * image re-encoded as JPEG into `projects/<id>/`, linked to the first built-in category), list
 * and delete. Projects must survive closing the app completely, and deleting one removes its file.
 */
export function ProjectsDebug() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const image = useImage(calibration);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);
  const c = theme.color;
  const text = (role: TypeRoleName) => toNativeTextStyle(typography[role]);

  const run = useCallback(
    async (task: () => Promise<void>) => {
      try {
        await task();
        setProjects(await listProjects(db));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [db],
  );

  useEffect(() => {
    run(async () => setCategories(await listCategories(db)));
  }, [db, run]);

  const create = () =>
    run(async () => {
      if (image === null) return;
      const id = createProjectId();
      const sourceUri = writeProjectFile(
        id,
        "source.jpg",
        image.encodeToBytes(ImageFormat.JPEG, 80),
      );
      const project = createProject({
        id,
        name: t("devDesign.projects.testName", { n: projects.length + 1 }),
        sourceUri,
        opacity: opacity.overlayImage,
        now: new Date(),
      });
      const first = categories[0];
      await saveProject(db, { ...project, categoryIds: first ? [first.id] : [] });
    });

  const remove = (project: Project) =>
    run(async () => {
      await deleteProject(db, project.id);
      setDeleted(
        t("devDesign.projects.deleted", {
          name: project.name,
          file: fileState(project.sourceUri),
        }),
      );
    });

  const names = (project: Project) =>
    project.categoryIds
      .map((id) => categories.find((category) => category.id === id))
      .filter((category) => category !== undefined)
      .map(categoryLabel)
      .join(", ");

  return (
    <View style={styles.block}>
      <Text style={[text("body"), { color: c.text.muted }]}>{t("devDesign.projects.hint")}</Text>
      <Button variant="primary" icon="plus" disabled={image === null} onPress={create}>
        {t("devDesign.projects.create")}
      </Button>
      {projects.length === 0 && (
        <Text style={[text("body"), { color: c.text.muted }]}>{t("devDesign.projects.empty")}</Text>
      )}
      {projects.map((project) => (
        <View key={project.id} style={styles.row}>
          <Text style={[text("label"), { color: c.text.primary }]}>{project.name}</Text>
          <Text style={[text("value"), { color: c.text.muted }]}>
            {t("devDesign.projects.detail", {
              status: t(`projectStatus.${project.status}`),
              categories: names(project),
              date: new Date(project.updatedAt).toLocaleString(),
              file: fileState(project.sourceUri),
            })}
          </Text>
          <Button onPress={() => remove(project)}>
            {t("devDesign.projects.delete", { name: project.name })}
          </Button>
        </View>
      ))}
      {deleted !== null && <Text style={[text("body"), { color: c.text.muted }]}>{deleted}</Text>}
      {error !== null && (
        <Text style={[text("body"), { color: c.danger }]}>
          {t("devDesign.projects.error", { message: error })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space[3] },
  row: { gap: space[1] },
});
