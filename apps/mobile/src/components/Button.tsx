import { inkDiameter } from "@ar-darwin/core";
import {
  duration,
  easing,
  fonts,
  type IconName,
  opacity,
  radius,
  signature,
  space,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { animateFade, animateMove, tweenPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "./Icon";

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  /** Leading icon, coloured like the label. */
  icon?: IconName;
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
};

/**
 * Press signature «tinta que empapa» (same as apps/desktop's Button): the ink spreads from the
 * finger like ink soaking paper, within `signature.inkMaxMs`, and dries off on release. The ink
 * starts on the UI thread at touch-down (`onBegin`), before the tap is even recognised. Reduced
 * motion: a flat fade.
 */
export function Button({
  variant = "secondary",
  icon,
  children,
  onPress,
  disabled = false,
  accessibilityHint,
}: ButtonProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color;
  const grow = tweenPlan(
    { ms: signature.inkMaxMs, reduced: duration.micro.reduced },
    easing.draw,
    reduce,
  );

  const size = useSharedValue({ width: 0, height: 0 });
  const ink = useSharedValue({ x: 0, y: 0, d: 0 });
  const inkScale = useSharedValue(0);
  const inkOpacity = useSharedValue(0);

  const palette = {
    primary: {
      bg: c.accent.default,
      text: c.text.onAccent,
      border: "transparent",
      ink: c.accent.pressed,
      inkAlpha: 1,
    },
    secondary: {
      bg: c.bg.raised,
      text: c.text.primary,
      border: c.border.subtle,
      ink: c.text.primary,
      inkAlpha: opacity.ink,
    },
    ghost: {
      bg: "transparent",
      text: c.text.primary,
      border: "transparent",
      ink: c.text.primary,
      inkAlpha: opacity.ink,
    },
  }[variant];
  const look = disabled
    ? { ...palette, bg: c.bg.raised, text: c.text.muted, border: c.border.subtle }
    : palette;

  const press = () => onPress?.();

  const tap = Gesture.Tap()
    .enabled(!disabled)
    // No time limit: a long press still activates on release, as on the web.
    .maxDuration(Number.MAX_SAFE_INTEGER)
    .shouldCancelWhenOutside(true)
    .onBegin((e) => {
      const d = inkDiameter(size.value.width, size.value.height);
      ink.value = { x: e.x - d / 2, y: e.y - d / 2, d };
      if (grow.mode === "full") {
        inkScale.value = 0;
        inkOpacity.value = 1;
        inkScale.value = animateMove(1, grow);
      } else {
        inkScale.value = 1;
        inkOpacity.value = 0;
        inkOpacity.value = animateFade(1, grow, 0);
      }
    })
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(press);
    })
    .onFinalize(() => {
      // Dry off once the ink has finished soaking (roughly what is left of its growth).
      const left = grow.mode === "full" ? signature.inkMaxMs * (1 - inkScale.value) : 0;
      inkOpacity.value = withDelay(left, withTiming(0, { duration: duration.micro.ms }));
    });

  const inkStyle = useAnimatedStyle(() => ({
    left: ink.value.x,
    top: ink.value.y,
    width: ink.value.d,
    height: ink.value.d,
    opacity: inkOpacity.value * look.inkAlpha,
    transform: [{ scale: inkScale.value }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={children}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "activate" && !disabled) press();
        }}
        onLayout={(e) => {
          size.value = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
        }}
        style={[
          styles.button,
          { backgroundColor: look.bg, borderColor: look.border },
          disabled && styles.disabled,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.ink, { backgroundColor: look.ink }, inkStyle]}
        />
        {icon && <Icon name={icon} color={look.text} />}
        <Text style={[styles.label, { color: look.text }]}>{children}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: space[2],
    minHeight: touchTarget,
    paddingHorizontal: space[5],
    borderWidth: 1,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  disabled: { opacity: opacity.disabled },
  ink: { position: "absolute", borderRadius: radius.pill },
  label: {
    ...toNativeTextStyle(typography.body),
    fontFamily: fonts.ui.native[600],
  },
});
