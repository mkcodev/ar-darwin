import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Toggle } from "../components/Toggle";
import { t } from "../i18n";
import { useAppSettings } from "../settings/AppSettingsProvider";
import { useTheme } from "../theme/ThemeProvider";

/** Settings, a secondary screen: native header from the stack defaults. The Ajustes task adds the rest. */
export default function Settings() {
  const { theme } = useTheme();
  const { magnetEnabled, setMagnetEnabled } = useAppSettings();
  return (
    <>
      <Stack.Screen options={{ title: t("settings.title") }} />
      {/* Own canvas: the stack's contentStyle does not repaint when the theme changes at runtime. */}
      <View style={[styles.screen, { backgroundColor: theme.color.bg.canvas }]}>
        <Toggle
          label={t("settings.magnet.label")}
          checked={magnetEnabled}
          onChange={setMagnetEnabled}
        />
        <Text style={[styles.hint, { color: theme.color.text.muted }]}>
          {t("settings.magnet.description")}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space[5], paddingTop: space[4] },
  hint: { ...toNativeTextStyle(typography.body), marginTop: space[1] },
});
