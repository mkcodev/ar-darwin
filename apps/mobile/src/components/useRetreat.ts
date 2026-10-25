import { type RetreatEdge, retreatOffset } from "@ar-darwin/core";
import { duration, signature, spring } from "@ar-darwin/ui";
import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { animateFade, animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";

/**
 * The camera menu's retreat, on the UI thread: when `retreated` flips, the view moves
 * `signature.menuRetreatPx` towards `edge` and fades out (or comes back) with the `gentle` spring.
 * Reduced motion: it only fades. Returns the animated style (opacity and translation) for an
 * `Animated.View`; the caller decides what the hidden view does with touches.
 */
export function useRetreat(retreated: boolean, edge: RetreatEdge) {
  const { reduce } = useReduceMotion();
  const plan = springPlan(spring.gentle, reduce);
  const progress = useSharedValue(retreated ? 1 : 0);
  const fade = useSharedValue(retreated ? 0 : 1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: animate when `retreated` flips
  useEffect(() => {
    progress.value =
      plan.mode === "full" ? animateMove(retreated ? 1 : 0, plan) : retreated ? 1 : 0;
    fade.value = animateFade(retreated ? 0 : 1, plan, duration.medium.ms);
  }, [retreated]);

  return useAnimatedStyle(() => {
    const offset = retreatOffset(edge, signature.menuRetreatPx * progress.value);
    return {
      opacity: fade.value,
      transform: [{ translateX: offset.x }, { translateY: offset.y }],
    };
  });
}
