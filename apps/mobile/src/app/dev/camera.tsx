import { Redirect, Stack } from "expo-router";
import { CameraSpikeScreen } from "../../camera/CameraSpikeScreen";
import { t } from "../../i18n";

/** Camera spike (issue #17), development builds only. */
export default function DevCamera() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: t("cameraSpike.title"), headerShown: false }} />
      <CameraSpikeScreen />
    </>
  );
}
