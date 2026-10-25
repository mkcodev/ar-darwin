import { SELECT_SETTING, type SettingKey, UPSERT_SETTING } from "@ar-darwin/core";
import type { SQLiteDatabase } from "expo-sqlite";

/**
 * App-wide preferences in SQLite (the `settings` table, migration v6). The SQL lives in
 * packages/core; this file only runs it on expo-sqlite. Values are text: parse them with core's
 * `parseBooleanSetting`.
 */

/** The stored text, or `null` when the key was never written. */
export async function getSetting(db: SQLiteDatabase, key: SettingKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(SELECT_SETTING, [key]);
  return row?.value ?? null;
}

export async function setSetting(
  db: SQLiteDatabase,
  key: SettingKey,
  value: string,
): Promise<void> {
  await db.runAsync(UPSERT_SETTING, [key, value]);
}
