import {
  hairline,
  opacity,
  radius,
  space,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type ChipProps = {
  label: string;
  /** Read instead of `label` when the visible text is a symbol («2×3»). */
  accessibilityLabel?: string;
  /** One chip of a group is selected: they read as radio buttons. */
  selected: boolean;
  onPress: () => void;
};

const text = toNativeTextStyle(typography.value);

/** A quick choice (a preset grid): pill-shaped, 48 px tall, the selected one in the accent. */
export function Chip({ label, accessibilityLabel, selected, onPress }: ChipProps) {
  const { theme } = useTheme();
  const c = theme.color;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? c.accent.subtle : "transparent",
          borderColor: selected ? c.accent.default : c.border.strong,
        },
      ]}
    >
      {({ pressed }) => (
        <>
          {pressed && !selected && (
            <View style={[styles.ink, { backgroundColor: c.text.primary, opacity: opacity.ink }]} />
          )}
          <Text style={[text, { color: c.text.primary }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: touchTarget,
    height: touchTarget,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  ink: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.pill },
});
