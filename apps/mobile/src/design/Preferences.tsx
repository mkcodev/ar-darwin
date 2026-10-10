import type { Handedness, ThemePreference } from "@ar-darwin/ui";
import { View } from "react-native";
import { SegmentedControl } from "../components/SegmentedControl";
import { Toggle } from "../components/Toggle";
import { t } from "../i18n";
import { useHandedness } from "../theme/HandednessProvider";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

const themeOptions: ThemePreference[] = ["system", "light", "dark"];
const handOptions: Handedness[] = ["right", "left"];

/**
 * Theme, drawing hand and reduce motion for the whole app (the root providers), so every
 * component and the camera spike can be checked in each combination.
 */
export function Preferences() {
  const { preference, setPreference } = useTheme();
  const { hand, setHand } = useHandedness();
  const { reduce, setOverride } = useReduceMotion();
  return (
    <View>
      <SegmentedControl
        label={t("devDesign.theme.label")}
        options={themeOptions.map((value) => ({ value, label: t(`devDesign.theme.${value}`) }))}
        value={preference}
        onChange={setPreference}
      />
      <SegmentedControl
        label={t("playground.hand.label")}
        options={handOptions.map((value) => ({ value, label: t(`playground.hand.${value}`) }))}
        value={hand}
        onChange={setHand}
      />
      <Toggle label={t("playground.reduceMotion")} checked={reduce} onChange={setOverride} />
    </View>
  );
}
