/** App-wide preferences stored in the `settings` table (migration v6): key → value text. */

export const SETTING_KEYS = {
  /** The camera's magnet: "1" on, "0" off. */
  magnetEnabled: "magnet_enabled",
  /** The hand that holds the pencil: "right" or "left". The camera menu sits under the other one. */
  drawingHand: "drawing_hand",
  /** The theme: "system", "light" or "dark". */
  themePreference: "theme_preference",
  /** The app's language: "system", "es" or "en". Applied on the next start. */
  language: "language",
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

/**
 * A setting that is one of a fixed set of words (the drawing hand), read back. Tolerant: a missing
 * row or a word outside `allowed` gives `fallback`.
 */
export function parseChoiceSetting<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.find((word) => word === raw) ?? fallback;
}
