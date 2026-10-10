import { cameraColors, lockButton, radius, signature } from "@ar-darwin/ui";
import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { playHaptic } from "../design/playHaptic";
import { t } from "../i18n";
import { CameraIcon } from "./CameraIcon";

type LockButtonProps = {
  /** Shared with `useOverlayGestures`, read on the UI thread: never animated, only flipped. */
  locked: SharedValue<boolean>;
  /** JS-thread mirror of `locked.value`, for accessibility and the icon colour (same pattern as
   *  `OpacitySlider`'s `now`: shared values aren't read reactively during render). */
  isLocked: boolean;
  onLockedChange: (locked: boolean) => void;
};

const RING_RECT = Skia.XYWHRect(
  lockButton.ringWidth / 2,
  lockButton.ringWidth / 2,
  lockButton.size - lockButton.ringWidth,
  lockButton.size - lockButton.ringWidth,
);

/**
 * Touch-lock button (#19): ignores every touch except a 1 s long press (`signature.lockHoldMs`),
 * which flips `locked` and confirms it with a haptic. The ring fills clockwise with a plain
 * `withTiming` on the UI thread (no custom core helper needed: unlike `transform.ts`'s gesture
 * math, this is Reanimated's own timing, not bespoke worklet logic) and snaps back if the press
 * is released or cancelled before completing.
 */
export function LockButton({ locked, isLocked, onLockedChange }: LockButtonProps) {
  const progress = useSharedValue(0);

  const toggle = () => {
    locked.value = !locked.value;
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

  const ringPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    path.addArc(RING_RECT, -90, 360 * progress.value);
    return path;
  });

  return (
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
            <Path
              path={Skia.Path.Make().addCircle(
                lockButton.size / 2,
                lockButton.size / 2,
                (lockButton.size - lockButton.edgeWidth) / 2,
              )}
              color={cameraColors.pillSolid}
            />
            <Path
              path={Skia.Path.Make().addCircle(
                lockButton.size / 2,
                lockButton.size / 2,
                (lockButton.size - lockButton.edgeWidth) / 2,
              )}
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
          </Group>
        </Canvas>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <CameraIcon
            name="lock"
            size={lockButton.size * 0.5}
            color={isLocked ? cameraColors.accent : cameraColors.text}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: lockButton.size,
    height: lockButton.size,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
