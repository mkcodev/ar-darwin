import { Redirect, Stack } from "expo-router";
import { DevDesignScreen } from "../../design/DevDesignScreen";
import { t } from "../../i18n";

/** Design system check, development builds only. */
export default function DevDesign() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: t("devDesign.title"), headerShown: false }} />
      <DevDesignScreen />
    </>
  );
}
