import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY_IDS, IDENTITY_TRANSFORM, type Project } from "../models";
import { createProject, createProjectId } from "../project";
import {
  DEFAULT_CATEGORY_STYLES,
  LATEST_SCHEMA_VERSION,
  MIGRATIONS,
  pendingMigrations,
  setSchemaVersionSql,
} from "./migrations";
import {
  DELETE_CATEGORIES_OF_PROJECT,
  DELETE_PROJECT,
  INSERT_PROJECT_CATEGORY,
  SELECT_CATEGORIES,
  SELECT_CATEGORIES_OF_PROJECT,
  SELECT_PROJECT,
  SELECT_PROJECT_CATEGORIES,
  SELECT_PROJECTS,
  SELECT_SCHEMA_VERSION,
  UPSERT_PROJECT,
} from "./queries";
import {
  categoryFromRow,
  groupCategoryIds,
  projectFromRow,
  projectRowParams,
  projectToRow,
} from "./rows";

/** The same steps as apps/mobile/src/storage/database.ts, on Node's built-in SQLite. */
function migrate(db: DatabaseSync, upTo = LATEST_SCHEMA_VERSION): DatabaseSync {
  const version = Number(db.prepare(SELECT_SCHEMA_VERSION).get()?.user_version);
  for (const migration of pendingMigrations(version)) {
    if (migration.version > upTo) break;
    db.exec("BEGIN");
    db.exec(migration.sql);
    db.exec(setSchemaVersionSql(migration.version));
    db.exec("COMMIT");
  }
  return db;
}

function openMigrated(upTo = LATEST_SCHEMA_VERSION): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  return migrate(db, upTo);
}

function save(db: DatabaseSync, project: Project): void {
  db.prepare(UPSERT_PROJECT).run(...projectRowParams(projectToRow(project)));
  db.prepare(DELETE_CATEGORIES_OF_PROJECT).run(project.id);
  for (const categoryId of project.categoryIds) {
    db.prepare(INSERT_PROJECT_CATEGORY).run(project.id, categoryId);
  }
}

function load(db: DatabaseSync, id: string): Project | null {
  const row = db.prepare(SELECT_PROJECT).get(id);
  if (!row) return null;
  const links = groupCategoryIds(db.prepare(SELECT_CATEGORIES_OF_PROJECT).all(id));
  return projectFromRow(row, links.get(id) ?? []);
}

function newProject(name: string, at: string, overrides: Partial<Project> = {}): Project {
  return {
    ...createProject({
      id: createProjectId(),
      name,
      sourceUri: `projects/${name}/source.jpg`,
      opacity: 0.62,
      now: new Date(at),
    }),
    ...overrides,
  };
}

describe("pendingMigrations", () => {
  it("has consecutive versions from 1", () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(
      Array.from({ length: MIGRATIONS.length }, (_, i) => i + 1),
    );
    expect(LATEST_SCHEMA_VERSION).toBe(MIGRATIONS.length);
  });

  it("returns every migration for a new database and none for an up-to-date one", () => {
    expect(pendingMigrations(0)).toEqual(MIGRATIONS);
    expect(pendingMigrations(LATEST_SCHEMA_VERSION)).toEqual([]);
  });

  it("throws for a database newer than the app or an invalid version", () => {
    expect(() => pendingMigrations(LATEST_SCHEMA_VERSION + 1)).toThrow(/^pendingMigrations:/);
    expect(() => pendingMigrations(-1)).toThrow(/^pendingMigrations:/);
    expect(() => pendingMigrations(1.5)).toThrow(/^pendingMigrations:/);
  });
});

describe("migrations on SQLite", () => {
  it("sets user_version to the latest version", () => {
    const db = openMigrated();
    expect(db.prepare(SELECT_SCHEMA_VERSION).get()?.user_version).toBe(LATEST_SCHEMA_VERSION);
  });

  it("seeds the built-in categories with i18n keys, in order", () => {
    const categories = openMigrated(1).prepare(SELECT_CATEGORIES).all().map(categoryFromRow);
    expect(categories.map((c) => c.id)).toEqual([...DEFAULT_CATEGORY_IDS]);
    expect(categories[0]).toEqual({
      id: "animals",
      key: "categories.animals",
      isDefault: true,
      order: 0,
    });
  });

  it("v2 gives every built-in category its colour key and icon", () => {
    const categories = openMigrated().prepare(SELECT_CATEGORIES).all().map(categoryFromRow);
    for (const category of categories) {
      const id = DEFAULT_CATEGORY_IDS.find((d) => d === category.id);
      expect(id).toBeDefined();
      if (id === undefined) continue;
      expect(category.color).toBe(DEFAULT_CATEGORY_STYLES[id].color);
      expect(category.icon).toBe(DEFAULT_CATEGORY_STYLES[id].icon);
    }
    expect(categories[0]).toEqual({
      id: "animals",
      key: "categories.animals",
      isDefault: true,
      color: "ochre",
      icon: "animal",
      order: 0,
    });
  });

  it("v2 never overwrites a colour or icon already set", () => {
    const db = openMigrated(1);
    db.exec("UPDATE categories SET color = 'pine' WHERE id = 'animals'");
    db.exec("UPDATE categories SET icon = 'image' WHERE id = 'people'");
    migrate(db);
    const byId = new Map(
      db
        .prepare(SELECT_CATEGORIES)
        .all()
        .map(categoryFromRow)
        .map((c) => [c.id, c]),
    );
    expect(byId.get("animals")).toMatchObject({ color: "pine", icon: "animal" });
    expect(byId.get("people")).toMatchObject({ color: "plum", icon: "image" });
  });

  it("v2 only touches built-in categories", () => {
    const db = openMigrated(1);
    db.exec("INSERT INTO categories (id, name, sort_order) VALUES ('birds', 'Pájaros', 6)");
    migrate(db);
    const birds = db.prepare(SELECT_CATEGORIES).all().map(categoryFromRow).at(-1);
    expect(birds).toEqual({ id: "birds", name: "Pájaros", isDefault: false, order: 6 });
  });

  it("a v1 database with projects migrates to the latest without losing them", () => {
    const db = openMigrated(1);
    const project = newProject("p", "2026-10-10T10:00:00.000Z", { categoryIds: ["animals"] });
    save(db, project);
    expect(pendingMigrations(1).map((m) => m.version)).toEqual([2]);
    migrate(db);
    expect(db.prepare(SELECT_SCHEMA_VERSION).get()?.user_version).toBe(LATEST_SCHEMA_VERSION);
    expect(load(db, project.id)).toEqual(project);
  });

  it("enforces the CHECK constraints", () => {
    const db = openMigrated();
    const row = projectToRow(newProject("a", "2026-10-10T10:00:00.000Z"));
    expect(() =>
      db.prepare(UPSERT_PROJECT).run(...projectRowParams({ ...row, status: "x" })),
    ).toThrow();
    expect(() =>
      db.prepare(UPSERT_PROJECT).run(...projectRowParams({ ...row, difficulty: 6 })),
    ).toThrow();
    expect(() =>
      db
        .prepare("INSERT INTO categories (id, key, name, sort_order) VALUES ('c', 'k', 'n', 9)")
        .run(),
    ).toThrow();
  });
});

describe("project repository SQL", () => {
  it("round-trips a full project with categories", () => {
    const db = openMigrated();
    const project = newProject("full", "2026-10-10T10:00:00.000Z", {
      transform: { ...IDENTITY_TRANSFORM, x: 120.5, scale: 0.4, rotation: -30, flipX: true },
      split: { rows: 2, cols: 3, overlapPx: 12, showOverlapTint: false },
      currentTileId: "A2",
      status: "done",
      resultPhotoUri: "projects/full/result.jpg",
      resultTransform: IDENTITY_TRANSFORM,
      completedAt: "2026-10-11T09:00:00.000Z",
      notes: "Bien",
      difficulty: 4,
      timeSpentMs: 5400000,
      categoryIds: ["people", "animals"],
    });
    save(db, project);
    // Categories come back in category order, not insertion order.
    expect(load(db, project.id)).toEqual({ ...project, categoryIds: ["animals", "people"] });
  });

  it("round-trips a minimal project", () => {
    const db = openMigrated();
    const project = newProject("min", "2026-10-10T10:00:00.000Z");
    save(db, project);
    expect(load(db, project.id)).toEqual(project);
  });

  it("upserts: updates fields and categories but keeps created_at", () => {
    const db = openMigrated();
    const project = newProject("p", "2026-10-10T10:00:00.000Z", { categoryIds: ["animals"] });
    save(db, project);
    save(db, {
      ...project,
      name: "renamed",
      createdAt: "2030-01-01T00:00:00.000Z",
      updatedAt: "2026-10-10T11:00:00.000Z",
      categoryIds: ["objects"],
    });
    expect(load(db, project.id)).toMatchObject({
      name: "renamed",
      createdAt: project.createdAt,
      updatedAt: "2026-10-10T11:00:00.000Z",
      categoryIds: ["objects"],
    });
  });

  it("lists the most recently updated first, with their categories", () => {
    const db = openMigrated();
    const old = newProject("old", "2026-10-01T10:00:00.000Z", { categoryIds: ["manga"] });
    const recent = newProject("recent", "2026-10-09T10:00:00.000Z");
    save(db, old);
    save(db, recent);
    const links = groupCategoryIds(db.prepare(SELECT_PROJECT_CATEGORIES).all());
    const list = db
      .prepare(SELECT_PROJECTS)
      .all()
      .map((row) => projectFromRow(row, links.get(String(row.id)) ?? []));
    expect(list.map((p) => p.name)).toEqual(["recent", "old"]);
    expect(list[1]?.categoryIds).toEqual(["manga"]);
  });

  it("deleting a project cascades to its category links", () => {
    const db = openMigrated();
    const project = newProject("p", "2026-10-10T10:00:00.000Z", { categoryIds: ["animals"] });
    save(db, project);
    db.prepare(DELETE_PROJECT).run(project.id);
    expect(load(db, project.id)).toBeNull();
    expect(db.prepare(SELECT_PROJECT_CATEGORIES).all()).toEqual([]);
    expect(db.prepare(SELECT_CATEGORIES).all()).toHaveLength(DEFAULT_CATEGORY_IDS.length);
  });

  it("rejects a link to a category that does not exist", () => {
    const db = openMigrated();
    const project = newProject("p", "2026-10-10T10:00:00.000Z", { categoryIds: ["nope"] });
    expect(() => save(db, project)).toThrow();
  });
});

describe("projectFromRow", () => {
  const row = projectToRow(newProject("p", "2026-10-10T10:00:00.000Z"));

  it("throws for a corrupt row", () => {
    expect(() => projectFromRow({ ...row, transform: "{oops" }, [])).toThrow(/^projectFromRow:/);
    expect(() => projectFromRow({ ...row, opacity: "high" }, [])).toThrow(/^projectFromRow:/);
    expect(() => projectFromRow({ ...row, transform: '{"x":0}' }, [])).toThrow(/^projectFromRow:/);
    expect(() => projectFromRow(null, [])).toThrow(/^projectFromRow:/);
  });
});
