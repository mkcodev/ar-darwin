import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { t } from "../i18n";

/** Settings, a secondary screen: native header from the stack defaults. Filled by the Ajustes task. */
export default function Settings() {
  return (
    <>
      <Stack.Screen options={{ title: t("settings.title") }} />
      <View style={styles.screen} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
