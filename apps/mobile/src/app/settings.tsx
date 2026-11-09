import { space } from "@ar-darwin/ui";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { t } from "../i18n";
import { AboutSection } from "../settings/AboutSection";
import { AccessibilitySection } from "../settings/AccessibilitySection";
import { AppearanceSection } from "../settings/AppearanceSection";
import { CameraSection } from "../settings/CameraSection";
import { NewProjectSection } from "../settings/NewProjectSection";
import { useTheme } from "../theme/ThemeProvider";

/** Settings, a secondary screen: native header from the stack defaults. One list, by sections. */
export default function Settings() {
  const { theme } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: t("settings.title") }} />
      {/* Own canvas: the stack's contentStyle does not repaint when the theme changes at runtime. */}
      <ScrollView
        style={{ backgroundColor: theme.color.bg.canvas }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <AppearanceSection />
        <CameraSection />
        <NewProjectSection />
        <AccessibilitySection />
        <AboutSection />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingVertical: space[4], gap: space[8] },
});
