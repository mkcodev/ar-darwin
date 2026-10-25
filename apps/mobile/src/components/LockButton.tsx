import { cameraColors, lockButton, radius, signature, space } from "@ar-darwin/ui";
import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { t } from "../i18n";
import { useHandedness } from "../theme/HandednessProvider";
import { playHaptic } from "../theme/playHaptic";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { SkiaIcon } from "./SkiaIcon";

type LockButtonProps = {
  /** Shared with `useOverlayGestures`, read on the UI thread: never animated, only flipped. */
  locked: SharedValue<boolean>;
  /** JS-thread mirror of `locked.value`, for accessibility and the icon colour (same pattern as
   *  `Slider`'s `now`: shared values aren't read reactively during render). */
  isLocked: boolean;
  onLockedChange: (locked: boolean) => void;
  /**
   * "freeHand" (default): absolute at the top of the screen, on the free hand's side
   * (`useHandedness().controls`), below the safe area. "free": the caller places it.
   */
  placement?: "freeHand" | "free";
};

const CENTRE = lockButton.ringSize / 2;
/** The disc is centred in the bigger ring frame: the frame sticks out this far on every side. */
const RING_OVERHANG = (lockButton.ringSize - lockButton.size) / 2;
/** The progress arc runs down the middle of the graphite track, inside the frame's edge. */
const ARC_RADIUS = CENTRE - lockButton.ringTrackPad - lockButton.ringWidth / 2;
const ARC_RECT = Skia.XYWHRect(
  CENTRE - ARC_RADIUS,
  CENTRE - ARC_RADIUS,
  ARC_RADIUS * 2,
  ARC_RADIUS * 2,
);
const TRACK_WIDTH = lockButton.ringWidth + lockButton.ringTrackPad * 2;

/** Static shapes, built once with Skia 2.6's immutable path factories. */
const DISC = Skia.Path.Circle(CENTRE, CENTRE, (lockButton.size - lockButton.edgeWidth) / 2);
const TRACK = Skia.Path.Circle(CENTRE, CENTRE, ARC_RADIUS);
const TRACK_EDGE = Skia.Path.Circle(CENTRE, CENTRE, CENTRE - lockButton.edgeWidth / 2);

const ICON_SIZE = lockButton.size / 2;

/**
 * Touch-lock button (#19): ignores every touch except a 1 s long press (`signature.lockHoldMs`),
 * which flips `locked` and confirms it with a haptic. The ring (`lockButton.ringSize`, wider than a
 * fingertip so it shows around the finger, on a graphite track) fills clockwise with a plain
 * `withTiming` on the UI thread (no custom core helper needed: unlike `transform.ts`'s gesture
 * math, this is Reanimated's own timing, not bespoke worklet logic) and snaps back if the press
 * is released or cancelled before completing. Locking redraws the padlock («trazo vivo»).
 *
 * Memoized: its `Gesture.LongPress()` is rebuilt on every render, and RNGH swaps the handlers of a
 * gesture that is mid-press when that happens (`updateHandlers`), so a re-render while the finger
 * is held (the camera menu showing up, a toast) could let `onStart` slip by and the lock never
 * engage. Its props are stable (`locked`, `onLockedChange`, `placement`); only `isLocked` changes.
 */
export const LockButton = memo(function LockButton({
  locked,
  isLocked,
  onLockedChange,
  placement = "freeHand",
}: LockButtonProps) {
  const progress = useSharedValue(0);
  const [drawKey, setDrawKey] = useState(0);
  const { controls } = useHandedness();
  const { reduce } = useReduceMotion();
  const insets = useSafeAreaInsets();

  const toggle = () => {
    locked.value = !locked.value;
    if (locked.value) setDrawKey((k) => k + 1);
    onLockedChange(locked.value);
    playHaptic("lockToggle");
  };

  const longPress = Gesture.LongPress()
    .minDuration(signature.lockHoldMs)
    .onBegin(() => {
      progress.value = withTiming(1, { duration: signature.lockHoldMs });
    })
    .onStart(() => {
      scheduleOnRN(toggle);
    })
    .onFinalize((_event, success) => {
      if (!success) progress.value = withTiming(0, { duration: 120 });
      else progress.value = withTiming(0, { duration: 0 });
    });

  const ringPath = useDerivedValue(() =>
    Skia.PathBuilder.Make()
      .addArc(ARC_RECT, -90, 360 * progress.value)
      .detach(),
  );
  // The graphite track is only there while the ring fills, so the lock at rest is the plain disc.
  const trackOpacity = useDerivedValue(() => (progress.value > 0 ? 1 : 0));

  // The frame is bigger than the disc: it starts `RING_OVERHANG` earlier so the disc stays put.
  const place =
    placement === "freeHand"
      ? [
          styles.freeHand,
          { top: insets.top + space[5] - RING_OVERHANG },
          controls === "left"
            ? { left: insets.left + space[5] - RING_OVERHANG }
            : { right: insets.right + space[5] - RING_OVERHANG },
        ]
      : null;

  return (
    <View style={place}>
      <GestureDetector gesture={longPress}>
        <Animated.View
          accessible
          accessibilityRole="switch"
          accessibilityLabel={t(isLocked ? "cameraSpike.unlock" : "cameraSpike.lock")}
          accessibilityHint={t("cameraSpike.lockHint")}
          accessibilityState={{ checked: isLocked }}
          accessibilityActions={[{ name: "activate" }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "activate") toggle();
          }}
          style={styles.frame}
        >
          <Canvas style={StyleSheet.absoluteFill}>
            <Group>
              <Group opacity={trackOpacity}>
                <Path
                  path={TRACK}
                  style="stroke"
                  strokeWidth={TRACK_WIDTH}
                  color={cameraColors.pillSolid}
                />
                <Path
                  path={TRACK_EDGE}
                  style="stroke"
                  strokeWidth={lockButton.edgeWidth}
                  color={cameraColors.pillEdge}
                />
              </Group>
              <Path path={DISC} color={cameraColors.pillSolid} />
              <Path
                path={DISC}
                style="stroke"
                strokeWidth={lockButton.edgeWidth}
                color={cameraColors.pillEdge}
              />
              <Path
                path={ringPath}
                style="stroke"
                strokeWidth={lockButton.ringWidth}
                strokeCap="round"
                color={cameraColors.accent}
              />
              <SkiaIcon
                name="lock"
                size={ICON_SIZE}
                x={CENTRE - ICON_SIZE / 2}
                y={CENTRE - ICON_SIZE / 2}
                color={isLocked ? cameraColors.accent : cameraColors.text}
                drawKey={drawKey}
                reduce={reduce}
              />
            </Group>
          </Canvas>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  freeHand: { position: "absolute" },
  frame: {
    width: lockButton.ringSize,
    height: lockButton.ringSize,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
