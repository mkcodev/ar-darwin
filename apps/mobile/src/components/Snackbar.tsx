import {
  duration,
  hairline,
  radius,
  space,
  spring,
  toNativeTextStyle,
  touchTarget,
  typography,
  zIndex,
} from "@ar-darwin/ui";
import { useEffect } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

const messageStyle = toNativeTextStyle(typography.body);
const actionStyle = toNativeTextStyle(typography.label);

type SnackbarProps = {
  /** What happened («“Búho” deleted.»); announced to the screen reader when it appears. */
  message: string;
  /** One optional action («Undo»). */
  action?: { label: string; onPress: () => void };
};

/**
 * Brief feedback at the foot of the screen (Material's snackbar), over everything but the sheets.
 * `bg.raised` with a hairline, no shadow. It rises with `gentle` and leaves with a fade; with
 * «reduce motion», it only fades. The parent mounts it while there is something to say and owns
 * the timing (e.g. the undo window of a deletion).
 */
export function Snackbar({ message, action }: SnackbarProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const insets = useSafeAreaInsets();
  const c = theme.color;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      action === undefined ? message : `${message} ${action.label}`,
    );
  }, [message, action]);

  const rise = springPlan(spring.gentle, reduce);
  const entering =
    rise.mode === "full" && rise.kind === "spring"
      ? FadeInDown.springify()
          .stiffness(rise.stiffness)
          .damping(rise.damping)
          .mass(rise.mass)
          .reduceMotion(ReduceMotion.Never)
      : FadeIn.duration(rise.mode === "fade" ? rise.duration : 0).reduceMotion(ReduceMotion.Never);
  const exiting = FadeOut.duration(rise.mode === "none" ? 0 : duration.micro.ms).reduceMotion(
    ReduceMotion.Never,
  );

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        {
          bottom: insets.bottom + space[4],
          backgroundColor: c.bg.raised,
          borderColor: c.border.strong,
        },
      ]}
    >
      <Text style={[messageStyle, styles.message, { color: c.text.primary }]} numberOfLines={3}>
        {message}
      </Text>
      {action !== undefined && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed && { backgroundColor: c.accent.subtle }]}
        >
          <Text style={[actionStyle, { color: c.accent.default }]}>{action.label}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: space[4],
    right: space[4],
    zIndex: zIndex.toast,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: touchTarget + space[2],
    paddingLeft: space[4],
    paddingRight: space[1],
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  message: { flex: 1, paddingVertical: space[3] },
  action: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    paddingHorizontal: space[3],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
});
