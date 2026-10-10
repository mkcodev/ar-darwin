import {
  hairline,
  radius,
  segmented,
  space,
  spring,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

type SegmentedControlProps<V extends string> = {
  label: string;
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  /** Hides the visible label (it stays as the group's accessible name). */
  hideLabel?: boolean;
};

/**
 * One choice among a few (theme, hand, «Al ras / Bordes extendidos»), as a radio group. Every
 * segment takes the width of the widest label (unlike the web, where they hug their text), so
 * the selection slides with `snappy` by moving alone, never resizing. Reduced motion: it jumps.
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel,
}: SegmentedControlProps<V>) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color;
  const plan = springPlan(spring.snappy, reduce);
  const [textWidths, setTextWidths] = useState<Record<number, number>>({});
  const measured = Object.keys(textWidths).length === options.length;
  const segmentWidth = measured
    ? Math.max(touchTarget, Math.max(...Object.values(textWidths)) + space[4] * 2)
    : undefined;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const x = useSharedValue(0);
  const placed = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: follow the selection and the width
  useEffect(() => {
    if (segmentWidth === undefined) return;
    const target = index * segmentWidth;
    // The first placement (once measured) is not a change of selection: no slide.
    x.value = placed.current && plan.mode === "full" ? animateMove(target, plan) : target;
    placed.current = true;
  }, [index, segmentWidth]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.field}>
      {!hideLabel && <Text style={[styles.label, { color: c.text.muted }]}>{label}</Text>}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.track, { backgroundColor: c.bg.surface, borderColor: c.border.subtle }]}
      >
        {segmentWidth !== undefined && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                width: segmentWidth - segmented.thumbInset * 2,
                backgroundColor: c.bg.raised,
                borderColor: c.border.strong,
              },
              thumbStyle,
            ]}
          />
        )}
        {options.map((option, i) => {
          const selected = i === index;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={[styles.segment, segmentWidth !== undefined && { width: segmentWidth }]}
            >
              <Text
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  setTextWidths((prev) => (prev[i] === w ? prev : { ...prev, [i]: w }));
                }}
                style={[styles.text, { color: selected ? c.text.primary : c.text.muted }]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[1], alignItems: "flex-start" },
  label: toNativeTextStyle(typography.label),
  track: {
    flexDirection: "row",
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
  thumb: {
    position: "absolute",
    left: segmented.thumbInset,
    top: segmented.thumbInset,
    bottom: segmented.thumbInset,
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
  segment: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: space[4],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  text: toNativeTextStyle(typography.label),
});
