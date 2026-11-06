import {
  type Category,
  createProject,
  createProjectId,
  type DefaultCategoryId,
  type Project,
  type ProjectStatus,
} from "@ar-darwin/core";
import { opacity, space, type TypeRoleName, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { ImageFormat, useImage } from "@shopify/react-native-skia";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { t } from "../i18n";
import { categoryLabel } from "../storage/categoryLabel";
import { categoryStyle } from "../storage/categoryStyle";
import { storedFileExists, writeProjectFile } from "../storage/files";
import {
  deleteProject,
  listCategories,
  listProjects,
  saveProject,
} from "../storage/projectRepository";
import { useTheme } from "../theme/ThemeProvider";

const calibration = require("../../assets/images/test/calibration.png");

const HOUR_MS = 3_600_000;

type SeedSpec = {
  /** rows × cols; absent = never split. */
  split?: readonly [number, number];
  /** Tiles traced, in reading order. */
  done: number;
  /** Forced status (a project finished by hand, one in progress without a split). */
  status?: ProjectStatus;
  minutes: number;
  categories: readonly DefaultCategoryId[];
};

const SEED: readonly SeedSpec[] = [
  { split: [3, 3], done: 4, minutes: 135, categories: ["animals"] },
  { done: 0, minutes: 0, categories: ["landscapes"] },
  { split: [2, 2], done: 4, minutes: 300, categories: ["people"] },
  { split: [2, 3], done: 1, minutes: 45, categories: ["animals", "objects"] },
  { done: 0, status: "in_progress", minutes: 20, categories: ["lettering"] },
  { split: [4, 4], done: 0, minutes: 0, categories: ["lettering"] },
  { split: [3, 2], done: 3, minutes: 90, categories: ["manga", "animals", "objects"] },
  { done: 0, status: "done", minutes: 240, categories: ["lettering"] },
  { done: 0, minutes: 0, categories: [] },
  { split: [2, 2], done: 2, minutes: 60, categories: ["landscapes"] },
  { split: [3, 3], done: 8, minutes: 400, categories: ["animals"] },
  { done: 0, minutes: 0, categories: ["objects"] },
];

/** «A1», «A2»… in reading order, as the splitter names them. */
function tileIds(rows: number, cols: number): string[] {
  return Array.from({ length: rows * cols }, (_, i) => {
    const row = Math.floor(i / cols);
    return `${String.fromCharCode(65 + row)}${(i % cols) + 1}`;
  });
}

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

  // Twelve projects that cover every state the Library draws, an hour apart (newest first).
  const seed = () =>
    run(async () => {
      if (image === null) return;
      const bytes = image.encodeToBytes(ImageFormat.JPEG, 80);
      const names = t("devDesign.projects.seedNames").split(", ");
      const now = Date.now();
      for (const [index, spec] of SEED.entries()) {
        const id = createProjectId();
        const sourceUri = writeProjectFile(id, "source.jpg", bytes);
        // The cards show the thumbnail; the calibration image is small enough to be its own.
        writeProjectFile(id, "thumb.jpg", bytes);
        const at = new Date(now - index * HOUR_MS);
        const base = createProject({
          id,
          name: names[index] ?? t("devDesign.projects.testName", { n: index + 1 }),
          sourceUri,
          opacity: opacity.overlayImage,
          now: at,
        });
        const ids = spec.split === undefined ? [] : tileIds(spec.split[0], spec.split[1]);
        const completedTileIds = ids.slice(0, spec.done);
        const allDone = ids.length > 1 && completedTileIds.length === ids.length;
        const status =
          spec.status ?? (allDone ? "done" : spec.done > 0 ? "in_progress" : "pending");
        // `at` as the save time too: saveProject stamps `updatedAt`, which orders «Recent».
        await saveProject(
          db,
          {
            ...base,
            split:
              spec.split === undefined
                ? undefined
                : {
                    rows: spec.split[0],
                    cols: spec.split[1],
                    overlapPx: 0,
                    showOverlapTint: false,
                  },
            currentTileId: ids[Math.min(spec.done, ids.length - 1)],
            completedTileIds,
            status,
            completedAt: status === "done" ? at.toISOString() : undefined,
            timeSpentMs: spec.minutes * 60_000,
            categoryIds: [...spec.categories],
          },
          at,
        );
      }
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
      <View style={styles.categories}>
        {categories.map((category) => {
          const style = categoryStyle(category, theme);
          return (
            <View key={category.id} style={styles.category}>
              <Icon name={style.icon} color={style.color} />
              <Text style={[text("label"), { color: c.text.primary }]}>
                {categoryLabel(category)}
              </Text>
            </View>
          );
        })}
      </View>
      <Button variant="primary" icon="plus" disabled={image === null} onPress={create}>
        {t("devDesign.projects.create")}
      </Button>
      <Button icon="plus" disabled={image === null} onPress={seed}>
        {t("devDesign.projects.seed")}
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
  categories: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  category: { flexDirection: "row", alignItems: "center", gap: space[2] },
});
