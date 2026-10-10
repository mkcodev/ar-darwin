import {
  duration,
  hairline,
  opacity,
  radius,
  space,
  spring,
  toggle,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { animateFade, animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * On/off switch. The thumb travels with the `snappy` spring; the accent track and thumb colour
 * cross-fade in `duration.micro` (only opacity animates). Reduced motion: it jumps. The whole row
 * is the touch target and the accessible switch.
 */
export function Toggle({ label, checked, onChange, disabled = false }: ToggleProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color;
  const plan = springPlan(spring.snappy, reduce);
  const on = useSharedValue(checked ? 1 : 0);
  const x = useSharedValue(checked ? toggle.travel : 0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: animate only when `checked` flips
  useEffect(() => {
    // `snappy` reduces to a fade, but a switch has nothing to fade in: reduced motion jumps.
    const jump = plan.mode !== "full";
    x.value = jump ? (checked ? toggle.travel : 0) : animateMove(checked ? toggle.travel : 0, plan);
    on.value = jump ? (checked ? 1 : 0) : animateFade(checked ? 1 : 0, plan, duration.micro.ms);
  }, [checked]);

  const onLayer = useAnimatedStyle(() => ({ opacity: on.value }));
  const offLayer = useAnimatedStyle(() => ({ opacity: 1 - on.value }));
  const thumbMove = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.row, disabled && styles.disabled]}
    >
      <Text style={[styles.label, { color: c.text.primary }]}>{label}</Text>
      <View style={styles.switch}>
        <Animated.View
          style={[
            styles.track,
            { backgroundColor: c.bg.raised, borderColor: c.border.strong },
            offLayer,
          ]}
        />
        <Animated.View
          style={[
            styles.track,
            { backgroundColor: c.accent.default, borderColor: c.accent.default },
            onLayer,
          ]}
        />
        <Animated.View style={[styles.thumbSlot, thumbMove]}>
          <Animated.View style={[styles.thumb, { backgroundColor: c.text.primary }, offLayer]} />
          <Animated.View style={[styles.thumb, { backgroundColor: c.text.onAccent }, onLayer]} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const trackLeft = (toggle.width - toggle.trackWidth) / 2;
const trackTop = (touchTarget - toggle.trackHeight) / 2;
const thumbGap = (toggle.trackHeight - toggle.thumbSize) / 2;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[4],
    minHeight: touchTarget,
  },
  disabled: { opacity: opacity.disabled },
  label: { ...toNativeTextStyle(typography.label), flexShrink: 1 },
  switch: { width: toggle.width, height: touchTarget },
  track: {
    position: "absolute",
    left: trackLeft,
    top: trackTop,
    width: toggle.trackWidth,
    height: toggle.trackHeight,
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
  thumbSlot: {
    position: "absolute",
    left: trackLeft + thumbGap,
    top: trackTop + thumbGap,
    width: toggle.thumbSize,
    height: toggle.thumbSize,
  },
  thumb: {
    position: "absolute",
    width: toggle.thumbSize,
    height: toggle.thumbSize,
    borderRadius: radius.pill,
  },
});
