import { cameraColors, cameraPill, radius, space, touchTarget, typography } from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text } from "react-native";
import { t } from "../i18n";

type FpsToggleProps = {
  showing: boolean;
  onToggle: () => void;
};

/** Provisional pill (#20): shows or hides `FpsMeter`. Accent label while the meter is on. */
export function FpsToggle({ showing, onToggle }: FpsToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={t(showing ? "cameraSpike.fps.hide" : "cameraSpike.fps.show")}
      accessibilityState={{ checked: showing }}
      onPress={onToggle}
      style={[
        styles.pill,
        { backgroundColor: cameraColors.pillSolid, borderColor: cameraColors.pillEdge },
      ]}
    >
      <Text style={[styles.label, { color: showing ? cameraColors.accent : cameraColors.text }]}>
        {t("cameraSpike.fps.toggle")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    height: cameraPill.height,
    paddingHorizontal: space[5],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: cameraPill.edgeWidth,
  },
  label: { fontSize: typography.label.size, lineHeight: typography.label.lineHeight },
});
