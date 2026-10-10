import {
  DEFAULT_THEME_PREFERENCE,
  resolveTheme,
  type Theme,
  type ThemePreference,
} from "@ar-darwin/ui";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

type ThemeState = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

type ThemeProviderProps = {
  /** Stored preference to start from (the Settings task loads it); defaults to "system". */
  initial?: ThemePreference;
  /** Called on every change so the caller can persist it. */
  onChange?: (preference: ThemePreference) => void;
  children: ReactNode;
};

/** Sistema / Claro / Oscuro for the whole app. "system" follows the OS; unknown falls to dark. */
export function ThemeProvider({ initial, onChange, children }: ThemeProviderProps) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(
    initial ?? DEFAULT_THEME_PREFERENCE,
  );

  const value = useMemo<ThemeState>(
    () => ({
      theme: resolveTheme(preference, system === "light" || system === "dark" ? system : null),
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        onChange?.(next);
      },
    }),
    [preference, system, onChange],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext);
  if (!state) throw new Error("useTheme must be used inside ThemeProvider");
  return state;
}
