import { toNativeTextStyle, typography } from "@ar-darwin/ui";
import type { NativeStackNavigationOptions } from "expo-router";
import { useMemo } from "react";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

const title = toNativeTextStyle(typography.title);

/**
 * Defaults for every screen of the root native stack: the native header of secondary screens
 * (settings, and later the project sheet and splitter) drawn with packages/ui tokens. Main screens
 * (library) hide it and draw `LargeTitleHeader`; the camera hides it too. The canvas colour under
 * every screen avoids a white flash while pushing; reduce motion swaps the slide for a fade.
 */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color;

  return useMemo<NativeStackNavigationOptions>(
    () => ({
      headerStyle: { backgroundColor: c.bg.canvas },
      headerTintColor: c.text.primary,
      headerTitleStyle: {
        fontFamily: title.fontFamily,
        fontSize: title.fontSize,
        color: c.text.primary,
      },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal",
      contentStyle: { backgroundColor: c.bg.canvas },
      animation: reduce ? "fade" : "default",
    }),
    [c, reduce],
  );
}
