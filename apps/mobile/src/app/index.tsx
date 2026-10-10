import type { Project } from "@ar-darwin/core";
import { duration, space, spring, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { LargeTitle } from "../components/LargeTitle";
import { LargeTitleHeader, useLargeTitleBarHeight } from "../components/LargeTitleHeader";
import { t } from "../i18n";
import { ImportSheet } from "../library/ImportSheet";
import type { ImportSource } from "../library/importSources";
import { ProjectActionsSheet, type ProjectActionsStep } from "../library/ProjectActionsSheet";
import { ProjectCard } from "../library/ProjectCard";
import { useProjects } from "../library/useProjects";
import { spikesEnabled } from "../spikes";
import { springPlan } from "../theme/motion";
import { playHaptic } from "../theme/playHaptic";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

const body = toNativeTextStyle(typography.body);
const COLUMNS = 2;
const GUTTER = space[4];
const GAP = space[3];

/**
 * Library, the home screen: the projects in a two-column grid under the large title, importing
 * from the header's «+» (or the empty state). Tapping a project opens its camera; a long press,
 * its actions.
 * A plain ScrollView, not a FlatList: Reanimated's layout transitions (the grid closing the gap
 * of a deleted card) only work on a single-column FlatList, and a personal library stays small.
 */
export default function Library() {
  const router = useRouter();
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barHeight = useLargeTitleBarHeight();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const { projects, importing, notice, importFrom, remove } = useProjects();
  const [importOpen, setImportOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<Project | null>(null);
  const [actionsStep, setActionsStep] = useState<ProjectActionsStep>("actions");
  const c = theme.color;
  const title = t("library.title");
  const cardWidth = (width - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  // Deleted cards fade out and the rest of the grid closes the gap; reduced motion: fade only.
  const close = springPlan(spring.gentle, reduce);
  const fadeMs =
    close.mode === "full" ? duration.short.ms : close.mode === "fade" ? close.duration : 0;
  const exiting = FadeOut.duration(fadeMs).reduceMotion(ReduceMotion.Never);
  const layout =
    close.mode === "full" && close.kind === "spring"
      ? LinearTransition.springify()
          .stiffness(close.stiffness)
          .damping(close.damping)
          .mass(close.mass)
          .reduceMotion(ReduceMotion.Never)
      : undefined;

  const openActions = (project: Project, step: ProjectActionsStep = "actions") => {
    playHaptic("projectActions");
    setActionsStep(step);
    setActionsFor(project);
  };
  const openCamera = (project: Project) => {
    router.push({ pathname: "/project/[id]/camera", params: { id: project.id } });
  };
  const pickSource = (source: ImportSource) => {
    setImportOpen(false);
    importFrom(source);
  };
  const deleteProject = async (project: Project) => {
    if (await remove(project)) setActionsFor(null);
  };
  const openImport = () => setImportOpen(true);

  return (
    // Own canvas: the stack's contentStyle does not repaint when the theme changes at runtime.
    <View style={[styles.screen, { backgroundColor: c.bg.canvas }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ top: barHeight }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: barHeight, paddingBottom: insets.bottom + space[6] },
        ]}
      >
        <LargeTitle title={title} scrollY={scrollY} />
        {(importing || notice !== null) && (
          <View style={styles.status} accessibilityLiveRegion="polite">
            {importing && <ActivityIndicator color={c.accent.default} />}
            <Text style={[body, styles.statusText, { color: importing ? c.text.muted : c.danger }]}>
              {importing ? t("library.importing") : notice}
            </Text>
          </View>
        )}
        {projects !== null && projects.length === 0 && (
          <View style={styles.empty}>
            <Text style={[body, { color: c.text.primary }]}>{t("library.empty")}</Text>
            <Text style={[body, { color: c.text.muted }]}>{t("library.emptyHint")}</Text>
            <Button variant="primary" icon="plus" disabled={importing} onPress={openImport}>
              {t("library.import")}
            </Button>
          </View>
        )}
        <View style={styles.grid}>
          {projects?.map((project) => (
            <Animated.View
              key={project.id}
              style={{ width: cardWidth }}
              exiting={exiting}
              layout={layout}
            >
              <ProjectCard
                project={project}
                onOpen={openCamera}
                onActions={openActions}
                onDelete={(p) => openActions(p, "confirmDelete")}
              />
            </Animated.View>
          ))}
        </View>
        {(__DEV__ || spikesEnabled) && (
          <View style={styles.dev}>
            {__DEV__ && (
              <Button variant="ghost" onPress={() => router.push("/dev/design")}>
                {t("devDesign.open")}
              </Button>
            )}
            {spikesEnabled && (
              <Button variant="ghost" onPress={() => router.push("/dev/camera")}>
                {t("cameraSpike.open")}
              </Button>
            )}
          </View>
        )}
      </Animated.ScrollView>
      <LargeTitleHeader
        title={title}
        scrollY={scrollY}
        trailing={
          <>
            <IconButton
              icon="plus"
              label={t("library.import")}
              disabled={importing}
              onPress={openImport}
            />
            <IconButton
              icon="settings"
              label={t("icons.settings")}
              onPress={() => router.push("/settings")}
            />
          </>
        }
      />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} onPick={pickSource} />
      <ProjectActionsSheet
        project={actionsFor}
        initialStep={actionsStep}
        onClose={() => setActionsFor(null)}
        onDelete={deleteProject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1 },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: GUTTER,
    paddingBottom: space[4],
  },
  statusText: { flexShrink: 1 },
  empty: { paddingHorizontal: GUTTER, gap: space[3], alignItems: "flex-start" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: GAP,
    rowGap: space[5],
    paddingHorizontal: GUTTER,
  },
  dev: {
    paddingHorizontal: GUTTER,
    paddingTop: space[6],
    gap: space[3],
    alignItems: "flex-start",
  },
});
