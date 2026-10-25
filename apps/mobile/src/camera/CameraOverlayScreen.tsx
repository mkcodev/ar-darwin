import type { CameraCrop, CameraIssueKind, ImageAdjustments } from "@ar-darwin/core";
import { classifyCameraIssue, isIgnorableCameraError } from "@ar-darwin/core";
import {
  cameraBackdropColor,
  cameraColors,
  opacity,
  signature,
  space,
  typography,
} from "@ar-darwin/ui";
import type { SkImage } from "@shopify/react-native-skia";
import { useKeepAwake } from "expo-keep-awake";
import { Stack, useIsFocused } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { FloatingPill } from "../components/FloatingPill";
import { LockButton } from "../components/LockButton";
import { Slider } from "../components/Slider";
import { percentFormat } from "../format";
import { t } from "../i18n";
import { useAppSettings } from "../settings/AppSettingsProvider";
import { useHandedness } from "../theme/HandednessProvider";
import { CameraIssueNotice } from "./CameraIssueNotice";
import { CameraPermissionGate } from "./CameraPermissionGate";
import { CameraTools } from "./CameraTools";
import { ImageAdjustSheet } from "./ImageAdjustSheet";
import { LockedToast } from "./LockedToast";
import { OverlayCanvas, type OverlayCanvasHandle } from "./OverlayCanvas";
import { useMenuIdle } from "./useMenuIdle";
import type { FlipAxis, Flips, OverlayPlacement } from "./useOverlayGestures";

const opacityText = percentFormat(1);

type CameraOverlayScreenProps = {
  /** The image to trace, decoded; `null` while it loads. */
  image: SkImage | null;
  /** Trace only this part of the image (a tile); absent = all of it. Keep it stable. */
  crop?: CameraCrop | null;
  /** Starting overlay opacity, 0–1. Read once. */
  initialOpacity?: number;
  /** Where the image was left last time; absent fits it. Read once. */
  initialPlacement?: OverlayPlacement | null;
  /** The transform settled (placed, gesture ended, reset): never per frame. */
  onPlacementSettle?: (placement: OverlayPlacement) => void;
  /** The opacity slider was released (or stepped by the screen reader). */
  onOpacitySettle?: (opacity: number) => void;
  /** Brightness, contrast and invert to start with; absent = none. Read once. */
  initialAdjustments?: ImageAdjustments;
  /** An image adjustment settled (slider released, invert toggled, reset). */
  onAdjustmentsSettle?: (adjustments: ImageAdjustments) => void;
  /** The position pinned as home, if any. Read once. */
  initialPin?: OverlayPlacement | null;
  /** The position was pinned (or re-pinned). */
  onPinChange?: (placement: OverlayPlacement | null) => void;
  /** The tile bar of a split project: above the slider, and usable while locked. */
  tileBar?: ReactNode;
  /** Extra controls under the slider; hidden (keeping their space) while locked. */
  extraControls?: ReactNode;
  /** Drawn over everything, also while locked (e.g. the spike's fps meter). */
  overlay?: ReactNode;
};

/**
 * The camera with an image over it, shared by the project camera and the spike (`/dev/camera`):
 * camera preview, overlay (`OverlayCanvas`), opacity slider, tools (`CameraTools`: mirror, torch,
 * image adjustments in `ImageAdjustSheet`), touch lock, keep-awake and the camera's error notices.
 * A split project adds its tile bar (`TileBar`) in the bottom pill; changing the tile changes
 * `crop` and the image keeps its placement (`OverlayCanvas`).
 * The slider and the tools are floating pills that retreat after `signature.menuIdleMs` without
 * touches (`useMenuIdle`), and so does the fine-adjust pad; the lock stays where it is.
 * The torch is vision-camera's `torchMode`, only passed when the device has one (setting it on a
 * device without a torch throws into `onError`) and only once it was turned on: any value, even
 * `"off"`, makes vision-camera call `setTorchMode` as soon as the camera mounts, and CameraX
 * cancels that call while the camera is not active yet (`isIgnorableCameraError`). Unmounting the
 * camera turns it off. `constraints={[{fps: 30}]}` biases the preview towards the screen's own
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
  crop,
  initialOpacity = opacity.overlayImage,
  initialPlacement,
  onPlacementSettle,
  onOpacitySettle,
  initialAdjustments,
  onAdjustmentsSettle,
  initialPin,
  onPinChange,
  tileBar,
  extraControls,
  overlay,
}: CameraOverlayScreenProps) {
  const device = useCameraDevice("back");
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const imageOpacity = useSharedValue<number>(initialOpacity);
  const locked = useSharedValue(false);
  const { magnetEnabled, setDrawingHand } = useAppSettings();
  const { hand } = useHandedness();
  const magnetOn = useSharedValue(magnetEnabled);
  useEffect(() => {
    magnetOn.value = magnetEnabled;
  }, [magnetEnabled, magnetOn]);
  const [isLocked, setIsLocked] = useState(false);
  const [issue, setIssue] = useState<CameraIssueKind | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [toast, setToast] = useState({ trigger: 0, message: "" });
  const canvas = useRef<OverlayCanvasHandle>(null);
  const [flips, setFlips] = useState<Flips>(() => ({
    flipX: initialPlacement?.transform.flipX ?? false,
    flipY: initialPlacement?.transform.flipY ?? false,
  }));
  const [torchOn, setTorchOn] = useState(false);
  const [torchUsed, setTorchUsed] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  /** Height of the bottom pill: the fine-adjust pad sits right above it. */
  const [controlsHeight, setControlsHeight] = useState(0);
  /** A finger is on the image / on the slider / holding a fine-adjust arrow: the menu stays shown. */
  const [touching, setTouching] = useState(false);
  const [sliderActive, setSliderActive] = useState(false);
  const [nudgeHolding, setNudgeHolding] = useState(false);
  // The menu (rail, bottom bar and the fine-adjust pad) retreats after `signature.menuIdleMs`
  // without touches. It never hides while a finger is on the image or the slider, an arrow is held
  // or the adjustments sheet is open. The pad being open does not keep it shown: it hides too.
  const {
    idle: menuIdle,
    wake: wakeMenu,
    poke: pokeMenu,
    hide: hideMenu,
    reset: resetMenu,
  } = useMenuIdle(signature.menuIdleMs, touching || sliderActive || nudgeHolding || adjustOpen);

  // The menu answers to taps on the canvas (`OverlayCanvas` `onCanvasTap`: one finger, no drift, on
  // the canvas and not on a control). On the empty part of the screen it toggles: it hides a shown
  // menu at once and brings a hidden one back. On the image it only brings a hidden menu back or
  // restarts the countdown. Dragging, pinching or rotating the image wakes nothing. Any touch on
  // the screen restarts the countdown of a shown menu (the root's `onTouchStart`). The state
  // changes when the finger lifts, never when it lands, so nothing re-renders mid-press.
  const onCanvasTap = (onImage: boolean) => {
    if (!onImage && !menuIdle) hideMenu();
    else wakeMenu();
  };
  const adjustments = {
    brightness: useSharedValue(initialAdjustments?.brightness ?? 0),
    contrast: useSharedValue(initialAdjustments?.contrast ?? 0),
    invert: useSharedValue(initialAdjustments?.invert ? 1 : 0),
  };

  const showToast = (message: string) => {
    setToast((last) => ({ trigger: last.trigger + 1, message }));
  };

  const flip = (axis: FlipAxis) => {
    const next = canvas.current?.toggleFlip(axis);
    if (next) setFlips(next);
  };

  useKeepAwake();

  // A fine-adjust arrow held down, or a finger dragging the image, must not keep acting when the
  // screen loses focus or the app goes to the background (a locked phone): the release would never
  // reach us. Both end here, keeping what is painted (and not leaving the image stuck on a guide).
  // The menu's pauses end too (`releaseTouches` reports the image's), so it can never stay shown
  // for good: it comes back counting when the screen is focused and active again.
  const endInteractions = useCallback(() => {
    canvas.current?.nudgeStop();
    canvas.current?.releaseTouches();
    setSliderActive(false);
    setNudgeHolding(false);
    resetMenu();
  }, [resetMenu]);
  useEffect(() => {
    if (isFocused) wakeMenu();
    else endInteractions();
  }, [isFocused, endInteractions, wakeMenu]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") wakeMenu();
      else endInteractions();
    });
    return () => subscription.remove();
  }, [endInteractions, wakeMenu]);

  // While locked, going back must not leave the camera (#19): block the screen's removal and
  // nudge the person towards the lock instead. A raw `BackHandler` listener wasn't enough — the
  // Android back gesture still left the screen — so this works at the navigation level, where
  // every way of leaving (button, gesture, `router.back()`) ends up. The iOS swipe-back, which
  // native-stack can't intercept this way, is disabled with `gestureEnabled` below.
  usePreventRemove(isLocked, () => {
    showToast(t("cameraSpike.unlockToExit"));
  });

  const retry = () => {
    setIssue(null);
    setSliderActive(false);
    setNudgeHolding(false);
    setCameraKey((key) => key + 1);
  };

  return (
    <View style={[styles.frame, { backgroundColor: cameraBackdropColor }]} onTouchStart={pokeMenu}>
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
                torchMode={device.hasTorch && torchUsed ? (torchOn ? "on" : "off") : undefined}
                onError={(error) => {
                  if (__DEV__) console.warn("[camera] onError", error);
                  if (isIgnorableCameraError(error)) return;
                  setIssue(classifyCameraIssue(error.message));
                }}
                onInterruptionStarted={() => setIssue("inUse")}
                onInterruptionEnded={() => setIssue(null)}
              />
              <OverlayCanvas
                ref={canvas}
                image={image}
                crop={crop}
                opacity={imageOpacity}
                locked={locked}
                magnetEnabled={magnetOn}
                initial={initialPlacement}
                onSettle={onPlacementSettle}
                adjustments={adjustments}
                isLocked={isLocked}
                nudgeOpen={nudgeOpen}
                nudgeBottom={space[10] + controlsHeight + space[4]}
                onNudgeBlocked={() => showToast(t("camera.unlockToNudge"))}
                initialPin={initialPin}
                onPinChange={onPinChange}
                onPinned={() => showToast(t("camera.nudge.pinned"))}
                onUnpinned={() => showToast(t("camera.nudge.unpinned"))}
                onTouchingChange={setTouching}
                onCanvasTap={onCanvasTap}
                onNudgeHoldChange={setNudgeHolding}
                menuRetreated={menuIdle}
              />
              {/* The menu: a tool rail under the lock and a slim bar with the opacity slider,
                  both retreating when idle (`menuIdle`). The slider and the tools stay usable
                  while locked (opacity, torch and image adjustments are tuned while drawing; the
                  mirror dims); the extra controls hide but keep their space so nothing jumps. */}
              <CameraTools
                retreated={menuIdle}
                flips={flips}
                isLocked={isLocked}
                onFlip={flip}
                onLockedFlip={() => showToast(t("camera.unlockToMirror"))}
                torchOn={device.hasTorch ? torchOn : null}
                onTorchChange={(on) => {
                  setTorchOn(on);
                  if (on) setTorchUsed(true);
                }}
                nudgeOpen={nudgeOpen}
                onToggleNudge={() => setNudgeOpen((open) => !open)}
                adjustOpen={adjustOpen}
                onOpenAdjust={() => {
                  // The sheet owns the screen while it is open: the pad closes (and releases a
                  // held arrow) and does not come back by itself.
                  setNudgeOpen(false);
                  setAdjustOpen(true);
                }}
                onSwapSides={() => setDrawingHand(hand === "right" ? "left" : "right")}
              />
              <View
                style={styles.controls}
                pointerEvents="box-none"
                onLayout={(e) => setControlsHeight(e.nativeEvent.layout.height)}
              >
                <FloatingPill
                  retreated={menuIdle}
                  towards="down"
                  direction="column"
                  label={t("camera.menu.top")}
                  style={styles.bar}
                >
                  {tileBar}
                  <View style={styles.sliderSlot}>
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
                      onActiveChange={setSliderActive}
                    />
                  </View>
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
                </FloatingPill>
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
      <ImageAdjustSheet
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        adjustments={adjustments}
        onSettle={onAdjustmentsSettle}
      />
      <LockedToast trigger={toast.trigger} message={toast.message} top={insets.top + space[5]} />
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
  },
  bar: { alignSelf: "stretch" },
  sliderSlot: { alignSelf: "stretch", paddingHorizontal: space[3] },
  extraRow: { flexDirection: "row", justifyContent: "center", gap: space[3] },
  hidden: { opacity: 0 },
});
