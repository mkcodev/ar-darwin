import { SplashScreen, Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DATABASE_NAME, migrateDbIfNeeded } from "../storage/database";
import { HandednessProvider } from "../theme/HandednessProvider";
import { ReduceMotionProvider } from "../theme/ReduceMotionProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useAppFonts } from "../theme/useAppFonts";

// Keep the native splash until the fonts are in: no frame ever paints in system fonts.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (fast refresh): nothing to keep.
});

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
            {/* Renders nothing until the migrations ran; the splash is already gone by then. */}
            <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
              <Stack />
            </SQLiteProvider>
          </ReduceMotionProvider>
        </HandednessProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
