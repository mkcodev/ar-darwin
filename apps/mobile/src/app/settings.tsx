import { LANGUAGE_PREFERENCES } from "@ar-darwin/i18n";
import {
  type Handedness,
  space,
  type ThemePreference,
  toNativeTextStyle,
  typography,
} from "@ar-darwin/ui";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { SegmentedControl } from "../components/SegmentedControl";
import { Toggle } from "../components/Toggle";
import { t } from "../i18n";
import { useAppSettings } from "../settings/AppSettingsProvider";
import { useTheme } from "../theme/ThemeProvider";

const THEMES: readonly ThemePreference[] = ["system", "light", "dark"];
const HANDS: readonly Handedness[] = ["right", "left"];

/** Settings, a secondary screen: native header from the stack defaults. */
export default function Settings() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    magnetEnabled,
    setMagnetEnabled,
    themePreference,
    setThemePreference,
    drawingHand,
    setDrawingHand,
    languagePreference,
    setLanguagePreference,
    languageNeedsRestart,
  } = useAppSettings();
  const hint = [styles.hint, { color: theme.color.text.muted }];

  return (
    <>
      <Stack.Screen options={{ title: t("settings.title") }} />
      {/* Own canvas: the stack's contentStyle does not repaint when the theme changes at runtime. */}
      <ScrollView
        style={{ backgroundColor: theme.color.bg.canvas }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <SegmentedControl
          label={t("settings.theme.label")}
          options={THEMES.map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
          value={themePreference}
          onChange={setThemePreference}
        />
        <View style={styles.section}>
          <SegmentedControl
            label={t("settings.hand.label")}
            options={HANDS.map((value) => ({ value, label: t(`settings.hand.${value}`) }))}
            value={drawingHand}
            onChange={setDrawingHand}
          />
          <Text style={hint}>{t("settings.hand.description")}</Text>
        </View>
        <View style={styles.section}>
          <SegmentedControl
            label={t("settings.language.label")}
            options={LANGUAGE_PREFERENCES.map((value) => ({
              value,
              label: t(`settings.language.${value}`),
            }))}
            value={languagePreference}
            onChange={setLanguagePreference}
          />
          {languageNeedsRestart && (
            <Text accessibilityLiveRegion="polite" style={hint}>
              {t("settings.language.restart")}
            </Text>
          )}
        </View>
        <View style={styles.section}>
          <Toggle
            label={t("settings.magnet.label")}
            checked={magnetEnabled}
            onChange={setMagnetEnabled}
          />
          <Text style={hint}>{t("settings.magnet.description")}</Text>
        </View>
        <View style={styles.section}>
          <View style={styles.start}>
            <Button variant="secondary" onPress={() => router.push("/onboarding?replay=1")}>
              {t("settings.onboarding.action")}
            </Button>
          </View>
          <Text style={hint}>{t("settings.onboarding.hint")}</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingVertical: space[4], gap: space[6] },
  section: { gap: space[1] },
  start: { alignItems: "flex-start" },
  hint: toNativeTextStyle(typography.body),
});
