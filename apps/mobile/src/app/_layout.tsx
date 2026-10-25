import { type ErrorBoundaryProps, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StartupErrorScreen } from "../components/StartupErrorScreen";
import { AppStack } from "../navigation/AppStack";
import { HandednessProvider } from "../theme/HandednessProvider";
import { ReduceMotionProvider } from "../theme/ReduceMotionProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useAppFonts } from "../theme/useAppFonts";

// Keep the native splash until the fonts are in: no frame ever paints in system fonts.
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

  useEffect(() => {
    if (fontsReady) SplashScreen.hide();
  }, [fontsReady]);

  if (!fontsReady) return null;

  // The providers take `initial`/`onChange` so the Settings task can load and store them.
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
