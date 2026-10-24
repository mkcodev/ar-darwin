import { adjustmentColorMatrix, type Size } from "@ar-darwin/core";
import {
  Canvas,
  ColorMatrix,
  Group,
  Image,
  type SkImage,
  Skia,
  type SkMatrix,
} from "@shopify/react-native-skia";
import { type Ref, useEffect, useImperativeHandle } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  type DerivedValue,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
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
};

type OverlayCanvasProps = {
  /** The image over the camera, already decoded; `null` while it loads. */
  image: SkImage | null;
  /** 0–1, shared with the opacity slider. */
  opacity: SharedValue<number>;
  /** Touch lock (#19), shared with `LockButton` and forwarded to `useOverlayGestures`. */
  locked: SharedValue<boolean>;
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
 *
 * Sized with `onLayout` on the wrapping View (same box as the Canvas: both fill the screen), not
 * Skia's `onSize`: the Canvas itself doesn't support `onLayout` on the New Architecture, and
 * `onSize` calls Reanimated's `measure()` on every frame, which floods Metro with "undefined
 * `LayoutMetrics`" warnings before the first layout lands (issue #25).
 */
export function OverlayCanvas({
  image,
  opacity,
  locked,
  initial,
  onSettle,
  adjustments,
  isLocked,
  nudgeOpen,
  nudgeBottom,
  onNudgeBlocked,
  ref,
}: OverlayCanvasProps) {
  const canvasSize = useSharedValue<Size>(ZERO_SIZE);
  const imageSize = useSharedValue<Size>(ZERO_SIZE);

  useEffect(() => {
    imageSize.value = image ? { width: image.width(), height: image.height() } : ZERO_SIZE;
  }, [image, imageSize]);

  const {
    gesture,
    x,
    y,
    scale,
    rotation,
    flipX,
    flipY,
    placed,
    toggleFlip,
    nudgeGestures,
    nudgeHeld,
    nudgeTap,
    nudgeStop,
    resetToOpening,
  } = useOverlayGestures({ imageSize, canvasSize, locked, initial, onSettle, onNudgeBlocked });

  useImperativeHandle(ref, () => ({ toggleFlip, nudgeStop }), [toggleFlip, nudgeStop]);

  // Closing the pad (the adjustments sheet opens, the button is toggled) releases a held arrow.
  useEffect(() => {
    if (!nudgeOpen) nudgeStop();
  }, [nudgeOpen, nudgeStop]);

  const { brightness, contrast, invert } = adjustments;
  const colorMatrix = useDerivedValue(() =>
    adjustmentColorMatrix(brightness.value, contrast.value, invert.value),
  );

  const matrix = useDerivedValue(() => {
    const img = imageSize.value;
    if (img.width === 0) return Skia.Matrix();
    return Skia.Matrix()
      .translate(x.value, y.value)
      .rotate((rotation.value * Math.PI) / 180)
      .scale(scale.value * (flipX.value ? -1 : 1), scale.value * (flipY.value ? -1 : 1))
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
        >
          <Canvas style={StyleSheet.absoluteFill}>
            {image && (
              <ImageLayer
                image={image}
                matrix={matrix}
                opacity={shownOpacity}
                colorMatrix={colorMatrix}
              />
            )}
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
          onReset={resetToOpening}
          onLockedPress={onNudgeBlocked}
        />
      )}
    </>
  );
}

type ImageLayerProps = {
  image: SkImage;
  matrix: DerivedValue<SkMatrix>;
  opacity: DerivedValue<number>;
  colorMatrix: DerivedValue<number[]>;
};

function ImageLayer({ image, matrix, opacity, colorMatrix }: ImageLayerProps) {
  return (
    <Group matrix={matrix} opacity={opacity}>
      <Image image={image} x={0} y={0} width={image.width()} height={image.height()}>
        <ColorMatrix matrix={colorMatrix} />
      </Image>
    </Group>
  );
}
