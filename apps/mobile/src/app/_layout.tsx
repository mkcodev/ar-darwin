import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
            <Stack />
          </ReduceMotionProvider>
        </HandednessProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
