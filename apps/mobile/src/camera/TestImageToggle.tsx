import { cameraColors, cameraPill, radius, space, touchTarget, typography } from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text } from "react-native";
import { t } from "../i18n";

type TestImageToggleProps = {
  showingSketch: boolean;
  onToggle: () => void;
};

/** Provisional pill: switches the overlay between the calibration grid and the Darwin sketch. */
export function TestImageToggle({ showingSketch, onToggle }: TestImageToggleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onToggle}
      style={[
        styles.pill,
        { backgroundColor: cameraColors.pillSolid, borderColor: cameraColors.pillEdge },
      ]}
    >
      <Text style={[styles.label, { color: cameraColors.text }]}>
        {t(showingSketch ? "cameraSpike.showCalibration" : "cameraSpike.showSketch")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: touchTarget,
    height: cameraPill.height,
    paddingHorizontal: space[5],
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: cameraPill.edgeWidth,
  },
  label: { fontSize: typography.label.size, lineHeight: typography.label.lineHeight },
});
