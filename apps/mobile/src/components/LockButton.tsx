import { cameraColors, lockButton, radius, signature, space } from "@ar-darwin/ui";
import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import { useState } from "react";
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

const RING_RECT = Skia.XYWHRect(
  lockButton.ringWidth / 2,
  lockButton.ringWidth / 2,
  lockButton.size - lockButton.ringWidth,
  lockButton.size - lockButton.ringWidth,
);

/** Static background disc (fill + edge), built once with Skia 2.6's immutable path factories. */
const DISC = Skia.Path.Circle(
  lockButton.size / 2,
  lockButton.size / 2,
  (lockButton.size - lockButton.edgeWidth) / 2,
);

const ICON_SIZE = lockButton.size / 2;

/**
 * Touch-lock button (#19): ignores every touch except a 1 s long press (`signature.lockHoldMs`),
 * which flips `locked` and confirms it with a haptic. The ring fills clockwise with a plain
 * `withTiming` on the UI thread (no custom core helper needed: unlike `transform.ts`'s gesture
 * math, this is Reanimated's own timing, not bespoke worklet logic) and snaps back if the press
 * is released or cancelled before completing. Locking redraws the padlock («trazo vivo»).
 */
export function LockButton({
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
      .addArc(RING_RECT, -90, 360 * progress.value)
      .detach(),
  );

  const place =
    placement === "freeHand"
      ? [
          styles.freeHand,
          { top: insets.top + space[5] },
          controls === "left"
            ? { left: insets.left + space[5] }
            : { right: insets.right + space[5] },
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
                x={(lockButton.size - ICON_SIZE) / 2}
                y={(lockButton.size - ICON_SIZE) / 2}
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
}

const styles = StyleSheet.create({
  freeHand: { position: "absolute" },
  frame: {
    width: lockButton.size,
    height: lockButton.size,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
