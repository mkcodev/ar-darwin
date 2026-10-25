import {
  applyGesture,
  fitTransform,
  type GestureStep,
  holdDistance,
  NUDGE_HOLD,
  type NudgeDirection,
  nudge,
  nudgeMove,
  radiansToDegrees,
  restoreTransform,
  rotationDeadZone,
  type Size,
  type Transform,
} from "@ar-darwin/core";
import { resolveMotion, spring, toReanimatedSpring, touchTarget } from "@ar-darwin/ui";
import { useCallback, useEffect, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  type SharedValue,
  useAnimatedReaction,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { playHaptic } from "../theme/playHaptic";

/** A saved transform and the canvas its x/y are px of (`Project.transformViewport`). */
export type OverlayPlacement = { transform: Transform; viewport: Size };

export type FlipAxis = "x" | "y";
export type Flips = Pick<Transform, "flipX" | "flipY">;

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
  /** A fine-adjust arrow was pressed while locked: the screen explains the lock. JS thread. */
  onNudgeBlocked?: () => void;
  /** The position pinned as home: the reset button goes back to it. Read once. */
  pin?: OverlayPlacement | null;
  /** The current position was pinned (JS thread). */
  onPinChange?: (placement: OverlayPlacement) => void;
};

/** The finger may drift this far from an arrow before the hold ends: the hold is not a drag. */
const NUDGE_MAX_DRIFT = touchTarget * 2;

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
 *
 * `toggleFlip` (the mirror buttons, JS thread) flips one axis in place: the matrix mirrors around
 * the image's center, so nothing moves. Like the gestures, it does nothing while locked or before
 * the first placement (returns `null`); otherwise it settles and returns the new flips.
 *
 * Fine adjust (`nudgeGestures`, the pad's arrows): a press moves the image 1 px at once, and
 * holding repeats with acceleration (`holdDistance`, core). Begin, release and every repeated
 * step run on the UI thread — a `useFrameCallback` that only runs while an arrow is down — so a
 * busy JS thread can neither delay the release (the image would overshoot at speed) nor stutter
 * the repetition. Only the haptics and starting/stopping the frame callback cross to JS, once
 * per press. The transform is settled (saved) once, on release. Arrows move along screen axes
 * and keep the image's center inside the canvas.
 */
export function useOverlayGestures({
  imageSize,
  canvasSize,
  locked,
  initial,
  onSettle,
  onNudgeBlocked,
  pin,
  onPinChange,
}: Options) {
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

  const onNudgeBlockedRef = useRef(onNudgeBlocked);
  onNudgeBlockedRef.current = onNudgeBlocked;
  const nudgeBlocked = useCallback(() => {
    onNudgeBlockedRef.current?.();
  }, []);
  /** Read once, like `initialPlacement`: where the reset goes back to when nothing is pinned. */
  const openingRef = useRef(initial ?? null);
  /** The pinned position: the reset's first choice. Replaced by `pinHere`. */
  const pinRef = useRef(pin ?? null);
  const onPinChangeRef = useRef(onPinChange);
  onPinChangeRef.current = onPinChange;

  /** Arrow held down on the pad, or null. Only the UI thread writes it while a hold runs. */
  const nudgeHeld = useSharedValue<NudgeDirection | null>(null);
  /** Timestamp of the hold's first frame; -1 until that frame arrives. */
  const nudgeStartMs = useSharedValue(-1);
  /** `holdDistance` that earlier frames of this hold already applied. */
  const nudgeApplied = useSharedValue(0);
  /** The hold reached the canvas edge: nothing more is written until it is released. */
  const nudgeAtLimit = useSharedValue(false);

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

  // Repetition of a held arrow. Only active while one is down (started and stopped from JS, once
  // per press): until the stop lands `nudgeHeld` is already null, so late frames write nothing.
  const frame = useFrameCallback((info) => {
    const dir = nudgeHeld.value;
    if (dir === null || nudgeAtLimit.value) return;
    if (locked.value) {
      // The lock engaged under the finger: stop dead, like the drag gestures do.
      nudgeHeld.value = null;
      emitSettle();
      return;
    }
    if (nudgeStartMs.value < 0) {
      nudgeStartMs.value = info.timestamp;
      return;
    }
    const total = holdDistance(info.timestamp - nudgeStartMs.value);
    const step = total - nudgeApplied.value;
    if (step <= 0) return;
    nudgeApplied.value = total;
    const moved = nudgeMove(current(), dir, step, canvasSize.value);
    x.value = moved.transform.x;
    y.value = moved.transform.y;
    if (moved.hitLimit) {
      nudgeAtLimit.value = true;
      scheduleOnRN(playHaptic, "limitReached");
    }
  }, false);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const setFrameActive = useCallback((active: boolean) => {
    frameRef.current.setActive(active);
  }, []);

  // Nothing keeps running when the camera screen goes away mid-hold.
  useEffect(
    () => () => {
      nudgeHeld.value = null;
    },
    [nudgeHeld],
  );

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

  /** Springs (or jumps, with reduced motion) to `base`, keeping the mirror, and settles once. */
  const resetTo = (base: Transform) => {
    if (locked.value || !placed.value) return;
    // A hold in progress must not fight the spring.
    nudgeHeld.value = null;
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

  const reset = () => {
    if (!placed.value) return;
    resetTo(fitTransform(imageSize.value, canvasSize.value));
  };

  /**
   * Back to the pinned position; with no pin, to where the image was when the camera opened; with
   * neither (a project that was never placed), fitted. The mirror stays as it is.
   */
  const resetToHome = () => {
    if (!placed.value) return;
    const canvas = canvasSize.value;
    const home = pinRef.current ?? openingRef.current;
    resetTo(
      home
        ? restoreTransform(home.transform, home.viewport, canvas)
        : fitTransform(imageSize.value, canvas),
    );
  };

  /** Pins the current position (x, y, scale, rotation) as home. False if nothing was pinned. */
  const pinHere = (): boolean => {
    if (locked.value || !placed.value) return false;
    const canvas = canvasSize.value;
    const placement = {
      transform: current(),
      viewport: { width: canvas.width, height: canvas.height },
    };
    pinRef.current = placement;
    onPinChangeRef.current?.(placement);
    playHaptic("pinSet");
    return true;
  };

  const doubleTap = Gesture.Tap().numberOfTaps(2).runOnJS(true).onEnd(reset);

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, doubleTap);

  const nudgeGesture = (dir: NudgeDirection) =>
    Gesture.LongPress()
      .minDuration(0)
      .maxDistance(NUDGE_MAX_DRIFT)
      .shouldCancelWhenOutside(false)
      .onBegin(() => {
        if (locked.value) {
          scheduleOnRN(nudgeBlocked);
          return;
        }
        if (!placed.value) return;
        nudgeHeld.value = dir;
        nudgeStartMs.value = -1;
        nudgeApplied.value = 0;
        // The tap step lands now, not on the next frame.
        const moved = nudgeMove(current(), dir, NUDGE_HOLD.tapPx, canvasSize.value);
        x.value = moved.transform.x;
        y.value = moved.transform.y;
        nudgeAtLimit.value = moved.hitLimit;
        scheduleOnRN(playHaptic, moved.hitLimit ? "limitReached" : "nudgeStep");
        scheduleOnRN(setFrameActive, true);
      })
      .onFinalize(() => {
        const held = nudgeHeld.value;
        // Another arrow may have taken over the hold: only the one that owns it ends it.
        if (held !== null && held !== dir) return;
        // `held` is null when something else already ended the hold (the lock engaged, a reset):
        // the frame callback still has to be switched off, but there is nothing to settle.
        if (held !== null) {
          nudgeHeld.value = null;
          emitSettle();
        }
        scheduleOnRN(setFrameActive, false);
      });

  const nudgeGestures: Record<NudgeDirection, ReturnType<typeof nudgeGesture>> = {
    up: nudgeGesture("up"),
    down: nudgeGesture("down"),
    left: nudgeGesture("left"),
    right: nudgeGesture("right"),
  };

  /** One 1 px step without a touch (the screen reader's "activate"), settled at once. */
  const nudgeTap = (dir: NudgeDirection) => {
    if (locked.value) {
      nudgeBlocked();
      return;
    }
    if (!placed.value) return;
    const canvas = canvasSize.value;
    const moved = nudgeMove(current(), dir, NUDGE_HOLD.tapPx, canvas);
    x.value = moved.transform.x;
    y.value = moved.transform.y;
    playHaptic(moved.hitLimit ? "limitReached" : "nudgeStep");
    settle({
      transform: moved.transform,
      viewport: { width: canvas.width, height: canvas.height },
    });
  };

  /** Ends a hold from outside (focus lost, app in the background): keeps what already moved. */
  const nudgeStop = () => {
    if (nudgeHeld.value === null) return;
    nudgeHeld.value = null;
    frameRef.current.setActive(false);
    const canvas = canvasSize.value;
    settle({ transform: current(), viewport: { width: canvas.width, height: canvas.height } });
  };

  const toggleFlip = (axis: FlipAxis): Flips | null => {
    if (locked.value || !placed.value) return null;
    // Built from the value read before writing: don't read a shared value back right after
    // setting it from JS.
    const before = current();
    const transform =
      axis === "x" ? { ...before, flipX: !before.flipX } : { ...before, flipY: !before.flipY };
    flipX.value = transform.flipX;
    flipY.value = transform.flipY;
    const canvas = canvasSize.value;
    settle({ transform, viewport: { width: canvas.width, height: canvas.height } });
    return { flipX: transform.flipX, flipY: transform.flipY };
  };

  return {
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
    resetToHome,
    pinHere,
  };
}
