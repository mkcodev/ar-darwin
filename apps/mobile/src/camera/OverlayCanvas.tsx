import {
  adjustmentColorMatrix,
  type CameraCrop,
  type Size,
  type TapState,
  tapEnd,
  tapMove,
  tapStart,
} from "@ar-darwin/core";
import { cameraColors } from "@ar-darwin/ui";
import {
  Canvas,
  ColorMatrix,
  Group,
  Image,
  Path,
  type SkImage,
  Skia,
  type SkMatrix,
} from "@shopify/react-native-skia";
import { type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { type GestureResponderEvent, StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  type DerivedValue,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { MagnetGuides } from "./MagnetGuides";
import { NudgePad } from "./NudgePad";
import {
  type FlipAxis,
  type Flips,
  type OverlayPlacement,
  useOverlayGestures,
} from "./useOverlayGestures";

/** Live brightness, contrast (-1..1) and invert (0..1, animatable), shared with the sheet. */
export type OverlayAdjustments = {
  brightness: SharedValue<number>;
  contrast: SharedValue<number>;
  invert: SharedValue<number>;
};

export type OverlayCanvasHandle = {
  /** Mirrors the image on one axis; `null` (nothing done) while locked or not yet placed. */
  toggleFlip: (axis: FlipAxis) => Flips | null;
  /** Ends a fine-adjust hold in progress (focus lost, app in the background), keeping its result. */
  nudgeStop: () => void;
  /** Ends the touches in progress, keeping what is painted (focus lost, app in the background). */
  releaseTouches: () => void;
};

type OverlayCanvasProps = {
  /** The image over the camera, already decoded; `null` while it loads. */
  image: SkImage | null;
  /**
   * Show only this part of the image (a tile of a split project), as if it were the whole image:
   * placement, gestures, magnet and pin all work on its size. Keep it referentially stable.
   */
  crop?: CameraCrop | null;
  /** 0–1, shared with the opacity slider. */
  opacity: SharedValue<number>;
  /** Touch lock (#19), shared with `LockButton` and forwarded to `useOverlayGestures`. */
  locked: SharedValue<boolean>;
  /** The magnet (Settings), shared with the screen: false = gestures never snap. */
  magnetEnabled: SharedValue<boolean>;
  /** Where the image was left last time; absent fits it. Read once, on the first placement. */
  initial?: OverlayPlacement | null;
  /** Transform settled (placed, gesture ended, reset, mirrored): never per frame. */
  onSettle?: (placement: OverlayPlacement) => void;
  adjustments: OverlayAdjustments;
  /** JS mirror of `locked`, for the pad's screen-reader state. */
  isLocked: boolean;
  /** Shows the fine-adjust pad; closing it also ends a hold in progress. */
  nudgeOpen: boolean;
  /** Distance from the bottom of the screen to the pad: it sits above the camera's controls. */
  nudgeBottom: number;
  /** A pad button was tapped while locked. */
  onNudgeBlocked: () => void;
  /** The position pinned as home, if any. Read once. */
  initialPin?: OverlayPlacement | null;
  /** The current position was pinned (JS thread). */
  onPinChange?: (placement: OverlayPlacement | null) => void;
  /** The pin button just pinned the position: the screen confirms it. */
  onPinned: () => void;
  /** The pin button was double tapped and the pin removed: the screen confirms it. */
  onUnpinned: () => void;
  /** A finger is on the image (or the touches were released): the camera menu stays shown. */
  onTouchingChange?: (touching: boolean) => void;
  /**
   * A tap that stayed put (one finger, no drift) landed on the canvas, not on a control: `onImage`
   * says whether it was on the image or on the empty part of the screen.
   */
  onCanvasTap?: (onImage: boolean) => void;
  /** An arrow of the fine-adjust pad is held down (or released): the camera menu stays shown. */
  onNudgeHoldChange?: (held: boolean) => void;
  /** The camera menu is idle: the fine-adjust pad retreats with it. */
  menuRetreated: boolean;
  ref?: Ref<OverlayCanvasHandle>;
};

const ZERO_SIZE: Size = { width: 0, height: 0 };

/**
 * The overlay image over the camera: drag, pinch and rotate with two fingers at once
 * (`useOverlayGestures`, #18), placed once both the canvas and the image have real sizes (restored
 * from `initial` or fitted), double tap to reset. Opacity comes from the slider next to it; the
 * image stays invisible until it is placed, so it never flashes at the top-left corner.
 * Brightness, contrast and invert are a `<ColorMatrix>` on the image, derived on the UI thread
 * from `adjustments` (`adjustmentColorMatrix`, core). The mirror buttons go through `ref`.
 * The magnet (`useOverlayGestures`) snaps what is painted (`shown`) while a finger is down and
 * `MagnetGuides` draws its guides in the same canvas, over the image.
 * The fine-adjust pad (`NudgePad`) is a sibling of the gesture detector, not inside it, so touches
 * on it never reach the drag and pinch gestures.
 *
 * Sized with `onLayout` on the wrapping View (same box as the Canvas: both fill the screen), not
 * Skia's `onSize`: the Canvas itself doesn't support `onLayout` on the New Architecture, and
 * `onSize` calls Reanimated's `measure()` on every frame, which floods Metro with "undefined
 * `LayoutMetrics`" warnings before the first layout lands (issue #25).
 */
export function OverlayCanvas({
  image,
  crop,
  opacity,
  locked,
  magnetEnabled,
  initial,
  onSettle,
  adjustments,
  isLocked,
  nudgeOpen,
  nudgeBottom,
  onNudgeBlocked,
  initialPin,
  onPinChange,
  onPinned,
  onUnpinned,
  onTouchingChange,
  onCanvasTap,
  onNudgeHoldChange,
  menuRetreated,
  ref,
}: OverlayCanvasProps) {
  const { reduce } = useReduceMotion();
  const [pinned, setPinned] = useState(initialPin != null);
  const canvasSize = useSharedValue<Size>(ZERO_SIZE);
  const imageSize = useSharedValue<Size>(ZERO_SIZE);
  const keepOnImageResize = useSharedValue(false);

  // Another tile of the same picture keeps the placement; a different image is fitted again. The
  // flag is written before the size so the placement reaction (UI thread) sees it with the change.
  const lastImage = useRef<SkImage | null>(null);
  useEffect(() => {
    keepOnImageResize.value = image !== null && image === lastImage.current;
    lastImage.current = image;
    if (!image) imageSize.value = ZERO_SIZE;
    else if (crop) imageSize.value = { width: crop.rect.width, height: crop.rect.height };
    else imageSize.value = { width: image.width(), height: image.height() };
  }, [image, crop, imageSize, keepOnImageResize]);

  const {
    gesture,
    shown,
    revealed,
    pinPlacement,
    placed,
    imageContainsPoint,
    toggleFlip,
    nudgeGestures,
    nudgeHeld,
    nudgeTap,
    nudgeStop,
    releaseTouches,
    resetToHome,
    pinHere,
    unpinHere,
  } = useOverlayGestures({
    imageSize,
    canvasSize,
    keepOnImageResize,
    locked,
    magnetEnabled,
    initial,
    onSettle,
    onNudgeBlocked,
    pin: initialPin,
    onPinChange,
    onTouchingChange,
    onNudgeHoldChange,
  });

  useImperativeHandle(ref, () => ({ toggleFlip, nudgeStop, releaseTouches }), [
    toggleFlip,
    nudgeStop,
    releaseTouches,
  ]);

  // Closing the pad (the adjustments sheet opens, the button is toggled) releases a held arrow.
  useEffect(() => {
    if (!nudgeOpen) nudgeStop();
  }, [nudgeOpen, nudgeStop]);

  // Taps on the canvas, told apart from drags and pinches by core's tap tracker. These are React
  // Native's raw touch events on the canvas' own view, so touches on the pills and the pad (their
  // siblings) never get here; RNGH cancels them (`onTouchCancel`) when a drag takes over.
  const tap = useRef<TapState | null>(null);
  const touchHandlers = {
    onTouchStart: (e: GestureResponderEvent) => {
      const { locationX, locationY, touches } = e.nativeEvent;
      tap.current = tapStart(tap.current, locationX, locationY, touches.length);
    },
    onTouchMove: (e: GestureResponderEvent) => {
      const { locationX, locationY, touches } = e.nativeEvent;
      tap.current = tapMove(tap.current, locationX, locationY, touches.length);
    },
    onTouchEnd: (e: GestureResponderEvent) => {
      const ended = tapEnd(tap.current, e.nativeEvent.touches.length);
      tap.current = ended.state;
      if (!ended.tapped) return;
      const { locationX, locationY } = e.nativeEvent;
      onCanvasTap?.(imageContainsPoint(locationX, locationY));
    },
    onTouchCancel: () => {
      tap.current = null;
    },
  };

  const { brightness, contrast, invert } = adjustments;
  const colorMatrix = useDerivedValue(() =>
    adjustmentColorMatrix(brightness.value, contrast.value, invert.value),
  );

  const matrix = useDerivedValue(() => {
    const img = imageSize.value;
    if (img.width === 0) return Skia.Matrix();
    const t = shown.value;
    return Skia.Matrix()
      .translate(t.x, t.y)
      .rotate((t.rotation * Math.PI) / 180)
      .scale(t.scale * (t.flipX ? -1 : 1), t.scale * (t.flipY ? -1 : 1))
      .translate(-img.width / 2, -img.height / 2);
  });

  const shownOpacity = useDerivedValue(() => (placed.value ? opacity.value : 0));

  return (
    <>
      <GestureDetector gesture={gesture}>
        <View
          style={StyleSheet.absoluteFill}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            canvasSize.value = { width, height };
          }}
          {...touchHandlers}
        >
          <Canvas style={StyleSheet.absoluteFill}>
            {image && (
              <ImageLayer
                image={image}
                crop={crop ?? null}
                matrix={matrix}
                opacity={shownOpacity}
                colorMatrix={colorMatrix}
              />
            )}
            <MagnetGuides
              lock={revealed}
              shown={shown}
              canvasSize={canvasSize}
              imageSize={imageSize}
              pin={pinPlacement}
              reduce={reduce}
            />
          </Canvas>
        </View>
      </GestureDetector>
      {nudgeOpen && (
        <NudgePad
          gestures={nudgeGestures}
          held={nudgeHeld}
          locked={locked}
          isLocked={isLocked}
          bottom={nudgeBottom}
          onStep={nudgeTap}
          onReset={resetToHome}
          pinned={pinned}
          onPin={() => {
            if (!pinHere()) return;
            setPinned(true);
            onPinned();
          }}
          onUnpin={() => {
            if (!unpinHere()) return;
            setPinned(false);
            onUnpinned();
          }}
          onLockedPress={onNudgeBlocked}
          retreated={menuRetreated}
        />
      )}
    </>
  );
}

type ImageLayerProps = {
  image: SkImage;
  crop: CameraCrop | null;
  matrix: DerivedValue<SkMatrix>;
  opacity: DerivedValue<number>;
  colorMatrix: DerivedValue<number[]>;
};

/**
 * The image, or one tile of it. A tile is drawn in its own coordinates (0,0 to its size): the
 * image is shifted by the tile's origin and clipped to it, and the strip it took from its
 * neighbours (the ring between its crop and its flush crop) is tinted blue, so it is clear which
 * part is already drawn on the next sheet. Both move with the image: they share its matrix.
 */
function ImageLayer({ image, crop, matrix, opacity, colorMatrix }: ImageLayerProps) {
  const tile = useMemo(() => {
    if (crop === null) return null;
    const { rect, core } = crop;
    const clip = Skia.XYWHRect(0, 0, rect.width, rect.height);
    const extended =
      core.x > 0 ||
      core.y > 0 ||
      core.x + core.width < rect.width ||
      core.y + core.height < rect.height;
    if (!extended) return { clip, ring: null };
    const ring = Skia.PathBuilder.Make();
    ring.addRect(clip);
    ring.addRect(Skia.XYWHRect(core.x, core.y, core.width, core.height));
    return { clip, ring: ring.detach() };
  }, [crop]);

  return (
    <Group matrix={matrix} opacity={opacity}>
      <Group clip={tile?.clip}>
        <Image
          image={image}
          x={crop ? -crop.rect.x : 0}
          y={crop ? -crop.rect.y : 0}
          width={image.width()}
          height={image.height()}
        >
          <ColorMatrix matrix={colorMatrix} />
        </Image>
        {tile?.ring && <Path path={tile.ring} fillType="evenOdd" color={cameraColors.guideTint} />}
      </Group>
    </Group>
  );
}
