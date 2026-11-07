import { LANGUAGE_PREFERENCES } from "@ar-darwin/i18n";
import { space, type ThemePreference } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { SegmentedControl } from "../components/SegmentedControl";
import { t } from "../i18n";
import { useAppSettings } from "./AppSettingsProvider";
import { SettingNote } from "./SettingNote";
import { SettingsSection } from "./SettingsSection";

const THEMES: readonly ThemePreference[] = ["system", "light", "dark"];

/** Theme (seen at once on this same screen) and language (on the next start). */
export function AppearanceSection() {
  const {
    themePreference,
    setThemePreference,
    languagePreference,
    setLanguagePreference,
    languageNeedsRestart,
  } = useAppSettings();

  return (
    <SettingsSection title={t("settings.sections.appearance")}>
      <SegmentedControl
        label={t("settings.theme.label")}
        options={THEMES.map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
        value={themePreference}
        onChange={setThemePreference}
      />
      <View style={styles.setting}>
        <SegmentedControl
          label={t("settings.language.label")}
          options={LANGUAGE_PREFERENCES.map((value) => ({
            value,
            label: t(`settings.language.${value}`),
          }))}
          value={languagePreference}
          onChange={setLanguagePreference}
        />
        {languageNeedsRestart && <SettingNote live>{t("settings.language.restart")}</SettingNote>}
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  setting: { gap: space[1] },
});
