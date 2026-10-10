import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

/** Settings, a secondary screen: native header from the stack defaults. Filled by the Ajustes task. */
export default function Settings() {
  const { theme } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: t("settings.title") }} />
      {/* Own canvas: the stack's contentStyle does not repaint when the theme changes at runtime. */}
      <View style={[styles.screen, { backgroundColor: theme.color.bg.canvas }]} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
