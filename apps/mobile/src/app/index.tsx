import {
  activeFilterCount,
  EMPTY_LIBRARY_FILTER,
  filterProjects,
  isFilterActive,
  LIBRARY_TOOLBAR_MIN_PROJECTS,
  type LibraryFilter,
  type LibrarySort,
  librarySummary,
  type Project,
} from "@ar-darwin/core";
import {
  duration,
  library,
  space,
  spring,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Redirect, Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { IconButton } from "../components/IconButton";
import { LargeTitle } from "../components/LargeTitle";
import { LargeTitleHeader, useLargeTitleBarHeight } from "../components/LargeTitleHeader";
import { Snackbar } from "../components/Snackbar";
import { formatDuration } from "../format";
import { t } from "../i18n";
import { ActiveFilters } from "../library/ActiveFilters";
import { ContinueCard } from "../library/ContinueCard";
import { EmptyLibrary } from "../library/EmptyLibrary";
import { FilterSheet } from "../library/FilterSheet";
import { ImportSheet } from "../library/ImportSheet";
import type { ImportSource } from "../library/importSources";
import { LibraryToolbar } from "../library/LibraryToolbar";
import { ProjectActionsSheet, type ProjectActionsStep } from "../library/ProjectActionsSheet";
import { ProjectCard } from "../library/ProjectCard";
import { useCategories } from "../library/useCategories";
import { useLibraryQuery } from "../library/useLibraryQuery";
import { usePendingDeletion } from "../library/usePendingDeletion";
import { useProjects } from "../library/useProjects";
import { useAppSettings } from "../settings/AppSettingsProvider";
import { spikesEnabled } from "../spikes";
import { springPlan } from "../theme/motion";
import { playHaptic } from "../theme/playHaptic";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

const body = toNativeTextStyle(typography.body);
const sectionStyle = toNativeTextStyle(typography.title);
const countStyle = toNativeTextStyle(typography.value);
const labelStyle = toNativeTextStyle(typography.label);
const COLUMNS = 2;
const GUTTER = space[4];
const GAP = space[3];

/** The summary line under the title: «3 en curso. Llevas 14 h calcando.», or what applies of it. */
function summaryLine(projects: readonly Project[]): string | null {
  const { inProgress, timeSpentMs } = librarySummary(projects);
  const parts = [
    ...(inProgress > 0 ? [t("library.summaryInProgress", { count: inProgress })] : []),
    ...(timeSpentMs > 0 ? [t("library.summaryTime", { time: formatDuration(timeSpentMs) })] : []),
  ];
  return parts.length === 0 ? null : parts.join(" ");
}

/**
 * Library, the home screen. With no projects: the tracing drawing and the import sources. With
 * some: a summary line, «Keep tracing» (the latest unfinished project, one tap from the camera),
 * search and filters from `LIBRARY_TOOLBAR_MIN_PROJECTS` projects up, and the rest in a
 * two-column grid. A long press or «⋯» opens a project's actions; deleting hides the project at
 * once and offers «Undo» (see `usePendingDeletion`).
 * A plain ScrollView, not a FlatList: Reanimated's layout transitions (the grid closing the gap
 * of a deleted card) only work on a single-column FlatList, and a personal library stays small.
 */
function LibraryScreen() {
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
  const {
    projects,
    importing,
    notice,
    importFrom,
    remove,
    rename,
    setCategories,
    setDone,
    duplicate,
  } = useProjects();
  const categories = useCategories();
  const deletion = usePendingDeletion(remove);
  const pendingId = deletion.pending?.id;
  // The project waiting to be deleted is already gone from everything on screen.
  const visible = useMemo(
    () => projects?.filter((project) => project.id !== pendingId) ?? null,
    [projects, pendingId],
  );
  const query = useLibraryQuery(visible ?? []);
  const [importOpen, setImportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<Project | null>(null);
  const [actionsStep, setActionsStep] = useState<ProjectActionsStep>("actions");
  const [toast, setToast] = useState<string | null>(null);
  const c = theme.color;
  const title = t("library.title");
  const cardWidth = (width - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  // A confirmation (a copy made) stays as long as the undo window.
  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), library.undoMs);
    return () => clearTimeout(timer);
  }, [toast]);

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
  const openSplitter = (project: Project) => {
    setActionsFor(null);
    router.push({ pathname: "/project/[id]/split", params: { id: project.id } });
  };
  const pickSource = (source: ImportSource) => {
    setImportOpen(false);
    importFrom(source);
  };
  const deleteProject = (project: Project) => {
    setActionsFor(null);
    setToast(null);
    playHaptic("projectDeleted");
    deletion.schedule(project);
  };
  const duplicateProject = async (project: Project) => {
    setActionsFor(null);
    const copy = await duplicate(project);
    if (copy !== null) setToast(t("library.actions.duplicated", { name: copy.name }));
  };
  const markDone = (project: Project, done: boolean) => {
    setActionsFor(null);
    setDone(project, done);
  };
  const applyFilters = (filter: LibraryFilter, sort: LibrarySort) => {
    query.setFilter(filter);
    query.setSort(sort);
    setFilterOpen(false);
  };
  const clearFilters = () => query.setFilter({ ...EMPTY_LIBRARY_FILTER });

  const empty = visible !== null && visible.length === 0;
  const filtering = isFilterActive(query.filter);
  // With only a search typed, «Clear filters» would name something the person never set.
  const onlySearch = filtering && activeFilterCount(query.filter) === 0;
  const { featured, grid } = query.view;
  const showToolbar =
    visible !== null && (visible.length >= LIBRARY_TOOLBAR_MIN_PROJECTS || filtering);
  const summary = visible === null || empty ? null : summaryLine(visible);

  return (
    // Own canvas: the stack's contentStyle does not repaint when the theme changes at runtime.
    <View style={[styles.screen, { backgroundColor: c.bg.canvas }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ top: barHeight }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: barHeight, paddingBottom: insets.bottom + space[6] + touchTarget },
        ]}
      >
        <LargeTitle title={title} scrollY={scrollY} />
        <View style={styles.body}>
          {summary !== null && <Text style={[body, { color: c.text.muted }]}>{summary}</Text>}
          {(importing || notice !== null) && (
            <View style={styles.status} accessibilityLiveRegion="polite">
              {importing && <ActivityIndicator color={c.accent.default} />}
              <Text
                style={[body, styles.statusText, { color: importing ? c.text.muted : c.danger }]}
              >
                {importing ? t("library.importing") : notice}
              </Text>
            </View>
          )}
          {empty && <EmptyLibrary importing={importing} onPick={importFrom} />}
          {!filtering && featured !== null && (
            <ContinueCard
              project={featured}
              onOpen={openCamera}
              onActions={openActions}
              onSplit={openSplitter}
            />
          )}
          {showToolbar && (
            <View style={styles.toolbar}>
              <LibraryToolbar
                query={query.filter.query}
                onQueryChange={(text) => query.setFilter({ ...query.filter, query: text })}
                activeFilters={activeFilterCount(query.filter)}
                onOpenFilters={() => setFilterOpen(true)}
              />
              <ActiveFilters
                filter={query.filter}
                categories={categories}
                onChange={query.setFilter}
              />
            </View>
          )}
          {(grid.length > 0 || filtering) && (featured !== null || filtering) && (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitle} accessibilityLiveRegion="polite">
                <Text style={[sectionStyle, { color: c.text.primary }]}>
                  {filtering ? t("library.resultsTitle") : t("library.othersTitle")}
                </Text>
                <Text style={[countStyle, { color: c.text.muted }]}>{grid.length}</Text>
              </View>
              {showToolbar && (
                <Pressable
                  onPress={() => setFilterOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t("library.filter.sortedBy", {
                    sort: t(`library.sort.${query.sort}`),
                  })}
                  style={styles.sort}
                >
                  <Icon name="sort" size={library.smallIcon} color={c.text.muted} />
                  <Text style={[labelStyle, { color: c.text.muted }]}>
                    {t(`library.sort.${query.sort}`)}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          {filtering && grid.length === 0 && (
            <View style={styles.noResults}>
              <Text style={[body, { color: c.text.primary }]}>{t("library.noResults")}</Text>
              <Button variant="secondary" icon="close" onPress={clearFilters}>
                {t(onlySearch ? "library.clearSearch" : "library.clearFilters")}
              </Button>
            </View>
          )}
        </View>
        <View style={styles.grid}>
          {grid.map((project) => (
            <Animated.View
              key={project.id}
              style={{ width: cardWidth }}
              exiting={exiting}
              layout={layout}
            >
              <ProjectCard
                project={project}
                categories={categories}
                onOpen={openCamera}
                onActions={openActions}
                onRename={(p) => openActions(p, "rename")}
                onDuplicate={duplicateProject}
                onDelete={deleteProject}
              />
            </Animated.View>
          ))}
        </View>
        {visible !== null && visible.length === 1 && (
          <Text style={[body, styles.hint, { color: c.text.muted }]}>
            {t("library.oneProjectHint")}
          </Text>
        )}
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
            {!empty && (
              <Button
                variant="secondary"
                icon="plus"
                compact
                disabled={importing}
                onPress={() => setImportOpen(true)}
              >
                {t("library.import")}
              </Button>
            )}
            <IconButton
              icon="settings"
              label={t("icons.settings")}
              onPress={() => router.push("/settings")}
            />
          </>
        }
      />
      {deletion.pending !== null ? (
        <Snackbar
          key={deletion.pending.id}
          message={t("library.actions.deleted", { name: deletion.pending.name })}
          action={{ label: t("library.actions.undo"), onPress: deletion.undo }}
        />
      ) : (
        toast !== null && <Snackbar key={toast} message={toast} />
      )}
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} onPick={pickSource} />
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filter={query.filter}
        sort={query.sort}
        categories={categories}
        countFor={(filter) => filterProjects(visible ?? [], filter).length}
        onApply={applyFilters}
      />
      <ProjectActionsSheet
        project={actionsFor}
        initialStep={actionsStep}
        categories={categories}
        onClose={() => setActionsFor(null)}
        onSplit={openSplitter}
        onRename={rename}
        onSetCategories={setCategories}
        onDuplicate={duplicateProject}
        onSetDone={markDone}
        onDelete={deleteProject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1 },
  body: { paddingHorizontal: GUTTER, paddingBottom: space[4], gap: space[4] },
  status: { flexDirection: "row", alignItems: "center", gap: space[2] },
  statusText: { flexShrink: 1 },
  toolbar: { gap: space[2] },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
    minHeight: touchTarget,
  },
  sectionTitle: { flexDirection: "row", alignItems: "baseline", gap: space[2], flexShrink: 1 },
  sort: {
    minHeight: touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    paddingLeft: space[3],
  },
  noResults: { gap: space[3], alignItems: "flex-start" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: GAP,
    rowGap: space[5],
    paddingHorizontal: GUTTER,
  },
  hint: { paddingHorizontal: GUTTER, paddingTop: space[4] },
  dev: {
    paddingHorizontal: GUTTER,
    paddingTop: space[6],
    gap: space[3],
    alignItems: "flex-start",
  },
});

/**
 * The home route. While the first-run introduction was never finished it sends the person there
 * before the Library renders (the splash is still up until the settings are read, so nothing flashes).
 */
export default function Index() {
  const { onboardingDone } = useAppSettings();
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  return <LibraryScreen />;
}
