import { type Handedness, space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { SegmentedControl } from "../components/SegmentedControl";
import { Toggle } from "../components/Toggle";
import { t } from "../i18n";
import { useAppSettings } from "./AppSettingsProvider";
import { SettingNote } from "./SettingNote";
import { SettingsSection } from "./SettingsSection";

const HANDS: readonly Handedness[] = ["right", "left"];

/** The drawing hand, the magnet and the haptics: how the camera feels while tracing. */
export function CameraSection() {
  const {
    drawingHand,
    setDrawingHand,
    magnetEnabled,
    setMagnetEnabled,
    hapticsEnabled,
    setHapticsEnabled,
  } = useAppSettings();

  return (
    <SettingsSection title={t("settings.sections.camera")}>
      <View style={styles.setting}>
        <SegmentedControl
          label={t("settings.hand.label")}
          options={HANDS.map((value) => ({ value, label: t(`settings.hand.${value}`) }))}
          value={drawingHand}
          onChange={setDrawingHand}
        />
        <SettingNote>{t("settings.hand.description")}</SettingNote>
      </View>
      <View style={styles.setting}>
        <Toggle
          label={t("settings.magnet.label")}
          checked={magnetEnabled}
          onChange={setMagnetEnabled}
        />
        <SettingNote>{t("settings.magnet.description")}</SettingNote>
      </View>
      <View style={styles.setting}>
        <Toggle
          label={t("settings.haptics.label")}
          checked={hapticsEnabled}
          onChange={setHapticsEnabled}
        />
        <SettingNote>{t("settings.haptics.description")}</SettingNote>
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  setting: { gap: space[1] },
});
