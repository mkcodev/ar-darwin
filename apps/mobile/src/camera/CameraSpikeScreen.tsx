import type { CameraIssueKind } from "@ar-darwin/core";
import { classifyCameraIssue } from "@ar-darwin/core";
import {
  cameraBackdropColor,
  cameraColors,
  controlsSide,
  DEFAULT_HANDEDNESS,
  opacity,
  space,
  typography,
} from "@ar-darwin/ui";
import { useKeepAwake } from "expo-keep-awake";
import { Stack, useIsFocused } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { Slider } from "../components/Slider";
import { percentFormat } from "../format";
import { t } from "../i18n";
import { CameraIssueNotice } from "./CameraIssueNotice";
import { CameraPermissionGate } from "./CameraPermissionGate";
import { FpsMeter } from "./FpsMeter";
import { FpsToggle } from "./FpsToggle";
import { LockButton } from "./LockButton";
import { LockedToast } from "./LockedToast";
import { TestImageCanvas } from "./TestImageCanvas";
import { TestImageToggle } from "./TestImageToggle";

const opacityText = percentFormat(1);

const TEST_IMAGES = {
  calibration: require("../../assets/images/test/calibration.png"),
  sketch: require("../../assets/images/test/darwin-i-think.png"),
};

/**
 * Issue #17 (camera + test image), #18 (drag/pinch/rotate with two fingers at once, double tap
 * to reset, opacity slider — all in `TestImageCanvas`/`useOverlayGestures`) and #19 (touch lock,
 * `useKeepAwake`, the error notice below). `constraints={[{fps: 30}]}` biases the preview towards
 * the screen's own resolution instead of the sensor's maximum (see docs/ARCHITECTURE.md) — to be
 * measured for real in #20, with `FpsMeter` (UI and JS fps, toggled by `FpsToggle`) in the
 * `preview` release build (see docs/spikes/camera.md).
 *
 * Camera errors (#19): vision-camera's `onError` only ever fires for CameraX's CRITICAL errors
 * (disabled by policy, removed, fatal) — `classifyCameraIssue` (core) reads its plain-text
 * `message` into one of our three notices. A camera already in use by another app is instead
 * RECOVERABLE, so CameraX reports it as an interruption, not an error: `onInterruptionStarted`/
 * `onInterruptionEnded` cover that case directly (see docs/ARCHITECTURE.md).
 */
export function CameraSpikeScreen() {
  const device = useCameraDevice("back");
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [showingSketch, setShowingSketch] = useState(false);
  const imageOpacity = useSharedValue<number>(opacity.overlayImage);
  const locked = useSharedValue(false);
  const [isLocked, setIsLocked] = useState(false);
  const [issue, setIssue] = useState<CameraIssueKind | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [unlockToastTrigger, setUnlockToastTrigger] = useState(0);
  const [showFps, setShowFps] = useState(false);

  useKeepAwake();

  // While locked, going back must not leave the camera (#19): block the screen's removal and
  // nudge the person towards the lock instead. A raw `BackHandler` listener wasn't enough — the
  // Android back gesture still left the screen — so this works at the navigation level, where
  // every way of leaving (button, gesture, `router.back()`) ends up. The iOS swipe-back, which
  // native-stack can't intercept this way, is disabled with `gestureEnabled` below.
  usePreventRemove(isLocked, () => {
    setUnlockToastTrigger((n) => n + 1);
  });

  const retry = () => {
    setIssue(null);
    setCameraKey((key) => key + 1);
  };

  const lockSide = controlsSide(DEFAULT_HANDEDNESS);

  return (
    <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]}>
      <StatusBar style="light" />
      <Stack.Screen options={{ gestureEnabled: !isLocked }} />
      <CameraPermissionGate>
        {device ? (
          issue ? (
            <CameraIssueNotice kind={issue} onRetry={retry} />
          ) : (
            <>
              <Camera
                key={cameraKey}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isFocused}
                constraints={[{ fps: 30 }]}
                onError={(error) => setIssue(classifyCameraIssue(error.message))}
                onInterruptionStarted={() => setIssue("inUse")}
                onInterruptionEnded={() => setIssue(null)}
              />
              <TestImageCanvas
                source={TEST_IMAGES[showingSketch ? "sketch" : "calibration"]}
                opacity={imageOpacity}
                locked={locked}
              />
              {/* The slider stays usable while locked (opacity is tuned while drawing); the
                  image and fps toggles hide but keep their space so the slider doesn't jump. */}
              <View style={styles.controls} pointerEvents="box-none">
                <Slider
                  label={t("camera.opacity")}
                  value={imageOpacity}
                  min={0}
                  max={1}
                  step={0.01}
                  format={opacityText}
                  compact
                  tone="camera"
                />
                <View
                  style={[styles.toggleRow, isLocked && styles.hidden]}
                  pointerEvents={isLocked ? "none" : "box-none"}
                  accessibilityElementsHidden={isLocked}
                  importantForAccessibility={isLocked ? "no-hide-descendants" : "auto"}
                >
                  <TestImageToggle
                    showingSketch={showingSketch}
                    onToggle={() => setShowingSketch((s) => !s)}
                  />
                  <FpsToggle showing={showFps} onToggle={() => setShowFps((s) => !s)} />
                </View>
              </View>
            </>
          )
        ) : (
          <Text style={[styles.noDevice, { color: cameraColors.text }]}>
            {t("cameraSpike.noDevice")}
          </Text>
        )}
      </CameraPermissionGate>
      <View
        style={[
          styles.lockWrap,
          { top: insets.top + space[5] },
          lockSide === "left" ? { left: space[5] } : { right: space[5] },
        ]}
      >
        <LockButton locked={locked} isLocked={isLocked} onLockedChange={setIsLocked} />
      </View>
      {/* Stays visible while locked: the 10-minute test reads it while drawing. */}
      {showFps && (
        <FpsMeter top={insets.top + space[5]} side={lockSide === "left" ? "right" : "left"} />
      )}
      <LockedToast trigger={unlockToastTrigger} top={insets.top + space[5]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  noDevice: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
  },
  controls: {
    position: "absolute",
    left: space[5],
    right: space[5],
    bottom: space[10],
    gap: space[4],
  },
  toggleRow: { flexDirection: "row", justifyContent: "center", gap: space[3] },
  hidden: { opacity: 0 },
  lockWrap: { position: "absolute" },
});
