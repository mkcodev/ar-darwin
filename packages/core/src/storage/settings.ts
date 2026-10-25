/** App-wide preferences stored in the `settings` table (migration v6): key → value text. */

export const SETTING_KEYS = {
  /** The camera's magnet: "1" on, "0" off. */
  magnetEnabled: "magnet_enabled",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const DEFAULT_MAGNET_ENABLED = true;

/** Text stored for a boolean setting. */
export function serializeBoolean(value: boolean): string {
  return value ? "1" : "0";
}

/**
 * A boolean setting read back. Tolerant, like every stored JSON: a missing row or anything other
 * than "1" or "0" gives `fallback`, so a corrupt value can never break opening the camera.
 */
export function parseBooleanSetting(raw: unknown, fallback: boolean): boolean {
  if (raw === "1") return true;
  if (raw === "0") return false;
  return fallback;
}
