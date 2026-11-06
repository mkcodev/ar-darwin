import {
  type IconName,
  opacity,
  radius,
  space,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "./Icon";

const labelStyle = toNativeTextStyle(typography.body);
const valueStyle = toNativeTextStyle(typography.value);
const wordStyle = toNativeTextStyle(typography.body);

type SheetRowProps = {
  icon: IconName;
  label: string;
  /** Current value on the right, muted («3 × 3», «Animales»). Read after the label. */
  value?: string;
  /**
   * `number` (default): a measure in the mono («3 × 3»). `text`: words in the body face
   * («Animales», «Ninguna»): the mono is for values, and words in it read as code.
   */
  valueKind?: "number" | "text";
  /** `danger`: destructive (delete), in the theme's danger colour. */
  variant?: "default" | "danger";
  onPress: () => void;
};

/**
 * One action of a sheet: icon, label and, on the right, its current value. A full-width row of
 * `touchTarget` + 8 dp, like a list, not a stack of buttons: a sheet of six actions reads as a menu.
 */
export function SheetRow({
  icon,
  label,
  value,
  valueKind = "number",
  variant = "default",
  onPress,
}: SheetRowProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const ink = variant === "danger" ? c.danger : c.text.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value === undefined ? label : `${label}, ${value}`}
      onPress={onPress}
      style={styles.row}
    >
      {({ pressed }) => (
        <>
          {pressed && <View style={[styles.ink, { backgroundColor: ink, opacity: opacity.ink }]} />}
          <Icon name={icon} color={ink} />
          <Text style={[labelStyle, styles.label, { color: ink }]} numberOfLines={2}>
            {label}
          </Text>
          {value !== undefined && (
            <Text
              style={[
                valueKind === "text" ? wordStyle : valueStyle,
                styles.value,
                { color: c.text.muted },
              ]}
              numberOfLines={1}
            >
              {value}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + space[2],
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    paddingHorizontal: space[2],
    marginHorizontal: -space[2],
  },
  ink: { ...StyleSheet.absoluteFill, borderRadius: radius.md },
  label: { flex: 1 },
  value: { flexShrink: 1, maxWidth: "45%" },
});
