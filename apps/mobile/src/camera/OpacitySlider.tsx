import {
  cameraColors,
  opacitySlider,
  radius,
  space,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { type ComponentProps, useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { t } from "../i18n";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type OpacitySliderProps = {
  /** 0–1. */
  value: SharedValue<number>;
};

/** Accessibility step, and the smallest move `increment`/`decrement` make. */
const STEP = 0.05;

function clamp01(v: number): number {
  "worklet";
  return Math.min(1, Math.max(0, v));
}

/**
 * Opacity slider for the camera spike's test image. A single pan gesture does both jobs a track
 * normally needs two gestures for: `onBegin` fires on touch-down before the gesture is even
 * recognized, so a plain tap jumps the value there immediately, and `onChange` then drags it —
 * see react-native-gesture-handler's `BaseGesture.onBegin`.
 *
 * The live value is painted straight from `value` with no React state in between (fill width,
 * thumb position, and the "NN %" readout via a `TextInput`'s animated `text` prop — the pattern
 * from Reanimated's own Slider example, since `Text` has no prop that can be driven this way).
 * `now` only exists for screen readers, which need a plain number/string, not a shared value.
 */
export function OpacitySlider({ value }: OpacitySliderProps) {
  const width = useSharedValue(0);
  const [now, setNow] = useState(() => Math.round(value.value * 100));

  // Pulls the live locale text apart around its {value} so the only literal we add back is the
  // number itself — the surrounding text (e.g. " %") still comes from packages/i18n.
  const [prefix, suffix] = useMemo(() => {
    const marker = "\u0000";
    return t("common.percent", { value: marker }).split(marker) as [string, string];
  }, []);

  const sync = (v: number) => setNow(Math.round(v * 100));

  const pan = Gesture.Pan()
    .onBegin((e) => {
      if (width.value <= 0) return;
      value.value = clamp01(e.x / width.value);
    })
    .onChange((e) => {
      if (width.value <= 0) return;
      value.value = clamp01(value.value + e.changeX / width.value);
    })
    .onEnd(() => scheduleOnRN(sync, value.value));

  const fillStyle = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({
    left: value.value * width.value - opacitySlider.thumbSize / 2,
  }));
  // `text` isn't in TextInput's public prop types, but Reanimated special-cases it on native
  // TextInputs (see the library's own Slider example): it sets the displayed text directly,
  // skipping React, the same way `useAnimatedStyle` skips it for transform/opacity. The cast is
  // the gap between that: `animatedProps`'s generic type doesn't know about the untyped `text`.
  const textProps = useAnimatedProps<{ text: string }>(() => ({
    text: `${prefix}${Math.round(value.value * 100)}${suffix}`,
  })) as ComponentProps<typeof AnimatedTextInput>["animatedProps"];

  const onAccessibilityAction: NonNullable<ComponentProps<typeof View>["onAccessibilityAction"]> = (
    event,
  ) => {
    const direction =
      event.nativeEvent.actionName === "increment"
        ? STEP
        : event.nativeEvent.actionName === "decrement"
          ? -STEP
          : 0;
    if (direction === 0) return;
    const next = clamp01(value.value + direction);
    value.value = next;
    sync(next);
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t("camera.opacity")}
      accessibilityValue={{ min: 0, max: 100, now, text: `${prefix}${now}${suffix}` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={onAccessibilityAction}
    >
      <GestureDetector gesture={pan}>
        <View
          style={styles.touchArea}
          onLayout={(e) => {
            width.value = e.nativeEvent.layout.width;
          }}
        >
          <View
            style={[
              styles.track,
              { backgroundColor: cameraColors.pillSolid, borderColor: cameraColors.pillEdge },
            ]}
          />
          <Animated.View
            style={[styles.fill, { backgroundColor: cameraColors.accent }, fillStyle]}
          />
          <Animated.View
            style={[styles.thumb, { backgroundColor: cameraColors.accent }, thumbStyle]}
          />
        </View>
      </GestureDetector>
      <AnimatedTextInput
        editable={false}
        focusable={false}
        accessible={false}
        defaultValue={`${prefix}${now}${suffix}`}
        animatedProps={textProps}
        style={[toNativeTextStyle(typography.value), styles.value, { color: cameraColors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  touchArea: {
    flex: 1,
    height: touchTarget,
    justifyContent: "center",
  },
  track: {
    height: opacitySlider.trackHeight,
    borderRadius: radius.pill,
    borderWidth: opacitySlider.edgeWidth,
  },
  fill: {
    position: "absolute",
    height: opacitySlider.trackHeight,
    borderRadius: radius.pill,
  },
  thumb: {
    position: "absolute",
    width: opacitySlider.thumbSize,
    height: opacitySlider.thumbSize,
    borderRadius: radius.pill,
  },
  value: { minWidth: space[12], textAlign: "right" },
});
