import { projectDir } from "./importImage";
import { type Project, ProjectSchema, type ProjectStatus } from "./models";
import { libraryTileProgress } from "./splitConfig";

/** Longest name a project keeps; longer input is cut (the cards show one line anyway). */
export const MAX_PROJECT_NAME_LENGTH = 80;

/** Projects from which the library shows its search and filter bar; below it, the bar is noise. */
export const LIBRARY_TOOLBAR_MIN_PROJECTS = 5;

/**
 * The status the library shows and filters by. A split project whose every tile is traced counts as
 * done even if nobody marked it (the camera only marks tiles); a tile marked done also means the
 * drawing has started.
 */
export function libraryStatus(
  project: Pick<Project, "status" | "split" | "completedTileIds">,
): ProjectStatus {
  if (project.status === "done") return "done";
  const progress = libraryTileProgress(project);
  if (progress !== null && progress.done === progress.total) return "done";
  if (project.status === "in_progress" || (progress?.done ?? 0) > 0) return "in_progress";
  return "pending";
}

/** How far along a project is, 0..1: its traced tiles, or 0/1 for a project that was never split. */
export function progressRatio(
  project: Pick<Project, "status" | "split" | "completedTileIds">,
): number {
  if (libraryStatus(project) === "done") return 1;
  const progress = libraryTileProgress(project);
  return progress === null ? 0 : progress.done / progress.total;
}

/**
 * Which «done» action a project's sheet offers. «Reopen» only undoes a stored «done»: a project that
 * is done because every tile is traced has nothing to reopen (unmark a tile in the camera instead).
 */
export function doneAction(
  project: Pick<Project, "status" | "split" | "completedTileIds">,
): "finish" | "reopen" | null {
  if (project.status === "done") return "reopen";
  return libraryStatus(project) === "done" ? null : "finish";
}

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Search form of a text: no accents («Búho» → «buho»), lower case, trimmed. */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

export type LibraryStatusFilter = ProjectStatus | "all";

export type LibraryFilter = {
  /** What the person typed in the search field; matched against the name. */
  query: string;
  status: LibraryStatusFilter;
  /** A project matches when it has any of them. Empty = every category. */
  categoryIds: readonly string[];
};

export const EMPTY_LIBRARY_FILTER: LibraryFilter = { query: "", status: "all", categoryIds: [] };

/** Filters set in the sheet (status and categories, not the search), for the «Filter» badge. */
export function activeFilterCount(filter: LibraryFilter): number {
  return (filter.status === "all" ? 0 : 1) + filter.categoryIds.length;
}

/** Whether anything narrows the list, the search included. */
export function isFilterActive(filter: LibraryFilter): boolean {
  return normalizeSearch(filter.query) !== "" || activeFilterCount(filter) > 0;
}

/** The projects that match the search, the status and any of the categories, in the given order. */
export function filterProjects<P extends Project>(
  projects: readonly P[],
  filter: LibraryFilter,
): P[] {
  const query = normalizeSearch(filter.query);
  return projects.filter(
    (project) =>
      (query === "" || normalizeSearch(project.name).includes(query)) &&
      (filter.status === "all" || libraryStatus(project) === filter.status) &&
      (filter.categoryIds.length === 0 ||
        project.categoryIds.some((id) => filter.categoryIds.includes(id))),
  );
}

export type LibrarySort = "recent" | "name" | "progress";

export const LIBRARY_SORTS: readonly LibrarySort[] = ["recent", "name", "progress"];

const byRecent = (a: Project, b: Project) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

/**
 * The projects in a new array, sorted. «name» uses `compareNames` (the app passes an
 * `Intl.Collator` of the active language); «progress» goes from most to least advanced. Ties fall
 * back to the most recent first, then to the input order (the sort is stable).
 */
export function sortProjects<P extends Project>(
  projects: readonly P[],
  sort: LibrarySort,
  compareNames: (a: string, b: string) => number,
): P[] {
  const compare: (a: P, b: P) => number =
    sort === "name"
      ? (a, b) => compareNames(a.name, b.name) || byRecent(a, b)
      : sort === "progress"
        ? (a, b) => progressRatio(b) - progressRatio(a) || byRecent(a, b)
        : byRecent;
  return [...projects].sort(compare);
}

/** «Keep tracing»: the most recently updated project that is not done, or `null`. */
export function featuredProject<P extends Project>(projects: readonly P[]): P | null {
  let best: P | null = null;
  for (const project of projects) {
    if (libraryStatus(project) === "done") continue;
    if (best === null || byRecent(project, best) < 0) best = project;
  }
  return best;
}

export type LibraryView<P> = {
  /** The «Keep tracing» card; hidden while a search or filter narrows the list. */
  featured: P | null;
  /** The grid: every match, minus the featured project. */
  grid: P[];
};

/** What the library screen shows for a filter and an order. */
export function libraryView<P extends Project>(
  projects: readonly P[],
  filter: LibraryFilter,
  sort: LibrarySort,
  compareNames: (a: string, b: string) => number,
): LibraryView<P> {
  const featured = isFilterActive(filter) ? null : featuredProject(projects);
  const matches = sortProjects(filterProjects(projects, filter), sort, compareNames);
  return { featured, grid: matches.filter((project) => project !== featured) };
}

/** The header line: drawings in progress and the time spent tracing, all projects together. */
export function librarySummary(projects: readonly Project[]): {
  inProgress: number;
  timeSpentMs: number;
} {
  let inProgress = 0;
  let timeSpentMs = 0;
  for (const project of projects) {
    if (libraryStatus(project) === "in_progress") inProgress++;
    timeSpentMs += project.timeSpentMs;
  }
  return { inProgress, timeSpentMs };
}

/** Whole hours and the minutes left over (rounded down), for «2 h 15 min». */
export function durationParts(ms: number): { hours: number; minutes: number } {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** A typed name made safe to save: trimmed, inner runs of spaces collapsed, capped; `null` if empty. */
export function normalizeProjectName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_PROJECT_NAME_LENGTH).trim();
  return name === "" ? null : name;
}

/**
 * The name of a copy: `format(name, 1)` («Búho (copia)»), or the first `format(name, n)` that no
 * project uses yet («Búho (copia 2)»). Names compare as the search does, so «búho (copia)» counts.
 */
export function copyName(
  name: string,
  existingNames: readonly string[],
  format: (name: string, n: number) => string,
): string {
  const taken = new Set(existingNames.map(normalizeSearch));
  for (let n = 1; ; n++) {
    const candidate = normalizeProjectName(format(name, n)) ?? name;
    if (!taken.has(normalizeSearch(candidate))) return candidate;
  }
}

/**
 * Moves a stored file of one project into another's folder («projects/<from>/source.jpg» →
 * «projects/<to>/source.jpg»). Anything outside the project's folder (a bundled asset) stays as is.
 */
export function remapProjectPath(stored: string, fromId: string, toId: string): string {
  const prefix = `${projectDir(fromId)}/`;
  return stored.startsWith(prefix) ? `${projectDir(toId)}/${stored.slice(prefix.length)}` : stored;
}

/**
 * A clean copy to trace again: same image, split, placement, opacity, adjustments and categories;
 * no progress (no tiles done, no time, pending, back on the first tile) and no result photo, date
 * or notes. The app copies the files to the new folder before saving it.
 */
export function duplicateProject(
  source: Project,
  { id, name, now }: { id: string; name: string; now: Date },
): Project {
  const {
    resultPhotoUri: _photo,
    resultTransform: _photoTransform,
    completedAt: _completedAt,
    notes: _notes,
    currentTileId: _tile,
    ...kept
  } = source;
  const timestamp = now.toISOString();
  return ProjectSchema.parse({
    ...kept,
    id,
    name,
    sourceUri: remapProjectPath(source.sourceUri, source.id, id),
    completedTileIds: [],
    status: "pending",
    timeSpentMs: 0,
    categoryIds: [...source.categoryIds],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Marks a project as finished (status `done`, stamped `completedAt`) or reopens it: back to «in
 * progress» if it was ever traced, else to «pending».
 */
export function setProjectDone(project: Project, done: boolean, now: Date): Project {
  const updatedAt = now.toISOString();
  if (done) return { ...project, status: "done", completedAt: updatedAt, updatedAt };
  const { completedAt: _completedAt, ...rest } = project;
  const traced = project.completedTileIds.length > 0 || project.timeSpentMs > 0;
  return { ...rest, status: traced ? "in_progress" : "pending", updatedAt };
}
