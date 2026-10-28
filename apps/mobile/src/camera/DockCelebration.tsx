import { cameraDock, duration, easing } from "@ar-darwin/ui";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { animateFade, animateMove, tweenPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

type DockCelebrationProps = {
  /** Goes up by one each time every tile gets done; the ring spreads once per change. 0 = never. */
  trigger: number;
};

const RING_MS = 600;
const RING_FROM = 0.6;
const RING_TO = 2.4;
const RING_ALPHA = 0.7;
const RING_SIZE = cameraDock.actionHeight;

/**
 * A ring that spreads from the middle of the main action and fades, once, when the last tile is
 * marked. Meant to sit inside the button (which clips it). Nothing with reduced motion, and no
 * Skia: a bordered `View` scaled and faded on the UI thread is all it takes.
 */
export function DockCelebration({ trigger }: DockCelebrationProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color.camera;
  const scale = useSharedValue(RING_FROM);
  const alpha = useSharedValue(0);
  const spread = tweenPlan({ ms: RING_MS, reduced: duration.long.reduced }, easing.enter, reduce);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new celebration starts it
  useEffect(() => {
    if (trigger === 0 || reduce) return;
    scale.value = RING_FROM;
    alpha.value = RING_ALPHA;
    scale.value = animateMove(RING_TO, spread);
    alpha.value = animateFade(0, spread, RING_MS);
  }, [trigger]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: alpha.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View pointerEvents="none" style={styles.frame}>
      <Animated.View style={[styles.ring, { borderColor: c.onAccent }, ringStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    opacity: 0,
  },
});
