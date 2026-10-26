import { Redirect, Stack } from "expo-router";
import type { ComponentType } from "react";
import { t } from "../../i18n";

/**
 * The condition is written inline on purpose (same as `spikesEnabled` in src/spikes.ts): Metro only
 * drops the `require()` from the module graph when it folds the whole condition at build time, and
 * it cannot fold an imported constant. In a production bundle the spike screen and its test images
 * (~4.6 MB) stay out; in development and in `preview` (`EXPO_PUBLIC_SPIKES=1`) they are bundled.
 */
const CameraSpikeScreen: ComponentType | null =
  __DEV__ || process.env.EXPO_PUBLIC_SPIKES === "1"
    ? (require("../../camera/CameraSpikeScreen") as typeof import("../../camera/CameraSpikeScreen"))
        .CameraSpikeScreen
    : null;

/** Camera spike (issue #17): development builds, plus the `preview` build for #20's fps test. */
export default function DevCamera() {
  if (!CameraSpikeScreen) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: t("cameraSpike.title"), headerShown: false }} />
      <CameraSpikeScreen />
    </>
  );
}
