import {
  isPreviewZoomed,
  panPreview,
  pinchPreview,
  previewContentPoint,
  type Size,
} from "@ar-darwin/core";
import { spring } from "@ar-darwin/ui";
import { useCallback, useMemo, useRef, useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";

type Options = {
  frame: Size;
  maxZoom: number;
  /** A tap at this point of the content (zoom and pan undone), on the JS thread. */
  onTapContent: (x: number, y: number) => void;
};

/**
 * Pinch and drag to look closer at the splitter's preview, and a tap that finds the tile under the
 * finger with or without zoom. The zoom stays where it was left (no double tap): `reset` brings it
 * back, and `zoomed` says when there is something to bring back. The view lives in shared values
 * (scale, translation) so nothing re-renders per frame. The gesture is built once per frame size:
 * `zoomed` flipping mid-pinch re-renders the screen, and a gesture swapped under the fingers would
 * drop the pinch.
 *
 * One finger drags; two fingers belong to the pinch alone, which also carries their drift: the
 * content point that was under their centre when they landed follows them.
 */
export function useSplitPreviewGestures({ frame, maxZoom, onTapContent }: Options) {
  const { reduce } = useReduceMotion();
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const pinchStart = useSharedValue({ scale: 1, tx: 0, ty: 0, focusX: 0, focusY: 0 });
  const [zoomed, setZoomed] = useState(false);

  // The tap handler changes every render; the worklet gets a stable function that calls the latest.
  const latestTap = useRef(onTapContent);
  latestTap.current = onTapContent;
  const tapContent = useCallback((x: number, y: number) => latestTap.current(x, y), []);

  // Only a change of "zoomed or not" reaches React, never a frame of the pinch.
  useAnimatedReaction(
    () => isPreviewZoomed({ scale: scale.value, tx: tx.value, ty: ty.value }),
    (now, was) => {
      if (now !== was) scheduleOnRN(setZoomed, now);
    },
  );

  const { width, height } = frame;
  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onBegin((e) => {
        pinchStart.value = {
          scale: scale.value,
          tx: tx.value,
          ty: ty.value,
          focusX: e.focalX,
          focusY: e.focalY,
        };
      })
      .onUpdate((e) => {
        const start = pinchStart.value;
        const next = pinchPreview(
          start,
          start.focusX,
          start.focusY,
          e.scale,
          e.focalX,
          e.focalY,
          width,
          height,
          maxZoom,
        );
        scale.value = next.scale;
        tx.value = next.tx;
        ty.value = next.ty;
      });

    const pan = Gesture.Pan()
      .maxPointers(1)
      .onChange((e) => {
        const next = panPreview(
          { scale: scale.value, tx: tx.value, ty: ty.value },
          e.changeX,
          e.changeY,
          width,
          height,
        );
        tx.value = next.tx;
        ty.value = next.ty;
      });

    const tap = Gesture.Tap().onEnd((e, success) => {
      if (!success) return;
      const point = previewContentPoint(
        { scale: scale.value, tx: tx.value, ty: ty.value },
        e.x,
        e.y,
      );
      scheduleOnRN(tapContent, point.x, point.y);
    });

    return Gesture.Race(Gesture.Simultaneous(pinch, pan), tap);
  }, [width, height, maxZoom, scale, tx, ty, pinchStart, tapContent]);

  const plan = springPlan(spring.gentle, reduce);
  /** Back to no zoom: with the spring, or at once under «reduce motion». */
  const reset = (animated: boolean) => {
    const move = (target: number) => (animated ? animateMove(target, plan) : target);
    scale.value = move(1);
    tx.value = move(0);
    ty.value = move(0);
  };

  return { gesture, scale, tx, ty, zoomed, reset };
}
