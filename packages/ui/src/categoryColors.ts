/**
 * Keys of the category palette. A category stores the key (never a hex value) and the app
 * resolves it with `theme.color.category[key]`, so the colour follows the active theme.
 * A category colour never goes alone: always with the category's icon or name.
 */
export const CATEGORY_COLOR_KEYS = [
  "ochre",
  "lichen",
  "moss",
  "pine",
  "indigo",
  "plum",
  "sepia",
  "slate",
] as const;

export type CategoryColorKey = (typeof CATEGORY_COLOR_KEYS)[number];

/** Narrows a stored value (SQLite, IndexedDB) to a palette key. */
export function isCategoryColorKey(value: string): value is CategoryColorKey {
  return (CATEGORY_COLOR_KEYS as readonly string[]).includes(value);
}

/** Minimum OKLab ΔE between two category colours, and between one and guide/danger. */
export const MIN_CATEGORY_DELTA_E = 0.1;

/** Wider gap against the accent: vermilion must stay the only warm, vivid colour of the UI. */
export const MIN_CATEGORY_ACCENT_DELTA_E = 0.15;

/** Most chroma (OKLCH C) a category colour may carry on the dark theme: pigment, not neon. */
export const MAX_CATEGORY_CHROMA_DARK = 0.09;
