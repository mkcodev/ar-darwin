import { fitTransform, type Size } from "@ar-darwin/core";
import { opacity } from "@ar-darwin/ui";
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
import { StyleSheet } from "react-native";
import { type DerivedValue, useDerivedValue, useSharedValue } from "react-native-reanimated";

type TestImageCanvasProps = {
  /** `require(...)` result of the active test image. */
  source: number;
};

const ZERO_SIZE: Size = { width: 0, height: 0 };

/**
 * Test image over the camera, fit to the canvas ("contain") with core's fitTransform.
 * Opacity is fixed at `opacity.overlayImage` (packages/ui): no slider yet, that is #18.
 *
 * The fit runs in a `useDerivedValue` on the UI thread, the same place #18's gestures will
 * live, so swapping this static transform for the gesture one later is a one-line change.
 */
export function TestImageCanvas({ source }: TestImageCanvasProps) {
  const image = useImage(source);
  const canvasSize = useSharedValue<Size>(ZERO_SIZE);
  const imageSize = useSharedValue<Size>(ZERO_SIZE);

  useEffect(() => {
    imageSize.value = image ? { width: image.width(), height: image.height() } : ZERO_SIZE;
  }, [image, imageSize]);

  const matrix = useDerivedValue(() => {
    const img = imageSize.value;
    const canvas = canvasSize.value;
    if (img.width === 0 || canvas.width === 0) return Skia.Matrix();
    const t = fitTransform(img, canvas);
    return Skia.Matrix()
      .translate(t.x, t.y)
      .rotate((t.rotation * Math.PI) / 180)
      .scale(t.scale, t.scale)
      .translate(-img.width / 2, -img.height / 2);
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} onSize={canvasSize}>
      {image && <ImageLayer image={image} matrix={matrix} />}
    </Canvas>
  );
}

type ImageLayerProps = {
  image: SkImage;
  matrix: DerivedValue<SkMatrix>;
};

function ImageLayer({ image, matrix }: ImageLayerProps) {
  return (
    <Group matrix={matrix} opacity={opacity.overlayImage}>
      <Image image={image} x={0} y={0} width={image.width()} height={image.height()} />
    </Group>
  );
}
