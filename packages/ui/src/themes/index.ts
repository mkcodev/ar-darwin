import { darkTheme } from "./dark";
import { lightTheme } from "./light";
import type { Theme, ThemeName } from "./types";

export const themes: Record<ThemeName, Theme> = { dark: darkTheme, light: lightTheme };

/** What the user picks in the selector. "system" follows the OS and is the default. */
export type ThemePreference = "system" | ThemeName;

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

/**
 * Theme to render. `systemScheme` is what the platform reports (useColorScheme / matchMedia);
 * when it is unknown the app falls back to dark, the default identity.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemScheme: ThemeName | null | undefined,
): Theme {
  if (preference !== "system") return themes[preference];
  return themes[systemScheme ?? "dark"];
}

export type { ColorTokens, Theme, ThemeName } from "./types";
export { darkTheme, lightTheme };
