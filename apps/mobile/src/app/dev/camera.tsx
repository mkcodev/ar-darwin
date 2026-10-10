import { Redirect, Stack } from "expo-router";
import { CameraSpikeScreen } from "../../camera/CameraSpikeScreen";
import { t } from "../../i18n";
import { spikesEnabled } from "../../spikes";

/** Camera spike (issue #17): development builds, plus the `preview` build for #20's fps test. */
export default function DevCamera() {
  if (!spikesEnabled) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: t("cameraSpike.title"), headerShown: false }} />
      <CameraSpikeScreen />
    </>
  );
}
