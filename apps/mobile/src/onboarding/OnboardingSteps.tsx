import { ONBOARDING_STEPS, type OnboardingStep, stepIndex } from "@ar-darwin/core";
import { cameraDock, radius, space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type OnboardingStepsProps = { step: OnboardingStep };

/**
 * One segment per page, the current one in the accent. Hidden from the screen reader: the header
 * says «1/3» and every page title is announced with «Paso 1 de 3».
 */
export function OnboardingSteps({ step }: OnboardingStepsProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const current = stepIndex(step);
  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ONBOARDING_STEPS.map((id, index) => (
        <View
          key={id}
          style={[
            styles.segment,
            { backgroundColor: index === current ? c.accent.default : c.border.strong },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space[2] },
  segment: { flex: 1, height: cameraDock.segmentHeight, borderRadius: radius.pill },
});
