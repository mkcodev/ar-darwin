import {
  type Category,
  categoryFromRow,
  DELETE_CATEGORIES_OF_PROJECT,
  DELETE_PROJECT,
  groupCategoryIds,
  INSERT_PROJECT_CATEGORY,
  type Project,
  projectFromRow,
  projectRowParams,
  projectToRow,
  SELECT_CATEGORIES,
  SELECT_CATEGORIES_OF_PROJECT,
  SELECT_PROJECT,
  SELECT_PROJECT_CATEGORIES,
  SELECT_PROJECTS,
  UPSERT_PROJECT,
} from "@ar-darwin/core";
import type { SQLiteDatabase } from "expo-sqlite";
import { deleteProjectDir, deleteStoredFile } from "./files";

/**
 * Projects in SQLite. The SQL and the row ↔ Project conversion live in packages/core (tested on
 * node:sqlite); this file only runs them on expo-sqlite. Get `db` from `useSQLiteContext()`.
 */

export async function listProjects(db: SQLiteDatabase): Promise<Project[]> {
  const [rows, links] = await Promise.all([
    db.getAllAsync<unknown>(SELECT_PROJECTS),
    db.getAllAsync<unknown>(SELECT_PROJECT_CATEGORIES),
  ]);
  const categoryIds = groupCategoryIds(links);
  return rows.map((row) => {
    const project = projectFromRow(row, []);
    return { ...project, categoryIds: categoryIds.get(project.id) ?? [] };
  });
}

export async function getProject(db: SQLiteDatabase, id: string): Promise<Project | null> {
  const row = await db.getFirstAsync<unknown>(SELECT_PROJECT, [id]);
  if (row === null) return null;
  const links = await db.getAllAsync<unknown>(SELECT_CATEGORIES_OF_PROJECT, [id]);
  return projectFromRow(row, groupCategoryIds(links).get(id) ?? []);
}

/** Inserts or updates the project and its categories; stamps `updatedAt`. Returns what was saved. */
export async function saveProject(
  db: SQLiteDatabase,
  project: Project,
  now: Date = new Date(),
): Promise<Project> {
  const saved: Project = { ...project, updatedAt: now.toISOString() };
  const params = projectRowParams(projectToRow(saved));
  await db.withTransactionAsync(async () => {
    await db.runAsync(UPSERT_PROJECT, params);
    await db.runAsync(DELETE_CATEGORIES_OF_PROJECT, [saved.id]);
    for (const categoryId of saved.categoryIds) {
      await db.runAsync(INSERT_PROJECT_CATEGORY, [saved.id, categoryId]);
    }
  });
  return saved;
}

/**
 * Deletes the project (its category links go with it, ON DELETE CASCADE) and then the files the
 * app owns: its folder `projects/<id>/` (image, thumbnail…) and the imported image and result
 * photo wherever they are. The row goes first and file errors are only logged: a file left behind
 * wastes space, a project pointing at a missing file breaks the library.
 */
export async function deleteProject(db: SQLiteDatabase, id: string): Promise<void> {
  const project = await getProject(db, id);
  await db.runAsync(DELETE_PROJECT, [id]);
  if (project === null) return;
  const deletions: [string, () => void][] = [
    [`folder of project ${id}`, () => deleteProjectDir(id)],
    ...[project.sourceUri, project.resultPhotoUri]
      .filter((stored) => stored !== undefined)
      .map((stored): [string, () => void] => [stored, () => deleteStoredFile(stored)]),
  ];
  for (const [what, remove] of deletions) {
    try {
      remove();
    } catch (error) {
      console.warn(`deleteProject: could not delete ${what} of project ${id}`, error);
    }
  }
}

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<unknown>(SELECT_CATEGORIES);
  return rows.map(categoryFromRow);
}
