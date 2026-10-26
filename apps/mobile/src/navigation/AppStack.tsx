import { DarkTheme, DefaultTheme, Stack, type Theme, ThemeProvider } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AppSettingsProvider } from "../settings/AppSettingsProvider";
import { DATABASE_NAME, migrateDbIfNeeded } from "../storage/database";
import { useTheme } from "../theme/ThemeProvider";
import { useStackScreenOptions } from "./useStackScreenOptions";

/**
 * A database that fails to open or migrate must reach the root layout's `ErrorBoundary`
 * (`app/_layout.tsx`, the recovery screen), so the provider rethrows it. That is also its default;
 * it is explicit here so nobody adds a handler that swallows the error and leaves a blank app.
 * Module-level so the memoized provider sees the same function on every render.
 */
function rethrowDatabaseError(error: Error): never {
  throw error;
}

/**
 * The app's only navigator: one native stack, no tabs (docs/ARCHITECTURE.md, «Navegación»).
 * React Navigation gets the packages/ui colours too, so its own surfaces (the root behind the
 * screens, modals) never fall back to its white default.
 */
export function AppStack() {
  const { theme } = useTheme();
  const screenOptions = useStackScreenOptions();
  const c = theme.color;

  const navigationTheme = useMemo<Theme>(() => {
    const base = theme.name === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        primary: c.accent.default,
        background: c.bg.canvas,
        card: c.bg.canvas,
        text: c.text.primary,
        border: c.border.subtle,
        notification: c.accent.default,
      },
    };
  }, [theme.name, c]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={theme.statusBar.app} />
      {/* The canvas shows between the splash and the end of the migrations, not a white frame. */}
      <View style={[styles.root, { backgroundColor: c.bg.canvas }]}>
        {/* Renders nothing until the migrations ran; the splash is already gone by then. */}
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          onInit={migrateDbIfNeeded}
          onError={rethrowDatabaseError}
        >
          <AppSettingsProvider>
            <Stack screenOptions={screenOptions} />
          </AppSettingsProvider>
        </SQLiteProvider>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
