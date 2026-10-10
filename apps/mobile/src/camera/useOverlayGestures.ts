import {
  applyGesture,
  fitTransform,
  type GestureStep,
  nudge,
  radiansToDegrees,
  restoreTransform,
  rotationDeadZone,
  type Size,
  type Transform,
} from "@ar-darwin/core";
import { resolveMotion, spring, toReanimatedSpring } from "@ar-darwin/ui";
import { useCallback, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  type SharedValue,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/** A saved transform and the canvas its x/y are px of (`Project.transformViewport`). */
export type OverlayPlacement = { transform: Transform; viewport: Size };

type Options = {
  imageSize: SharedValue<Size>;
  canvasSize: SharedValue<Size>;
  /** Touch lock (#19): while true, every gesture below is a no-op and the image stays put. */
  locked: SharedValue<boolean>;
  /** Where the image was left last time; `null`/absent fits it with `fitTransform`. Read once. */
  initial?: OverlayPlacement | null;
  /**
   * Called on the JS thread when the transform settles: after the first placement, when the
   * canvas changes size, when a gesture ends and after a double-tap reset. Never per frame.
   */
  onSettle?: (placement: OverlayPlacement) => void;
};

const NO_STEP: GestureStep = {
  changeX: 0,
  changeY: 0,
  scaleChange: 1,
  rotationChange: 0,
  focalX: 0,
  focalY: 0,
};

/**
 * Drag, pinch and rotate the overlay image with two fingers at once, all on the UI thread.
 * Double tap resets to `fitTransform`. No magnet here yet: see the comment in the pinch and
 * rotation handlers for exactly where `snapTransform` will go.
 *
 * Placement: nothing is placed (`placed` stays false, so the caller hides the image) until both
 * the canvas and the image have real sizes. Then `initial` is restored onto this canvas with
 * `restoreTransform`, or the image is fitted. Later, a new canvas size (split screen, a foldable)
 * moves the current transform with `restoreTransform`, and a new image (the spike's test images)
 * is fitted again.
 *
 * Touch lock (#19): each handler bails out on `locked.value` before touching the transform, so a
 * finger already dragging when the lock engages stops dead instead of finishing its move.
 *
 * `translationX/Y`, `scale` and `rotation` from react-native-gesture-handler accumulate from
 * the start of each gesture's own activation, which does not line up across pan/pinch/rotation
 * running at once (pan keeps going while a second finger lands, pinch and rotation restart).
 * `onChange`'s `changeX/Y`, `scaleChange` and `rotationChange` are each already relative to the
 * previous frame instead, so every gesture folds its own contribution into the same x/y/scale/
 * rotation shared values independently, with no rebasing needed — see `applyGesture` (core).
 *
 * Everything the pan/pinch/rotation callbacks and the reaction call runs on the UI thread and
 * must be a worklet: only core's transform.ts functions (checked by its tests) and inline
 * math. The double tap is the exception: `runOnJS(true)`, so `reset` may call plain JS.
 */
export function useOverlayGestures({ imageSize, canvasSize, locked, initial, onSettle }: Options) {
  const reduce = useReducedMotion();

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const flipX = useSharedValue(initial?.transform.flipX ?? false);
  const flipY = useSharedValue(initial?.transform.flipY ?? false);
  /** False until the first placement: the image is not drawn before it has a real position. */
  const placed = useSharedValue(false);
  /** Read once, on the first placement. */
  const initialPlacement = useSharedValue<OverlayPlacement | null>(initial ?? null);
  /** Canvas and image the current transform was placed for. */
  const placedCanvas = useSharedValue<Size>({ width: 0, height: 0 });
  const placedImage = useSharedValue<Size>({ width: 0, height: 0 });
  /** Raw (un-dead-zoned) rotation accumulated since the current two-finger gesture began. */
  const rotationAccum = useSharedValue(0);

  // Stable JS-thread callback for the worklets, always calling the latest `onSettle`.
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;
  const settle = useCallback((placement: OverlayPlacement) => {
    onSettleRef.current?.(placement);
  }, []);

  const current = (): Transform => {
    "worklet";
    return {
      x: x.value,
      y: y.value,
      scale: scale.value,
      rotation: rotation.value,
      flipX: flipX.value,
      flipY: flipY.value,
    };
  };

  const write = (next: Transform) => {
    "worklet";
    x.value = next.x;
    y.value = next.y;
    scale.value = next.scale;
    rotation.value = next.rotation;
    flipX.value = next.flipX;
    flipY.value = next.flipY;
  };

  const emitSettle = () => {
    "worklet";
    const canvas = canvasSize.value;
    scheduleOnRN(settle, {
      transform: current(),
      viewport: { width: canvas.width, height: canvas.height },
    });
  };

  // The string key (not the size objects themselves) makes this fire only when a size actually
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
      if (image.width === 0 || canvas.width === 0 || canvas.height === 0) return;
      const lastCanvas = placedCanvas.value;
      const lastImage = placedImage.value;
      if (!placed.value) {
        const saved = initialPlacement.value;
        write(
          saved
            ? restoreTransform(saved.transform, saved.viewport, canvas)
            : fitTransform(image, canvas),
        );
        placed.value = true;
      } else if (image.width !== lastImage.width || image.height !== lastImage.height) {
        const fit = fitTransform(image, canvas);
        write({ ...fit, flipX: flipX.value, flipY: flipY.value });
      } else if (canvas.width !== lastCanvas.width || canvas.height !== lastCanvas.height) {
        write(restoreTransform(current(), lastCanvas, canvas));
      } else {
        return;
      }
      placedCanvas.value = { width: canvas.width, height: canvas.height };
      placedImage.value = { width: image.width, height: image.height };
      emitSettle();
    },
  );

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onChange((e) => {
      if (locked.value) return;
      const next = applyGesture(current(), { ...NO_STEP, changeX: e.changeX, changeY: e.changeY });
      x.value = next.x;
      y.value = next.y;
    })
    .onEnd(() => {
      if (!locked.value) emitSettle();
    });

  const pinch = Gesture.Pinch()
    .onChange((e) => {
      if (locked.value) return;
      // Magnet (next task): compute `snapTransform` on this result for display, and only write it
      // here (the stored base for next frame) once the gesture ends.
      const next = applyGesture(current(), {
        ...NO_STEP,
        scaleChange: e.scaleChange,
        focalX: e.focalX,
        focalY: e.focalY,
      });
      x.value = next.x;
      y.value = next.y;
      scale.value = next.scale;
    })
    .onEnd(() => {
      if (!locked.value) emitSettle();
    });

  const rotate = Gesture.Rotation()
    .onStart(() => {
      rotationAccum.value = 0;
    })
    .onChange((e) => {
      if (locked.value) return;
      const before = rotationDeadZone(rotationAccum.value);
      rotationAccum.value += radiansToDegrees(e.rotationChange);
      const after = rotationDeadZone(rotationAccum.value);
      // Magnet (next task): same note as pinch above.
      const next = applyGesture(current(), {
        ...NO_STEP,
        rotationChange: after - before,
        focalX: e.anchorX,
        focalY: e.anchorY,
      });
      x.value = next.x;
      y.value = next.y;
      rotation.value = next.rotation;
    })
    .onEnd(() => {
      if (!locked.value) emitSettle();
    });

  const reset = () => {
    if (locked.value || !placed.value) return;
    const base = fitTransform(imageSize.value, canvasSize.value);
    const target = nudge(current(), "reset", "fine", { base });
    const canvas = canvasSize.value;
    settle({ transform: target, viewport: { width: canvas.width, height: canvas.height } });
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

  return { gesture, x, y, scale, rotation, flipX, flipY, placed };
}
