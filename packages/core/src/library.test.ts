import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  copyName,
  doneAction,
  duplicateProject,
  durationParts,
  EMPTY_LIBRARY_FILTER,
  featuredProject,
  filterProjects,
  isFilterActive,
  type LibraryFilter,
  libraryStatus,
  librarySummary,
  libraryView,
  normalizeProjectName,
  normalizeSearch,
  progressRatio,
  remapProjectPath,
  setProjectDone,
  sortProjects,
  tileMapCells,
} from "./library";
import type { Project, SplitConfig } from "./models";
import { createProject } from "./project";

const NOW = new Date("2026-11-05T12:00:00.000Z");
const GRID_3X3: SplitConfig = { rows: 3, cols: 3, overlapPx: 0, showOverlapTint: false };
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const compareNames = new Intl.Collator("es", { sensitivity: "base", numeric: true }).compare;

function project(n: number, overrides: Partial<Project> = {}): Project {
  return {
    ...createProject({
      id: ID(n),
      name: `Proyecto ${n}`,
      sourceUri: `projects/${ID(n)}/source.jpg`,
      opacity: 0.6,
      now: NOW,
    }),
    // Older the higher n, so the array is already «most recent first».
    updatedAt: new Date(NOW.getTime() - n * 60_000).toISOString(),
    ...overrides,
  };
}

const filter = (f: Partial<LibraryFilter>): LibraryFilter => ({ ...EMPTY_LIBRARY_FILTER, ...f });

describe("libraryStatus", () => {
  it("keeps the stored status when nothing is traced", () => {
    expect(libraryStatus(project(1))).toBe("pending");
    expect(libraryStatus(project(1, { status: "in_progress" }))).toBe("in_progress");
    expect(libraryStatus(project(1, { status: "done" }))).toBe("done");
  });

  it("is in progress as soon as a tile is done, even if the stored status is pending", () => {
    expect(libraryStatus(project(1, { split: GRID_3X3, completedTileIds: ["A1"] }))).toBe(
      "in_progress",
    );
  });

  it("is done when every tile is traced", () => {
    const all = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];
    expect(
      libraryStatus(project(1, { status: "in_progress", split: GRID_3X3, completedTileIds: all })),
    ).toBe("done");
  });

  it("does not call a 1 × 1 split done because its only tile is marked", () => {
    const whole: SplitConfig = { ...GRID_3X3, rows: 1, cols: 1 };
    expect(libraryStatus(project(1, { split: whole, completedTileIds: ["A1"] }))).toBe("pending");
  });

  it("ignores done tiles that are no longer in the grid", () => {
    expect(libraryStatus(project(1, { split: GRID_3X3, completedTileIds: ["Z9"] }))).toBe(
      "pending",
    );
  });
});

describe("progressRatio and doneAction", () => {
  it("is the share of tiles done, 1 when done and 0 for an unsplit project in progress", () => {
    expect(progressRatio(project(1, { split: GRID_3X3, completedTileIds: ["A1", "B2"] }))).toBe(
      2 / 9,
    );
    expect(progressRatio(project(1, { status: "done" }))).toBe(1);
    expect(progressRatio(project(1, { status: "in_progress" }))).toBe(0);
  });

  it("offers finish, reopen only for a stored done, and nothing when the tiles finished it", () => {
    expect(doneAction(project(1))).toBe("finish");
    expect(doneAction(project(1, { status: "done" }))).toBe("reopen");
    const all = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];
    expect(doneAction(project(1, { split: GRID_3X3, completedTileIds: all }))).toBeNull();
    // Reopening would change nothing: the traced tiles keep it done.
    expect(
      doneAction(project(1, { split: GRID_3X3, completedTileIds: all, status: "done" })),
    ).toBeNull();
  });
});

describe("normalizeSearch and filterProjects", () => {
  it("folds accents and case and trims", () => {
    expect(normalizeSearch("  Búho REAL ")).toBe("buho real");
    expect(normalizeSearch("Niño")).toBe("nino");
  });

  const owl = project(1, { name: "Búho real", categoryIds: ["animals"], status: "in_progress" });
  const lighthouse = project(2, { name: "Faro de Cíes", categoryIds: ["landscapes", "objects"] });
  const finch = project(3, { name: "Pinzón", categoryIds: ["animals"], status: "done" });
  const all = [owl, lighthouse, finch];

  it("matches the name without accents", () => {
    expect(filterProjects(all, filter({ query: "buho" }))).toEqual([owl]);
    expect(filterProjects(all, filter({ query: "CIES" }))).toEqual([lighthouse]);
    expect(filterProjects(all, filter({ query: "   " }))).toEqual(all);
  });

  it("filters by the library status and by any of the categories", () => {
    expect(filterProjects(all, filter({ status: "done" }))).toEqual([finch]);
    expect(filterProjects(all, filter({ categoryIds: ["objects", "people"] }))).toEqual([
      lighthouse,
    ]);
    expect(filterProjects(all, filter({ status: "pending", categoryIds: ["animals"] }))).toEqual(
      [],
    );
  });

  it("counts sheet filters for the badge and spots an active search", () => {
    expect(activeFilterCount(filter({ status: "done", categoryIds: ["a", "b"] }))).toBe(3);
    expect(activeFilterCount(filter({ query: "x" }))).toBe(0);
    expect(isFilterActive(filter({ query: "x" }))).toBe(true);
    expect(isFilterActive(filter({ query: "  " }))).toBe(false);
  });
});

describe("sortProjects", () => {
  const a = project(1, { name: "Zorro" });
  const b = project(2, { name: "árbol", split: GRID_3X3, completedTileIds: ["A1"] });
  const c = project(3, { name: "Búho", status: "done" });

  it("sorts by recent, name (collator, accents ignored) and progress", () => {
    expect(sortProjects([c, a, b], "recent", compareNames)).toEqual([a, b, c]);
    expect(sortProjects([a, b, c], "name", compareNames)).toEqual([b, c, a]);
    expect(sortProjects([a, b, c], "progress", compareNames)).toEqual([c, b, a]);
  });

  it("breaks ties by the most recent and does not touch the input", () => {
    const older = project(5, { name: "Igual" });
    const newer = project(4, { name: "igual" });
    const input = [older, newer];
    expect(sortProjects(input, "name", compareNames)).toEqual([newer, older]);
    expect(sortProjects(input, "progress", compareNames)).toEqual([newer, older]);
    expect(input).toEqual([older, newer]);
  });
});

describe("featuredProject and libraryView", () => {
  const done = project(1, { status: "done" });
  const latest = project(2, { status: "in_progress" });
  const pending = project(3);

  it("features the most recent project that is not done", () => {
    expect(featuredProject([pending, done, latest])).toBe(latest);
    expect(featuredProject([done])).toBeNull();
    expect(featuredProject([])).toBeNull();
  });

  it("leaves the featured project out of the grid", () => {
    const view = libraryView([done, latest, pending], EMPTY_LIBRARY_FILTER, "recent", compareNames);
    expect(view.featured).toBe(latest);
    expect(view.grid).toEqual([done, pending]);
  });

  it("hides the featured card and shows every match while filtering", () => {
    const view = libraryView(
      [done, latest, pending],
      filter({ status: "all", query: "proyecto" }),
      "recent",
      compareNames,
    );
    expect(view.featured).toBeNull();
    expect(view.grid).toEqual([done, latest, pending]);
  });
});

describe("librarySummary and durationParts", () => {
  it("counts drawings in progress and adds up the time", () => {
    const summary = librarySummary([
      project(1, { status: "in_progress", timeSpentMs: 60_000 }),
      project(2, { split: GRID_3X3, completedTileIds: ["A1"], timeSpentMs: 120_000 }),
      project(3, { status: "done", timeSpentMs: 1_000 }),
    ]);
    expect(summary).toEqual({ inProgress: 2, timeSpentMs: 181_000 });
  });

  it("splits into whole hours and minutes, rounding down", () => {
    expect(durationParts(0)).toEqual({ hours: 0, minutes: 0 });
    expect(durationParts(59_999)).toEqual({ hours: 0, minutes: 0 });
    expect(durationParts(8_100_000)).toEqual({ hours: 2, minutes: 15 });
    expect(durationParts(-5)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe("names", () => {
  it("normalizes a typed name or rejects an empty one", () => {
    expect(normalizeProjectName("  Búho   real \n")).toBe("Búho real");
    expect(normalizeProjectName("   ")).toBeNull();
    expect(normalizeProjectName("x".repeat(200))).toHaveLength(80);
  });

  const format = (name: string, n: number) =>
    n === 1 ? `${name} (copia)` : `${name} (copia ${n})`;

  it("picks the first free copy name, comparing like the search", () => {
    expect(copyName("Búho", ["Búho"], format)).toBe("Búho (copia)");
    expect(copyName("Búho", ["Búho", "buho (COPIA)"], format)).toBe("Búho (copia 2)");
    expect(copyName("Búho", ["Búho (copia)", "Búho (copia 2)"], format)).toBe("Búho (copia 3)");
  });
});

describe("duplicateProject", () => {
  const source = project(1, {
    status: "in_progress",
    split: GRID_3X3,
    completedTileIds: ["A1", "B2"],
    currentTileId: "B2",
    timeSpentMs: 90_000,
    opacity: 0.4,
    categoryIds: ["animals"],
    resultPhotoUri: `projects/${ID(1)}/result.jpg`,
    completedAt: NOW.toISOString(),
    notes: "nota",
  });

  it("copies the image, split, look and categories with no progress", () => {
    const copy = duplicateProject(source, { id: ID(9), name: "Copia", now: NOW });
    expect(copy).toMatchObject({
      id: ID(9),
      name: "Copia",
      sourceUri: `projects/${ID(9)}/source.jpg`,
      split: GRID_3X3,
      opacity: 0.4,
      categoryIds: ["animals"],
      completedTileIds: [],
      status: "pending",
      timeSpentMs: 0,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    expect(copy.currentTileId).toBeUndefined();
    expect(copy.resultPhotoUri).toBeUndefined();
    expect(copy.completedAt).toBeUndefined();
    expect(copy.notes).toBeUndefined();
    expect(copy.categoryIds).not.toBe(source.categoryIds);
  });

  it("only remaps paths inside the project's folder", () => {
    expect(remapProjectPath(`projects/${ID(1)}/source.png`, ID(1), ID(2))).toBe(
      `projects/${ID(2)}/source.png`,
    );
    expect(remapProjectPath("asset:sample.jpg", ID(1), ID(2))).toBe("asset:sample.jpg");
  });
});

describe("setProjectDone", () => {
  const later = new Date("2026-11-06T08:00:00.000Z");

  it("finishes with a date and reopens to in progress or pending", () => {
    const traced = project(1, { status: "in_progress", timeSpentMs: 1 });
    const done = setProjectDone(traced, true, later);
    expect(done).toMatchObject({ status: "done", completedAt: later.toISOString() });
    expect(done.updatedAt).toBe(later.toISOString());
    const reopened = setProjectDone(done, false, later);
    expect(reopened.status).toBe("in_progress");
    expect(reopened.completedAt).toBeUndefined();
    expect(setProjectDone(project(2, { status: "done" }), false, later).status).toBe("pending");
  });
});

describe("tileMapCells", () => {
  it("marks the current tile over done ones, and falls back to A1", () => {
    const split = { rows: 2, cols: 2 };
    const cells = tileMapCells({ split, currentTileId: "B1", completedTileIds: ["A1", "B1"] });
    expect(cells.map((c) => `${c.id}:${c.state}`)).toEqual([
      "A1:done",
      "A2:pending",
      "B1:current",
      "B2:pending",
    ]);
    expect(tileMapCells({ split, currentTileId: "Z9", completedTileIds: [] })[0]?.state).toBe(
      "current",
    );
  });
});
