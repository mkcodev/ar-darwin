import * as z from "zod";
import { type Category, CategorySchema, type Project, ProjectSchema, type Size } from "../models";

/** A `projects` row as SQLite returns it: snake_case, JSON in TEXT columns, NULL for missing. */
const ProjectRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  source_uri: z.string(),
  transform: z.string(),
  transform_viewport: z.string().nullable(),
  opacity: z.number(),
  split: z.string().nullable(),
  current_tile_id: z.string().nullable(),
  status: z.string(),
  result_photo_uri: z.string().nullable(),
  result_transform: z.string().nullable(),
  completed_at: z.string().nullable(),
  notes: z.string().nullable(),
  difficulty: z.number().nullable(),
  time_spent_ms: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProjectRow = z.infer<typeof ProjectRowSchema>;

const CategoryRowSchema = z.object({
  id: z.string(),
  key: z.string().nullable(),
  name: z.string().nullable(),
  is_default: z.number(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  sort_order: z.number(),
});
export type CategoryRow = z.infer<typeof CategoryRowSchema>;

const ProjectCategoryRowSchema = z.object({ project_id: z.string(), category_id: z.string() });

type SqlValue = string | number | null;

function json(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

function parseJson(text: string | null, column: string): unknown {
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`projectFromRow: column ${column} is not valid JSON`);
  }
}

function orUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export function projectToRow(project: Project): ProjectRow {
  return {
    id: project.id,
    name: project.name,
    source_uri: project.sourceUri,
    transform: JSON.stringify(project.transform),
    transform_viewport: json(project.transformViewport),
    opacity: project.opacity,
    split: json(project.split),
    current_tile_id: project.currentTileId ?? null,
    status: project.status,
    result_photo_uri: project.resultPhotoUri ?? null,
    result_transform: json(project.resultTransform),
    completed_at: project.completedAt ?? null,
    notes: project.notes ?? null,
    difficulty: project.difficulty ?? null,
    time_spent_ms: project.timeSpentMs,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

/** Positional parameters for UPSERT_PROJECT, in its column order. */
export function projectRowParams(row: ProjectRow): SqlValue[] {
  return [
    row.id,
    row.name,
    row.source_uri,
    row.transform,
    row.transform_viewport,
    row.opacity,
    row.split,
    row.current_tile_id,
    row.status,
    row.result_photo_uri,
    row.result_transform,
    row.completed_at,
    row.notes,
    row.difficulty,
    row.time_spent_ms,
    row.created_at,
    row.updated_at,
  ];
}

/**
 * What the project camera saves (UPDATE_PROJECT_CAMERA). `transformViewport` is absent until the
 * image has been placed once (status and time can be saved before): the project stays unplaced.
 */
export type CameraState = Pick<Project, "transform" | "opacity" | "status" | "timeSpentMs"> & {
  transformViewport?: Size;
};

/** Positional parameters for UPDATE_PROJECT_CAMERA; `now` becomes `updated_at`. */
export function cameraStateParams(id: string, state: CameraState, now: Date): SqlValue[] {
  return [
    JSON.stringify(state.transform),
    json(state.transformViewport),
    state.opacity,
    state.status,
    state.timeSpentMs,
    now.toISOString(),
    id,
  ];
}

/** Validates a row read from SQLite. Throws an `Error` starting with `projectFromRow:` if corrupt. */
export function projectFromRow(row: unknown, categoryIds: readonly string[]): Project {
  const shape = ProjectRowSchema.safeParse(row);
  if (!shape.success) {
    throw new Error(`projectFromRow: unexpected row shape (${shape.error.message})`);
  }
  const r = shape.data;
  const project = ProjectSchema.safeParse({
    id: r.id,
    name: r.name,
    sourceUri: r.source_uri,
    transform: parseJson(r.transform, "transform"),
    transformViewport: parseJson(r.transform_viewport, "transform_viewport"),
    opacity: r.opacity,
    split: parseJson(r.split, "split"),
    currentTileId: orUndefined(r.current_tile_id),
    status: r.status,
    resultPhotoUri: orUndefined(r.result_photo_uri),
    resultTransform: parseJson(r.result_transform, "result_transform"),
    completedAt: orUndefined(r.completed_at),
    notes: orUndefined(r.notes),
    difficulty: orUndefined(r.difficulty),
    timeSpentMs: r.time_spent_ms,
    categoryIds: [...categoryIds],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
  if (!project.success) {
    throw new Error(`projectFromRow: invalid project ${r.id} (${project.error.message})`);
  }
  return project.data;
}

export function categoryFromRow(row: unknown): Category {
  const shape = CategoryRowSchema.safeParse(row);
  if (!shape.success) {
    throw new Error(`categoryFromRow: unexpected row shape (${shape.error.message})`);
  }
  const r = shape.data;
  const category = CategorySchema.safeParse({
    id: r.id,
    key: orUndefined(r.key),
    name: orUndefined(r.name),
    isDefault: r.is_default === 1,
    color: orUndefined(r.color),
    icon: orUndefined(r.icon),
    order: r.sort_order,
  });
  if (!category.success) {
    throw new Error(`categoryFromRow: invalid category ${r.id} (${category.error.message})`);
  }
  return category.data;
}

/** `project_categories` rows → category ids per project, keeping the query's order. */
export function groupCategoryIds(rows: readonly unknown[]): Map<string, string[]> {
  const byProject = new Map<string, string[]>();
  for (const row of rows) {
    const { project_id, category_id } = ProjectCategoryRowSchema.parse(row);
    const ids = byProject.get(project_id);
    if (ids) ids.push(category_id);
    else byProject.set(project_id, [category_id]);
  }
  return byProject;
}
