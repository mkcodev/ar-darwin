import { DEFAULT_CATEGORY_IDS, type DefaultCategoryId, defaultCategoryKey } from "../models";

/**
 * Numbered SQLite migrations. The database keeps its version in `PRAGMA user_version` (0 when
 * new); the app runs every migration above it in order, each in a transaction, and then sets
 * `user_version` to that migration's version. Never edit a released migration: append a new one.
 */
export type Migration = { version: number; sql: string };

const seedCategories = DEFAULT_CATEGORY_IDS.map(
  (id, order) =>
    `INSERT INTO categories (id, key, name, is_default, color, icon, sort_order) VALUES ('${id}', '${defaultCategoryKey(id)}', NULL, 1, NULL, NULL, ${order});`,
).join("\n");

/**
 * Colour key and icon name of each built-in category, as migration 2 writes them. Keys of the
 * packages/ui palette (`theme.color.category[key]`) and icon set, never hex values; apps/mobile
 * checks them against packages/ui at typecheck time. Frozen with the migration: never edit.
 */
export const DEFAULT_CATEGORY_STYLES = {
  animals: { color: "ochre", icon: "animal" },
  people: { color: "plum", icon: "person" },
  landscapes: { color: "moss", icon: "landscape" },
  manga: { color: "indigo", icon: "manga" },
  objects: { color: "sepia", icon: "object" },
  lettering: { color: "slate", icon: "lettering" },
} as const satisfies Record<DefaultCategoryId, { color: string; icon: string }>;

// Each column only where it is still NULL: never overwrite a value already set.
const fillCategoryStyles = DEFAULT_CATEGORY_IDS.flatMap((id) => {
  const { color, icon } = DEFAULT_CATEGORY_STYLES[id];
  return [
    `UPDATE categories SET color = '${color}' WHERE id = '${id}' AND is_default = 1 AND color IS NULL;`,
    `UPDATE categories SET icon = '${icon}' WHERE id = '${id}' AND is_default = 1 AND icon IS NULL;`,
  ];
}).join("\n");

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
CREATE TABLE projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  source_uri TEXT NOT NULL,
  transform TEXT NOT NULL,
  opacity REAL NOT NULL CHECK (opacity BETWEEN 0 AND 1),
  split TEXT,
  current_tile_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  result_photo_uri TEXT,
  result_transform TEXT,
  completed_at TEXT,
  notes TEXT,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  time_spent_ms INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_ms >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX projects_updated_at ON projects (updated_at DESC);

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT UNIQUE,
  name TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL,
  CHECK ((key IS NULL) <> (name IS NULL))
);

CREATE TABLE project_categories (
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, category_id)
);
CREATE INDEX project_categories_category ON project_categories (category_id);

${seedCategories}
`,
  },
  {
    // Colour and icon of the built-in categories (palette and icons from packages/ui).
    version: 2,
    sql: fillCategoryStyles,
  },
  {
    // Canvas each project's transform was saved for (JSON {width, height}); NULL = never placed,
    // so existing projects get fitted the first time their camera opens.
    version: 3,
    sql: "ALTER TABLE projects ADD COLUMN transform_viewport TEXT;",
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.length;

/** Migrations still to run on a database at `currentVersion`, in order. */
export function pendingMigrations(currentVersion: number): readonly Migration[] {
  if (!Number.isInteger(currentVersion) || currentVersion < 0) {
    throw new Error(`pendingMigrations: invalid schema version ${currentVersion}`);
  }
  if (currentVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `pendingMigrations: database is at version ${currentVersion}, newer than this app (${LATEST_SCHEMA_VERSION})`,
    );
  }
  return MIGRATIONS.slice(currentVersion);
}

/** Statement that records a migration as applied; run in the same transaction as its SQL. */
export function setSchemaVersionSql(version: number): string {
  return `PRAGMA user_version = ${version}`;
}
