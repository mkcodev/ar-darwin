import type { Size } from "@ar-darwin/core";
import {
  Canvas,
  Group,
  Image,
  type SkImage,
  Skia,
  type SkMatrix,
  useImage,
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
import { useOverlayGestures } from "./useOverlayGestures";

type TestImageCanvasProps = {
  /** `require(...)` result of the active test image. */
  source: number;
  /** 0–1, shared with the opacity slider. */
  opacity: SharedValue<number>;
  /** Touch lock (#19), shared with `LockButton` and forwarded to `useOverlayGestures`. */
  locked: SharedValue<boolean>;
};

const ZERO_SIZE: Size = { width: 0, height: 0 };

/**
 * Test image over the camera: drag, pinch and rotate with two fingers at once
 * (`useOverlayGestures`, #18), fit to the canvas with `fitTransform` on first layout and on
 * every new test image, double tap to reset. Opacity comes from the slider next to it.
 *
 * Sized with `onLayout` on the wrapping View (same box as the Canvas: both fill the screen), not
 * Skia's `onSize`: the Canvas itself doesn't support `onLayout` on the New Architecture, and
 * `onSize` calls Reanimated's `measure()` on every frame, which floods Metro with "undefined
 * `LayoutMetrics`" warnings before the first layout lands (issue #25).
 */
export function TestImageCanvas({ source, opacity, locked }: TestImageCanvasProps) {
  const image = useImage(source);
  const canvasSize = useSharedValue<Size>(ZERO_SIZE);
  const imageSize = useSharedValue<Size>(ZERO_SIZE);

  useEffect(() => {
    imageSize.value = image ? { width: image.width(), height: image.height() } : ZERO_SIZE;
  }, [image, imageSize]);

  const { gesture, x, y, scale, rotation } = useOverlayGestures({ imageSize, canvasSize, locked });

  const matrix = useDerivedValue(() => {
    const img = imageSize.value;
    if (img.width === 0) return Skia.Matrix();
    return Skia.Matrix()
      .translate(x.value, y.value)
      .rotate((rotation.value * Math.PI) / 180)
      .scale(scale.value, scale.value)
      .translate(-img.width / 2, -img.height / 2);
  });

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
          {image && <ImageLayer image={image} matrix={matrix} opacity={opacity} />}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

type ImageLayerProps = {
  image: SkImage;
  matrix: DerivedValue<SkMatrix>;
  opacity: SharedValue<number>;
};

function ImageLayer({ image, matrix, opacity }: ImageLayerProps) {
  return (
    <Group matrix={matrix} opacity={opacity}>
      <Image image={image} x={0} y={0} width={image.width()} height={image.height()} />
    </Group>
  );
}
