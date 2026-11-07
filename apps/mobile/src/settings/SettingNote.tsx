import { toNativeTextStyle, typography } from "@ar-darwin/ui";
import { StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type SettingNoteProps = {
  children: string;
  /** Read out when it appears (a note that depends on the choice, like the language restart). */
  live?: boolean;
};

/** The muted note under a setting. */
export function SettingNote({ children, live = false }: SettingNoteProps) {
  const { theme } = useTheme();
  return (
    <Text
      accessibilityLiveRegion={live ? "polite" : undefined}
      style={[styles.note, { color: theme.color.text.muted }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  note: toNativeTextStyle(typography.body),
});
