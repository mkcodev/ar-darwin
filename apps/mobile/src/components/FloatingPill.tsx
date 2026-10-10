import { type RetreatEdge, retreatOffset } from "@ar-darwin/core";
import { cameraPill, duration, radius, signature, spring } from "@ar-darwin/ui";
import { type ReactNode, useEffect } from "react";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHandedness } from "../theme/HandednessProvider";
import { animateFade, animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

type FloatingPillProps = {
  children: ReactNode;
  /** When true the pill retreats `signature.menuRetreatPx` towards its edge and fades out. */
  retreated: boolean;
  /** Edge the pill retreats to. With `placement="freeHand"` it defaults to that side. */
  towards?: RetreatEdge;
  /**
   * "freeHand": absolute, on the side of the free hand (`useHandedness().controls`), inset from
   * the safe area; `style` sets the vertical position. "free": the caller places it.
   */
  placement?: "freeHand" | "free";
  direction?: "row" | "column";
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Camera control pill: dark fill with a paper edge (dark in both themes). It gets out of the way
 * when `retreated` (the 3 s idle timer belongs to the camera menu, not to this component) and
 * returns with the `gentle` spring. Reduced motion: it only fades. While retreated, touches pass
 * through, but it stays in the screen reader's tree so the controls are never lost.
 */
export function FloatingPill({
  children,
  retreated,
  towards,
  placement = "free",
  direction = "row",
  label,
  style,
}: FloatingPillProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const { controls } = useHandedness();
  const insets = useSafeAreaInsets();
  const c = theme.color.camera;
  const plan = springPlan(spring.gentle, reduce);
  const edge: RetreatEdge = towards ?? (placement === "freeHand" ? controls : "down");
  const progress = useSharedValue(retreated ? 1 : 0);
  const fade = useSharedValue(retreated ? 0 : 1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: animate when `retreated` flips
  useEffect(() => {
    progress.value =
      plan.mode === "full" ? animateMove(retreated ? 1 : 0, plan) : retreated ? 1 : 0;
    fade.value = animateFade(retreated ? 0 : 1, plan, duration.medium.ms);
  }, [retreated]);

  const moveStyle = useAnimatedStyle(() => {
    const offset = retreatOffset(edge, signature.menuRetreatPx * progress.value);
    return {
      opacity: fade.value,
      transform: [{ translateX: offset.x }, { translateY: offset.y }],
    };
  });

  const side =
    placement === "freeHand"
      ? controls === "left"
        ? { position: "absolute" as const, left: insets.left + cameraPill.inset }
        : { position: "absolute" as const, right: insets.right + cameraPill.inset }
      : null;

  return (
    <Animated.View
      accessibilityLabel={label}
      pointerEvents={retreated ? "none" : "auto"}
      style={[
        styles.pill,
        { flexDirection: direction, backgroundColor: c.pill, borderColor: c.pillEdge },
        side,
        style,
        moveStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    gap: cameraPill.gap,
    padding: cameraPill.gap,
    borderRadius: radius.pill,
    borderWidth: cameraPill.edgeWidth,
  },
});
