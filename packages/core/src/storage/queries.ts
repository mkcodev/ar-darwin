/**
 * SQL of the project repository, shared by the app (expo-sqlite) and the tests (node:sqlite).
 * Positional `?` parameters only: both drivers accept them the same way.
 */

/** Params: projectRowParams(row). Keeps created_at of an existing row. */
export const UPSERT_PROJECT = `
INSERT INTO projects (
  id, name, source_uri, transform, transform_viewport, opacity, split, current_tile_id, status,
  result_photo_uri, result_transform, completed_at, notes, difficulty, time_spent_ms, created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  source_uri = excluded.source_uri,
  transform = excluded.transform,
  transform_viewport = excluded.transform_viewport,
  opacity = excluded.opacity,
  split = excluded.split,
  current_tile_id = excluded.current_tile_id,
  status = excluded.status,
  result_photo_uri = excluded.result_photo_uri,
  result_transform = excluded.result_transform,
  completed_at = excluded.completed_at,
  notes = excluded.notes,
  difficulty = excluded.difficulty,
  time_spent_ms = excluded.time_spent_ms,
  updated_at = excluded.updated_at`;

/**
 * Params: cameraStateParams(id, state, now). What the project camera saves: transform and the
 * canvas it is relative to always go together, plus opacity, status and time spent.
 */
export const UPDATE_PROJECT_CAMERA = `
UPDATE projects SET
  transform = ?,
  transform_viewport = ?,
  opacity = ?,
  status = ?,
  time_spent_ms = ?,
  updated_at = ?
WHERE id = ?`;

export const SELECT_PROJECTS = "SELECT * FROM projects ORDER BY updated_at DESC, id";

/** Params: [id]. */
export const SELECT_PROJECT = "SELECT * FROM projects WHERE id = ?";

/** Params: [id]. Cascades to project_categories. */
export const DELETE_PROJECT = "DELETE FROM projects WHERE id = ?";

/** Every project↔category link, in category order. */
export const SELECT_PROJECT_CATEGORIES = `
SELECT pc.project_id, pc.category_id FROM project_categories pc
JOIN categories c ON c.id = pc.category_id
ORDER BY c.sort_order, c.id`;

/** Params: [projectId]. Same as SELECT_PROJECT_CATEGORIES for one project. */
export const SELECT_CATEGORIES_OF_PROJECT = `
SELECT pc.project_id, pc.category_id FROM project_categories pc
JOIN categories c ON c.id = pc.category_id
WHERE pc.project_id = ?
ORDER BY c.sort_order, c.id`;

/** Params: [projectId]. */
export const DELETE_CATEGORIES_OF_PROJECT = "DELETE FROM project_categories WHERE project_id = ?";

/** Params: [projectId, categoryId]. */
export const INSERT_PROJECT_CATEGORY =
  "INSERT INTO project_categories (project_id, category_id) VALUES (?, ?)";

export const SELECT_CATEGORIES = "SELECT * FROM categories ORDER BY sort_order, id";

export const SELECT_SCHEMA_VERSION = "PRAGMA user_version";
