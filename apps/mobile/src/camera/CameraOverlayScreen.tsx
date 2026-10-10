import type { CameraIssueKind } from "@ar-darwin/core";
import { classifyCameraIssue } from "@ar-darwin/core";
import { cameraBackdropColor, cameraColors, opacity, space, typography } from "@ar-darwin/ui";
import type { SkImage } from "@shopify/react-native-skia";
import { useKeepAwake } from "expo-keep-awake";
import { Stack, useIsFocused } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { LockButton } from "../components/LockButton";
import { Slider } from "../components/Slider";
import { percentFormat } from "../format";
import { t } from "../i18n";
import { CameraIssueNotice } from "./CameraIssueNotice";
import { CameraPermissionGate } from "./CameraPermissionGate";
import { LockedToast } from "./LockedToast";
import { OverlayCanvas } from "./OverlayCanvas";
import type { OverlayPlacement } from "./useOverlayGestures";

const opacityText = percentFormat(1);

type CameraOverlayScreenProps = {
  /** The image to trace, decoded; `null` while it loads. */
  image: SkImage | null;
  /** Starting overlay opacity, 0–1. Read once. */
  initialOpacity?: number;
  /** Where the image was left last time; absent fits it. Read once. */
  initialPlacement?: OverlayPlacement | null;
  /** The transform settled (placed, gesture ended, reset): never per frame. */
  onPlacementSettle?: (placement: OverlayPlacement) => void;
  /** The opacity slider was released (or stepped by the screen reader). */
  onOpacitySettle?: (opacity: number) => void;
  /** Extra controls under the slider; hidden (keeping their space) while locked. */
  extraControls?: ReactNode;
  /** Drawn over everything, also while locked (e.g. the spike's fps meter). */
  overlay?: ReactNode;
};

/**
 * The camera with an image over it, shared by the project camera and the spike (`/dev/camera`):
 * camera preview, overlay (`OverlayCanvas`), opacity slider, touch lock, keep-awake and the
 * camera's error notices. `constraints={[{fps: 30}]}` biases the preview towards the screen's own
 * resolution instead of the sensor's maximum (see docs/ARCHITECTURE.md).
 *
 * Camera errors (#19): vision-camera's `onError` only ever fires for CameraX's CRITICAL errors
 * (disabled by policy, removed, fatal) — `classifyCameraIssue` (core) reads its plain-text
 * `message` into one of our three notices. A camera already in use by another app is instead
 * RECOVERABLE, so CameraX reports it as an interruption, not an error: `onInterruptionStarted`/
 * `onInterruptionEnded` cover that case directly (see docs/ARCHITECTURE.md).
 */
export function CameraOverlayScreen({
  image,
  initialOpacity = opacity.overlayImage,
  initialPlacement,
  onPlacementSettle,
  onOpacitySettle,
  extraControls,
  overlay,
}: CameraOverlayScreenProps) {
  const device = useCameraDevice("back");
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const imageOpacity = useSharedValue<number>(initialOpacity);
  const locked = useSharedValue(false);
  const [isLocked, setIsLocked] = useState(false);
  const [issue, setIssue] = useState<CameraIssueKind | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [unlockToastTrigger, setUnlockToastTrigger] = useState(0);

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
              <OverlayCanvas
                image={image}
                opacity={imageOpacity}
                locked={locked}
                initial={initialPlacement}
                onSettle={onPlacementSettle}
              />
              {/* The slider stays usable while locked (opacity is tuned while drawing); the
                  extra controls hide but keep their space so the slider doesn't jump. */}
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
                  onChangeEnd={onOpacitySettle}
                />
                {extraControls && (
                  <View
                    style={[styles.extraRow, isLocked && styles.hidden]}
                    pointerEvents={isLocked ? "none" : "box-none"}
                    accessibilityElementsHidden={isLocked}
                    importantForAccessibility={isLocked ? "no-hide-descendants" : "auto"}
                  >
                    {extraControls}
                  </View>
                )}
              </View>
            </>
          )
        ) : (
          <Text style={[styles.noDevice, { color: cameraColors.text }]}>
            {t("cameraSpike.noDevice")}
          </Text>
        )}
      </CameraPermissionGate>
      <LockButton locked={locked} isLocked={isLocked} onLockedChange={setIsLocked} />
      {overlay}
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
  extraRow: { flexDirection: "row", justifyContent: "center", gap: space[3] },
  hidden: { opacity: 0 },
});
