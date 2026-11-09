import { REDUCE_MOTION_PREFERENCES } from "@ar-darwin/core";
import { space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { SegmentedControl } from "../components/SegmentedControl";
import { t } from "../i18n";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useAppSettings } from "./AppSettingsProvider";
import { SettingNote } from "./SettingNote";
import { SettingsSection } from "./SettingsSection";

/**
 * «Reduce motion»: follow the phone or force it. The note says what the phone has, so «Sistema»
 * is not a guess; it changes live if the phone's setting does.
 */
export function AccessibilitySection() {
  const { reduceMotionPreference, setReduceMotionPreference } = useAppSettings();
  const { system } = useReduceMotion();

  return (
    <SettingsSection title={t("settings.sections.accessibility")}>
      <View style={styles.setting}>
        <SegmentedControl
          label={t("settings.reduceMotion.label")}
          options={REDUCE_MOTION_PREFERENCES.map((value) => ({
            value,
            label: t(`settings.reduceMotion.${value}`),
          }))}
          value={reduceMotionPreference}
          onChange={setReduceMotionPreference}
        />
        <SettingNote live>
          {t(system ? "settings.reduceMotion.systemOn" : "settings.reduceMotion.systemOff")}
        </SettingNote>
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  setting: { gap: space[1] },
});
