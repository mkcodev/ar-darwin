import {
  cameraBackdropColor,
  DEFAULT_THEME_PREFERENCE,
  resolveTheme,
  type Theme,
  type ThemeName,
  type ThemePreference,
  toCssTokenVariables,
  toCssVariables,
} from "@ar-darwin/ui";
import { useEffect, useLayoutEffect, useState } from "react";

const STORAGE_KEY = "ar-darwin.theme";
const query = "(prefers-color-scheme: light)";

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "system" || v === "light" || v === "dark") return v;
  } catch {
    // Private mode or blocked storage: fall back to the default.
  }
  return DEFAULT_THEME_PREFERENCE;
}

function systemScheme(): ThemeName {
  return window.matchMedia(query).matches ? "light" : "dark";
}

/**
 * Sistema / Claro / Oscuro. Follows the OS while on "system" and writes the theme's tokens as
 * CSS custom properties on <html>, so the page background changes with it.
 */
export function useThemePreference(): {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  theme: Theme;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [system, setSystem] = useState<ThemeName>(systemScheme);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setSystem(mql.matches ? "light" : "dark");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const theme = resolveTheme(preference, system);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const vars = { ...toCssTokenVariables(), ...toCssVariables(theme) };
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    root.style.setProperty("--color-camera-backdrop", cameraBackdropColor);
    root.style.colorScheme = theme.name;
    root.dataset.theme = theme.name;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = theme.color.bg.canvas;
    // Enable the cross-fade after the first themed frame, never for the initial paint.
    const frame = requestAnimationFrame(() => {
      root.dataset.themeReady = "true";
    });
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  };

  return { preference, setPreference, theme };
}
