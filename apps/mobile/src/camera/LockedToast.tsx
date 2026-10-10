import { cameraColors, duration, radius, signature, space, typography } from "@ar-darwin/ui";
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { t } from "../i18n";

type LockedToastProps = {
  /** Bumped by `CameraSpikeScreen` every time the blocked hardware back press needs re-showing
   *  this toast (a plain counter so the same message can fade in again while already visible). */
  trigger: number;
  /** Distance from the top of the screen (safe area included): the slider owns the bottom. */
  top: number;
};

/** "Unlock to leave" (#19): shown when the back button/gesture is blocked while locked. */
export function LockedToast({ trigger, top }: LockedToastProps) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;
    const fadeMs = reduce ? 0 : duration.micro.ms;
    opacity.value = withSequence(
      withTiming(1, { duration: fadeMs }),
      withDelay(signature.labelHoldMs, withTiming(0, { duration: fadeMs })),
    );
  }, [trigger, reduce, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.pill, { top }, style]} pointerEvents="none">
      <Text style={[styles.label, { color: cameraColors.text }]}>
        {t("cameraSpike.unlockToExit")}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: space[5],
    paddingVertical: space[3],
    borderRadius: radius.pill,
    backgroundColor: cameraColors.pillSolid,
    borderWidth: 1,
    borderColor: cameraColors.pillEdge,
  },
  label: { fontSize: typography.label.size, lineHeight: typography.label.lineHeight },
});
