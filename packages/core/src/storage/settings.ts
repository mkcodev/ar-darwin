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
  /** The first-run introduction was finished or skipped: "1" yes, "0" or missing no. */
  onboardingDone: "onboarding_done",
  /** «Reduce motion»: "system" follows the phone, "on" and "off" override it. */
  reduceMotion: "reduce_motion",
  /** Haptics anywhere in the app, the magnet's included: "1" on, "0" off. */
  hapticsEnabled: "haptics_enabled",
  /** Overlay opacity a new project starts with, as a number text ("0.62"). */
  defaultOpacity: "default_opacity",
  /** Sheet a new split by paper size starts with: "A4", "A3" or "Letter". */
  defaultPaper: "default_paper",
  /** Orientation of that sheet: "portrait" or "landscape". */
  defaultOrientation: "default_orientation",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const DEFAULT_MAGNET_ENABLED = true;

/** A fresh install has not seen the onboarding. */
export const DEFAULT_ONBOARDING_DONE = false;

/** Haptics are on until the person turns them off. */
export const DEFAULT_HAPTICS_ENABLED = true;

/** «Reduce motion» in Settings: follow the phone, or force it on or off. */
export const REDUCE_MOTION_PREFERENCES = ["system", "on", "off"] as const;
export type ReduceMotionPreference = (typeof REDUCE_MOTION_PREFERENCES)[number];
export const DEFAULT_REDUCE_MOTION_PREFERENCE: ReduceMotionPreference = "system";

/** The override a preference sets: `null` follows the system setting. */
export function reduceMotionOverride(preference: ReduceMotionPreference): boolean | null {
  if (preference === "on") return true;
  if (preference === "off") return false;
  return null;
}

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

/** Text stored for a number setting. */
export function serializeNumber(value: number): string {
  return String(value);
}

/**
 * A number setting that must be one of `allowed` (the default opacity), read back. Tolerant: a
 * missing row, a text that is not a number or a number outside `allowed` gives `fallback`.
 */
export function parseNumberChoiceSetting(
  raw: unknown,
  allowed: readonly number[],
  fallback: number,
): number {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return allowed.find((choice) => Math.abs(choice - value) < 1e-9) ?? fallback;
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
