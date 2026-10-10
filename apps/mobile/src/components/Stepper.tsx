import { stepValue } from "@ar-darwin/core";
import { hairline, radius, space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import type { ComponentProps } from "react";
import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { playHaptic } from "../theme/playHaptic";
import { useTheme } from "../theme/ThemeProvider";
import { IconButton } from "./IconButton";
import { useHoldRepeat } from "./useHoldRepeat";

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  decreaseLabel: string;
  increaseLabel: string;
};

/**
 * − value + with long-press repeat. Hitting a limit fires the limitReached haptic once. The value
 * between the buttons is also an adjustable element, so a screen reader can swipe it up and down.
 */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  format = String,
  decreaseLabel,
  increaseLabel,
}: StepperProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const latest = useRef(value);
  latest.current = value;

  /** One step; false once the value sits on its limit, which ends a held repeat. */
  const step = (delta: number) => (repeat: boolean) => {
    const { next, hitLimit } = stepValue(latest.current, delta, min, max);
    if (hitLimit) {
      if (!repeat) playHaptic("limitReached");
      return false;
    }
    if (!repeat) playHaptic("nudgeStep");
    latest.current = next;
    onChange(next);
    return next !== min && next !== max;
  };
  const down = useHoldRepeat(step(-1));
  const up = useHoldRepeat(step(1));

  const onAccessibilityAction: NonNullable<ComponentProps<typeof View>["onAccessibilityAction"]> = (
    event,
  ) => {
    if (event.nativeEvent.actionName === "increment") step(1)(false);
    if (event.nativeEvent.actionName === "decrement") step(-1)(false);
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.text.muted }]}>{label}</Text>
      <View style={[styles.row, { borderColor: c.border.subtle }]}>
        <IconButton icon="minus" label={decreaseLabel} disabled={value <= min} {...down} />
        <Text
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value, text: format(value) }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          accessibilityLiveRegion="polite"
          onAccessibilityAction={onAccessibilityAction}
          style={[styles.value, { color: c.text.primary }]}
        >
          {format(value)}
        </Text>
        <IconButton icon="plus" label={increaseLabel} disabled={value >= max} {...up} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[1], alignItems: "flex-start" },
  label: toNativeTextStyle(typography.label),
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
  value: { ...toNativeTextStyle(typography.value), minWidth: space[10], textAlign: "center" },
});
