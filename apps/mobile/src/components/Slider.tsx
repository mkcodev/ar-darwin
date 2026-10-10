import { clamp, fractionOfRange, snapToStep, valueFromTrack } from "@ar-darwin/core";
import { radius, slider, space, toNativeTextStyle, touchTarget, typography } from "@ar-darwin/ui";
import { type ComponentProps, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useTheme } from "../theme/ThemeProvider";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type SliderProps = {
  label: string;
  /** Lives on the UI thread: dragging never goes through React state. */
  value: SharedValue<number>;
  min: number;
  max: number;
  step?: number;
  /** Text of the value (a worklet: it paints on the UI thread), e.g. `percentFormat(1)`. */
  format: (value: number) => string;
  /** Called on the JS thread when a drag or tap ends, to store the value. */
  onChangeEnd?: (value: number) => void;
  /** Hides the visible label (it stays as the accessible name). */
  compact?: boolean;
  tone?: "theme" | "camera";
};

/**
 * Same API as apps/desktop's Slider, except that `value` is a shared value (born as the camera
 * spike's opacity slider). A tap jumps to the touch, a horizontal drag follows it; vertical
 * swipes fail the gesture so the slider can sit inside a ScrollView.
 *
 * The live value is painted straight from `value` with no React state in between (fill, thumb
 * and the readout via a `TextInput`'s animated `text` prop, the pattern from Reanimated's own
 * Slider example, since `Text` has no prop that can be driven this way). `now` only exists for
 * screen readers, which need a plain number, not a shared value.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChangeEnd,
  compact,
  tone = "theme",
}: SliderProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const width = useSharedValue(0);
  const [now, setNow] = useState(() => value.value);

  const look =
    tone === "camera"
      ? {
          track: c.camera.pillSolid,
          edge: c.camera.pillEdge,
          fill: c.camera.text,
          ring: c.camera.pillSolid,
          text: c.camera.text,
          label: c.camera.muted,
        }
      : {
          track: c.border.strong,
          edge: c.border.strong,
          fill: c.text.primary,
          ring: c.bg.canvas,
          text: c.text.primary,
          label: c.text.muted,
        };

  const settle = (v: number) => {
    setNow(v);
    onChangeEnd?.(v);
  };

  const jump = Gesture.Tap().onEnd((e) => {
    value.value = valueFromTrack(e.x, width.value, min, max, step);
    scheduleOnRN(settle, value.value);
  });
  const drag = Gesture.Pan()
    .activeOffsetX([-space[2], space[2]])
    .failOffsetY([-space[2], space[2]])
    .onUpdate((e) => {
      value.value = valueFromTrack(e.x, width.value, min, max, step);
    })
    .onEnd(() => scheduleOnRN(settle, value.value));

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fractionOfRange(value.value, min, max) }],
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: fractionOfRange(value.value, min, max) * width.value - slider.thumbSize / 2 },
    ],
  }));
  // `text` isn't in TextInput's public prop types, but Reanimated special-cases it on native
  // TextInputs: it sets the displayed text directly, skipping React. The cast bridges that gap.
  const textProps = useAnimatedProps<{ text: string }>(() => ({
    text: format(value.value),
  })) as ComponentProps<typeof AnimatedTextInput>["animatedProps"];

  // Screen readers step at least a twentieth of the range, so 0–100 is not 100 swipes.
  const a11yStep = Math.max(step, (max - min) / 20);
  const onAccessibilityAction: NonNullable<ComponentProps<typeof View>["onAccessibilityAction"]> = (
    event,
  ) => {
    const name = event.nativeEvent.actionName;
    const delta = name === "increment" ? a11yStep : name === "decrement" ? -a11yStep : 0;
    if (delta === 0) return;
    const next = clamp(snapToStep(value.value + delta, min, step), min, max);
    value.value = next;
    settle(next);
  };

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now, text: format(now) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={onAccessibilityAction}
    >
      {!compact && <Text style={[styles.label, { color: look.label }]}>{label}</Text>}
      <View style={styles.row}>
        <GestureDetector gesture={Gesture.Race(drag, jump)}>
          <View
            style={styles.touchArea}
            onLayout={(e) => {
              width.value = e.nativeEvent.layout.width;
            }}
          >
            <View style={[styles.track, { backgroundColor: look.track, borderColor: look.edge }]} />
            <Animated.View style={[styles.fill, { backgroundColor: look.fill }, fillStyle]} />
            <Animated.View
              style={[
                styles.thumb,
                { backgroundColor: look.fill, borderColor: look.ring },
                thumbStyle,
              ]}
            />
          </View>
        </GestureDetector>
        <AnimatedTextInput
          editable={false}
          focusable={false}
          accessible={false}
          defaultValue={format(now)}
          animatedProps={textProps}
          style={[styles.value, { color: look.text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[1] },
  label: toNativeTextStyle(typography.label),
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  touchArea: { flex: 1, height: touchTarget, justifyContent: "center" },
  track: {
    height: slider.trackHeight,
    borderRadius: radius.pill,
    borderWidth: slider.edgeWidth,
  },
  fill: {
    position: "absolute",
    left: 0,
    right: 0,
    height: slider.trackHeight,
    borderRadius: radius.pill,
    transformOrigin: "left",
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: slider.thumbSize,
    height: slider.thumbSize,
    borderRadius: radius.pill,
    borderWidth: slider.ringWidth,
  },
  value: {
    ...toNativeTextStyle(typography.value),
    minWidth: space[12],
    padding: 0,
    textAlign: "right",
  },
});
