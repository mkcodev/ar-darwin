import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type SettingsSectionProps = { title: string; children: ReactNode };

/**
 * A group of Settings under its heading (Apariencia, Cámara…): the heading and the settings below,
 * `space[6]` apart like the rest of the list. No card, no divider: the heading alone groups them.
 */
export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.color.text.primary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[6] },
  title: toNativeTextStyle(typography.title),
});
