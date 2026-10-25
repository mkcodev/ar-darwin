import { Redirect, Stack } from "expo-router";
import type { ComponentType } from "react";
import { t } from "../../i18n";

/**
 * `__DEV__` is folded by Metro at build time, so in a production bundle this `require()` is dropped
 * from the module graph and the gallery (with its test image) is not shipped. See dev/camera.tsx.
 */
const DevDesignScreen: ComponentType | null = __DEV__
  ? (require("../../design/DevDesignScreen") as typeof import("../../design/DevDesignScreen"))
      .DevDesignScreen
  : null;

/** Design system check, development builds only. */
export default function DevDesign() {
  if (!DevDesignScreen) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: t("devDesign.title"), headerShown: false }} />
      <DevDesignScreen />
    </>
  );
}
