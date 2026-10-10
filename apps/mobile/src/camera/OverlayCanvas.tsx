import type { Size } from "@ar-darwin/core";
import {
  Canvas,
  Group,
  Image,
  type SkImage,
  Skia,
  type SkMatrix,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  type DerivedValue,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { type OverlayPlacement, useOverlayGestures } from "./useOverlayGestures";

type OverlayCanvasProps = {
  /** The image over the camera, already decoded; `null` while it loads. */
  image: SkImage | null;
  /** 0–1, shared with the opacity slider. */
  opacity: SharedValue<number>;
  /** Touch lock (#19), shared with `LockButton` and forwarded to `useOverlayGestures`. */
  locked: SharedValue<boolean>;
  /** Where the image was left last time; absent fits it. Read once, on the first placement. */
  initial?: OverlayPlacement | null;
  /** Transform settled (placed, gesture ended, reset): never per frame. */
  onSettle?: (placement: OverlayPlacement) => void;
};

const ZERO_SIZE: Size = { width: 0, height: 0 };

/**
 * The overlay image over the camera: drag, pinch and rotate with two fingers at once
 * (`useOverlayGestures`, #18), placed once both the canvas and the image have real sizes (restored
 * from `initial` or fitted), double tap to reset. Opacity comes from the slider next to it; the
 * image stays invisible until it is placed, so it never flashes at the top-left corner.
 *
 * Sized with `onLayout` on the wrapping View (same box as the Canvas: both fill the screen), not
 * Skia's `onSize`: the Canvas itself doesn't support `onLayout` on the New Architecture, and
 * `onSize` calls Reanimated's `measure()` on every frame, which floods Metro with "undefined
 * `LayoutMetrics`" warnings before the first layout lands (issue #25).
 */
export function OverlayCanvas({ image, opacity, locked, initial, onSettle }: OverlayCanvasProps) {
  const canvasSize = useSharedValue<Size>(ZERO_SIZE);
  const imageSize = useSharedValue<Size>(ZERO_SIZE);

  useEffect(() => {
    imageSize.value = image ? { width: image.width(), height: image.height() } : ZERO_SIZE;
  }, [image, imageSize]);

  const { gesture, x, y, scale, rotation, flipX, flipY, placed } = useOverlayGestures({
    imageSize,
    canvasSize,
    locked,
    initial,
    onSettle,
  });

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
    <GestureDetector gesture={gesture}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          canvasSize.value = { width, height };
        }}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {image && <ImageLayer image={image} matrix={matrix} opacity={shownOpacity} />}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

type ImageLayerProps = {
  image: SkImage;
  matrix: DerivedValue<SkMatrix>;
  opacity: DerivedValue<number>;
};

function ImageLayer({ image, matrix, opacity }: ImageLayerProps) {
  return (
    <Group matrix={matrix} opacity={opacity}>
      <Image image={image} x={0} y={0} width={image.width()} height={image.height()} />
    </Group>
  );
}
