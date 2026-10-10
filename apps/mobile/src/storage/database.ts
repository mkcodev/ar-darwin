import { pendingMigrations, SELECT_SCHEMA_VERSION, setSchemaVersionSql } from "@ar-darwin/core";
import type { SQLiteDatabase } from "expo-sqlite";

export const DATABASE_NAME = "ar-darwin.db";

/**
 * `onInit` of the root SQLiteProvider: runs before any screen reads the database. Each pending
 * migration (packages/core/src/storage/migrations.ts) and its `user_version` bump share one
 * transaction, so a crash halfway leaves the database at the previous version, never in between.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // WAL can't change inside a transaction; foreign_keys is per connection (cascades need it).
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const row = await db.getFirstAsync<{ user_version: number }>(SELECT_SCHEMA_VERSION);
  for (const migration of pendingMigrations(row?.user_version ?? 0)) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(setSchemaVersionSql(migration.version));
    });
  }
}
