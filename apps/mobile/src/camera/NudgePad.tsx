import type { NudgeDirection } from "@ar-darwin/core";
import {
  cameraColors,
  duration,
  type IconName,
  icon,
  opacity,
  space,
  touchTarget,
} from "@ar-darwin/ui";
import { Canvas, Circle } from "@shopify/react-native-skia";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector, type GestureType } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SkiaIcon } from "../components/SkiaIcon";
import { t } from "../i18n";
import { useHandedness } from "../theme/HandednessProvider";
import { useReduceMotion } from "../theme/ReduceMotionProvider";

type NudgePadProps = {
  /** One press-and-hold gesture per arrow, from `useOverlayGestures`: begin and release run on the
   *  UI thread there. */
  gestures: Record<NudgeDirection, GestureType>;
  /** The arrow held down right now (UI thread), for the pressed fill and the pad's opacity. */
  held: SharedValue<NudgeDirection | null>;
  /** Touch lock, read on the UI thread to dim the pad. */
  locked: SharedValue<boolean>;
  /** JS mirror of `locked`, for screen readers. */
  isLocked: boolean;
  /** Distance from the bottom of the screen: the pad sits right above the camera's controls. */
  bottom: number;
  /** A screen reader "activated" an arrow: one 1 px step. */
  onStep: (dir: NudgeDirection) => void;
  /** Back to the pinned position, or to where the image was when the camera opened. */
  onReset: () => void;
  /** A position is pinned: its icon takes the accent. */
  pinned: boolean;
  /** Pins the current position as home. */
  onPin: () => void;
  /** An arrow or reset was tapped while locked. */
  onLockedPress: () => void;
};

type Cell = { col: number; row: number };

const GAP = space[1];
const CELL = touchTarget;
const SIZE = CELL * 3 + GAP * 2;

const place = ({ col, row }: Cell) => ({
  left: col * (CELL + GAP),
  top: row * (CELL + GAP),
});

const centre = (cell: Cell) => {
  const { left, top } = place(cell);
  return { cx: left + CELL / 2, cy: top + CELL / 2 };
};

const CELLS = {
  up: { col: 1, row: 0 },
  left: { col: 0, row: 1 },
  reset: { col: 1, row: 1 },
  right: { col: 2, row: 1 },
  down: { col: 1, row: 2 },
  pin: { col: 2, row: 0 },
} as const satisfies Record<string, Cell>;

type ArrowLabel =
  | "camera.nudge.moveUp"
  | "camera.nudge.moveDown"
  | "camera.nudge.moveLeft"
  | "camera.nudge.moveRight";

const ARROWS: { dir: NudgeDirection; glyph: IconName; label: ArrowLabel }[] = [
  { dir: "up", glyph: "arrowUp", label: "camera.nudge.moveUp" },
  { dir: "left", glyph: "arrowLeft", label: "camera.nudge.moveLeft" },
  { dir: "right", glyph: "arrowRight", label: "camera.nudge.moveRight" },
  { dir: "down", glyph: "arrowDown", label: "camera.nudge.moveDown" },
];

/**
 * The fine-adjust cross (arrows, reset and the pin), drawn with one Skia `<Canvas>` for all the
 * discs and glyphs. It sits on the free hand's side, a sibling of the overlay's own gesture detector, so
 * touches on a disc never start a drag, while a finger anywhere else still drags and pinches.
 * Translucent while idle so it covers less of the drawing; solid while an arrow is held; dimmed
 * while locked (a tap then explains the lock instead of moving anything).
 */
export function NudgePad({
  gestures,
  held,
  locked,
  isLocked,
  bottom,
  onStep,
  onReset,
  pinned,
  onPin,
  onLockedPress,
}: NudgePadProps) {
  const [pinKey, setPinKey] = useState(0);
  const insets = useSafeAreaInsets();
  const { controls } = useHandedness();
  const { reduce } = useReduceMotion();

  const fadeMs = duration.micro.ms;
  const padStyle = useAnimatedStyle(() => ({
    opacity: withTiming(
      locked.value ? opacity.disabled : held.value === null ? opacity.nudgePadIdle : 1,
      { duration: fadeMs },
    ),
  }));

  const upFill = useDerivedValue(() => (held.value === "up" ? opacity.pressFill : 0));
  const downFill = useDerivedValue(() => (held.value === "down" ? opacity.pressFill : 0));
  const leftFill = useDerivedValue(() => (held.value === "left" ? opacity.pressFill : 0));
  const rightFill = useDerivedValue(() => (held.value === "right" ? opacity.pressFill : 0));
  const fills = { up: upFill, down: downFill, left: leftFill, right: rightFill };

  const resetTap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((_event, success) => {
      if (!success) return;
      if (isLocked) onLockedPress();
      else onReset();
    });

  // Declared before the gesture: the worklets plugin captures what a gesture callback uses when
  // the gesture is created, so a function declared after it would be undefined inside.
  const pin = () => {
    setPinKey((key) => key + 1);
    onPin();
  };

  const pinTap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((_event, success) => {
      if (!success) return;
      if (isLocked) onLockedPress();
      else pin();
    });

  const side =
    controls === "left" ? { left: insets.left + space[5] } : { right: insets.right + space[5] };

  return (
    <Animated.View
      entering={FadeIn.duration(fadeMs)}
      exiting={FadeOut.duration(fadeMs)}
      pointerEvents="box-none"
      style={[styles.frame, side, { bottom }]}
    >
      <Animated.View
        pointerEvents="box-none"
        accessibilityRole="toolbar"
        accessibilityLabel={t("camera.nudge.pad")}
        style={[styles.pad, padStyle]}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {(Object.keys(CELLS) as (keyof typeof CELLS)[]).map((key) => {
            const { cx, cy } = centre(CELLS[key]);
            const r = CELL / 2;
            return <Circle key={`disc-${key}`} cx={cx} cy={cy} r={r} color={cameraColors.pill} />;
          })}
          {(Object.keys(CELLS) as (keyof typeof CELLS)[]).map((key) => {
            const { cx, cy } = centre(CELLS[key]);
            return (
              <Circle
                key={`edge-${key}`}
                cx={cx}
                cy={cy}
                r={CELL / 2 - 0.5}
                style="stroke"
                strokeWidth={1}
                color={cameraColors.pillEdge}
              />
            );
          })}
          {ARROWS.map(({ dir }) => {
            const { cx, cy } = centre(CELLS[dir]);
            return (
              <Circle
                key={`fill-${dir}`}
                cx={cx}
                cy={cy}
                r={CELL / 2}
                color={cameraColors.accent}
                opacity={fills[dir]}
              />
            );
          })}
          {[
            ...ARROWS.map(({ dir, glyph }) => ({ key: dir, glyph, cell: CELLS[dir] })),
            { key: "reset", glyph: "reset" as const, cell: CELLS.reset },
            { key: "pin", glyph: "pin" as const, cell: CELLS.pin },
          ].map(({ key, glyph, cell }) => {
            const { left, top } = place(cell);
            return (
              <SkiaIcon
                key={`glyph-${key}`}
                name={glyph}
                size={icon.size}
                x={left + (CELL - icon.size) / 2}
                y={top + (CELL - icon.size) / 2}
                color={key === "pin" && pinned ? cameraColors.accent : cameraColors.text}
                drawKey={key === "pin" ? pinKey : 0}
                reduce={reduce}
              />
            );
          })}
        </Canvas>

        {ARROWS.map(({ dir, label }) => (
          <GestureDetector key={dir} gesture={gestures[dir]}>
            <Animated.View
              accessible
              accessibilityRole="button"
              accessibilityLabel={t(label)}
              accessibilityState={{ disabled: isLocked }}
              accessibilityActions={[{ name: "activate" }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "activate") onStep(dir);
              }}
              style={[styles.cell, place(CELLS[dir])]}
            />
          </GestureDetector>
        ))}
        <GestureDetector gesture={resetTap}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("camera.nudge.reset")}
            accessibilityHint={t("camera.nudge.resetHint")}
            accessibilityState={{ disabled: isLocked }}
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName !== "activate") return;
              if (isLocked) onLockedPress();
              else onReset();
            }}
            style={[styles.cell, place(CELLS.reset)]}
          />
        </GestureDetector>
        <GestureDetector gesture={pinTap}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("camera.nudge.pin")}
            accessibilityHint={t("camera.nudge.pinHint")}
            accessibilityState={{ disabled: isLocked, selected: pinned }}
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName !== "activate") return;
              if (isLocked) onLockedPress();
              else pin();
            }}
            style={[styles.cell, place(CELLS.pin)]}
          />
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: "absolute", width: SIZE, height: SIZE },
  pad: { width: SIZE, height: SIZE },
  cell: { position: "absolute", width: CELL, height: CELL },
});
