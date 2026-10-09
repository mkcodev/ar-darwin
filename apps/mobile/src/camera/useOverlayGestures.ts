import { applyGesture, fitTransform, nudge, rotationDeadZone, type Size } from "@ar-darwin/core";
import { resolveMotion, spring, toReanimatedSpring } from "@ar-darwin/ui";
import { Gesture } from "react-native-gesture-handler";
import {
  type SharedValue,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type Options = {
  imageSize: SharedValue<Size>;
  canvasSize: SharedValue<Size>;
};

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * Drag, pinch and rotate the test image with two fingers at once, all on the UI thread.
 * Double tap resets to `fitTransform`. No magnet here (that is phase 3): see the comment at
 * the bottom of the pinch/rotation handlers for exactly where `snapTransform` will go.
 *
 * `translationX/Y`, `scale` and `rotation` from react-native-gesture-handler accumulate from
 * the start of each gesture's own activation, which does not line up across pan/pinch/rotation
 * running at once (pan keeps going while a second finger lands, pinch and rotation restart).
 * `onChange`'s `changeX/Y`, `scaleChange` and `rotationChange` are each already relative to the
 * previous frame instead, so every gesture folds its own contribution into the same x/y/scale/
 * rotation shared values independently, with no rebasing needed — see `applyGesture` (core).
 */
export function useOverlayGestures({ imageSize, canvasSize }: Options) {
  const reduce = useReducedMotion();

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  /** Raw (un-dead-zoned) rotation accumulated since the current two-finger gesture began. */
  const rotationAccum = useSharedValue(0);

  // First layout, or a new test image: snap straight to fitTransform, no animation. The string
  // key (not the size objects themselves) is what makes this fire only when a size actually
  // changes, not on every frame the canvas happens to report its size again.
  useAnimatedReaction(
    () => {
      const image = imageSize.value;
      const canvas = canvasSize.value;
      return `${image.width}x${image.height}:${canvas.width}x${canvas.height}`;
    },
    () => {
      const image = imageSize.value;
      const canvas = canvasSize.value;
      if (image.width === 0 || canvas.width === 0) return;
      const fit = fitTransform(image, canvas);
      x.value = fit.x;
      y.value = fit.y;
      scale.value = fit.scale;
      rotation.value = fit.rotation;
    },
  );

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onChange((e) => {
      const next = applyGesture(
        {
          x: x.value,
          y: y.value,
          scale: scale.value,
          rotation: rotation.value,
          flipX: false,
          flipY: false,
        },
        {
          changeX: e.changeX,
          changeY: e.changeY,
          scaleChange: 1,
          rotationChange: 0,
          focalX: 0,
          focalY: 0,
        },
      );
      x.value = next.x;
      y.value = next.y;
    });

  const pinch = Gesture.Pinch().onChange((e) => {
    // Phase 3 magnet: compute `snapTransform` on this result for display, and only write it
    // here (the stored base for next frame) once the gesture ends.
    const next = applyGesture(
      {
        x: x.value,
        y: y.value,
        scale: scale.value,
        rotation: rotation.value,
        flipX: false,
        flipY: false,
      },
      {
        changeX: 0,
        changeY: 0,
        scaleChange: e.scaleChange,
        rotationChange: 0,
        focalX: e.focalX,
        focalY: e.focalY,
      },
    );
    x.value = next.x;
    y.value = next.y;
    scale.value = next.scale;
  });

  const rotate = Gesture.Rotation()
    .onStart(() => {
      rotationAccum.value = 0;
    })
    .onChange((e) => {
      const before = rotationDeadZone(rotationAccum.value);
      rotationAccum.value += toDegrees(e.rotationChange);
      const after = rotationDeadZone(rotationAccum.value);
      // Phase 3 magnet: same note as pinch above.
      const next = applyGesture(
        {
          x: x.value,
          y: y.value,
          scale: scale.value,
          rotation: rotation.value,
          flipX: false,
          flipY: false,
        },
        {
          changeX: 0,
          changeY: 0,
          scaleChange: 1,
          rotationChange: after - before,
          focalX: e.anchorX,
          focalY: e.anchorY,
        },
      );
      x.value = next.x;
      y.value = next.y;
      rotation.value = next.rotation;
    });

  const reset = () => {
    const base = fitTransform(imageSize.value, canvasSize.value);
    const target = nudge(
      {
        x: x.value,
        y: y.value,
        scale: scale.value,
        rotation: rotation.value,
        flipX: false,
        flipY: false,
      },
      "reset",
      "fine",
      { base },
    );
    const plan = resolveMotion(spring.gentle, reduce);
    if (plan.kind !== "full") {
      x.value = target.x;
      y.value = target.y;
      scale.value = target.scale;
      rotation.value = target.rotation;
      return;
    }
    const config = toReanimatedSpring(plan.token);
    x.value = withSpring(target.x, config);
    y.value = withSpring(target.y, config);
    scale.value = withSpring(target.scale, config);
    rotation.value = withSpring(target.rotation, config);
  };

  const doubleTap = Gesture.Tap().numberOfTaps(2).runOnJS(true).onEnd(reset);

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, doubleTap);

  return { gesture, x, y, scale, rotation };
}
