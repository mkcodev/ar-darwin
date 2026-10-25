import {
  isPreviewZoomed,
  panPreview,
  previewContentPoint,
  type Size,
  zoomPreviewAt,
} from "@ar-darwin/core";
import { spring } from "@ar-darwin/ui";
import { useState } from "react";
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
 * (scale, translation) so nothing re-renders per frame.
 */
export function useSplitPreviewGestures({ frame, maxZoom, onTapContent }: Options) {
  const { reduce } = useReduceMotion();
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const pinchStart = useSharedValue(1);
  const [zoomed, setZoomed] = useState(false);

  // Only a change of "zoomed or not" reaches React, never a frame of the pinch.
  useAnimatedReaction(
    () => isPreviewZoomed({ scale: scale.value, tx: tx.value, ty: ty.value }),
    (now, was) => {
      if (now !== was) scheduleOnRN(setZoomed, now);
    },
  );

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      pinchStart.value = scale.value;
    })
    .onUpdate((e) => {
      const next = zoomPreviewAt(
        { scale: scale.value, tx: tx.value, ty: ty.value },
        pinchStart.value * e.scale,
        e.focalX,
        e.focalY,
        frame.width,
        frame.height,
        maxZoom,
      );
      scale.value = next.scale;
      tx.value = next.tx;
      ty.value = next.ty;
    });

  const pan = Gesture.Pan()
    .maxPointers(2)
    .onChange((e) => {
      const next = panPreview(
        { scale: scale.value, tx: tx.value, ty: ty.value },
        e.changeX,
        e.changeY,
        frame.width,
        frame.height,
      );
      tx.value = next.tx;
      ty.value = next.ty;
    });

  const tap = Gesture.Tap().onEnd((e, success) => {
    if (!success) return;
    const point = previewContentPoint({ scale: scale.value, tx: tx.value, ty: ty.value }, e.x, e.y);
    scheduleOnRN(onTapContent, point.x, point.y);
  });

  const gesture = Gesture.Race(Gesture.Simultaneous(pinch, pan), tap);

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
