import {
  cameraBackdropColor,
  radius,
  resolveMotion,
  space,
  spring,
  type Theme,
  toNativeTextStyle,
  toReanimatedSpring,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { t } from "./i18n";

type CameraEntryProps = {
  theme: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Entering the camera never jumps from paper to black: the screen fades to graphite with the
 * `screen` spring (no bounce) before the live image would appear. Reduced motion: 120 ms fade.
 * The parent switches the status bar to `theme.statusBar.camera` while it is open.
 */
export function CameraEntry({ theme, open, onOpenChange }: CameraEntryProps) {
  const reduce = useReducedMotion();
  const cover = useSharedValue(open ? 1 : 0);
  const c = theme.color;

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));

  const toggle = () => {
    const next = !open;
    const plan = resolveMotion(spring.screen, reduce);
    const done = (finished?: boolean) => {
      "worklet";
      if (finished) scheduleOnRN(onOpenChange, next);
    };
    if (plan.kind === "full")
      cover.value = withSpring(next ? 1 : 0, toReanimatedSpring(plan.token), done);
    else if (plan.kind === "fade")
      cover.value = withTiming(next ? 1 : 0, { duration: plan.duration }, done);
    else {
      cover.value = next ? 1 : 0;
      onOpenChange(next);
    }
  };

  return (
    <View style={[styles.frame, { backgroundColor: c.bg.surface, borderColor: c.border.subtle }]}>
      <Text style={[toNativeTextStyle(typography.body), { color: c.text.muted }]}>
        {t("library.hint")}
      </Text>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: cameraBackdropColor }, coverStyle]}
      />
      <Pressable
        accessibilityRole="button"
        onPress={toggle}
        style={[
          styles.button,
          {
            backgroundColor: open ? c.camera.pillSolid : c.accent.default,
            borderColor: c.camera.pillEdge,
          },
        ]}
      >
        <Text
          style={[
            toNativeTextStyle(typography.label),
            { color: open ? c.camera.text : c.text.onAccent },
          ]}
        >
          {t(open ? "devDesign.closeCamera" : "library.openCamera")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    minHeight: 180,
    padding: space[4],
    gap: space[4],
    justifyContent: "space-between",
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  button: {
    minHeight: touchTarget,
    paddingHorizontal: space[5],
    alignSelf: "flex-start",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
