import { type ErrorBoundaryProps, SplashScreen } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StartupErrorScreen } from "../components/StartupErrorScreen";
import { AppStack } from "../navigation/AppStack";
import { HandednessProvider } from "../theme/HandednessProvider";
import { ReduceMotionProvider } from "../theme/ReduceMotionProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useAppFonts } from "../theme/useAppFonts";

// Keep the native splash until the stored settings are read (`AppSettingsProvider` hides it), so no
// frame paints in system fonts, the wrong theme or the wrong language. A start-up failure hides it
// from the recovery screen.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (fast refresh): nothing to keep.
});

/**
 * Expo Router wraps this layout in an error boundary: a throw anywhere below it (the database not
 * opening or migrating, whose SQLiteProvider rethrows by default) lands here instead of crashing
 * the app on every launch. It renders in place of the whole layout, so no provider is mounted;
 * `retry` re-mounts it and opens the database again.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <StartupErrorScreen error={error} onRetry={retry} />;
}

export default function RootLayout() {
  const fontsReady = useAppFonts();

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <HandednessProvider>
          <ReduceMotionProvider>
            <AppStack />
          </ReduceMotionProvider>
        </HandednessProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
