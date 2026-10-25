import { type MagnetLock, restoreTransform, type Size, type Transform } from "@ar-darwin/core";
import { cameraColors, magnetGuide, signature, spring } from "@ar-darwin/ui";
import { DashPathEffect, Group, Path, Skia, type SkPath } from "@shopify/react-native-skia";
import { useMemo } from "react";
import {
  type DerivedValue,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { animateFade, animateMove, type MotionPlan, springPlan } from "../theme/motion";
import type { OverlayPlacement } from "./useOverlayGestures";

type MagnetGuidesProps = {
  /** What is held; all false when nothing is, so nothing is drawn. */
  lock: DerivedValue<MagnetLock>;
  /** The transform being painted: the rotation guide runs through its center. */
  shown: DerivedValue<Transform>;
  canvasSize: SharedValue<Size>;
  imageSize: SharedValue<Size>;
  pin: SharedValue<OverlayPlacement | null>;
  /** «Reduce motion», read outside the Skia canvas: React context does not reach inside it. */
  reduce: boolean;
};

/**
 * The magnet's guides, inside the camera's Skia canvas, over the image: a vertical and a horizontal
 * line for the canvas axes, a line along the image's own axis for the grabbed right angle, and a
 * dashed outline with a cross for the pinned position. Each is drawn only while its flag in `lock`
 * is on (double stroke: the dark case under the blue core, with measuring ticks). A guide enters
 * with the `snappy` spring (a small overshoot of the stroke) and leaves in
 * `signature.guideFadeOutMs`; with «reduce motion» it only fades, in 120 ms. Everything runs on the
 * UI thread: the shared values drive the paths and strokes, React renders it once.
 */
export function MagnetGuides({
  lock,
  shown,
  canvasSize,
  imageSize,
  pin,
  reduce,
}: MagnetGuidesProps) {
  const plan = useMemo(() => springPlan(spring.snappy, reduce), [reduce]);

  const axisX = useGuideProgress(
    useDerivedValue(() => lock.value.axisX),
    plan,
  );
  const axisY = useGuideProgress(
    useDerivedValue(() => lock.value.axisY),
    plan,
  );
  const rotation = useGuideProgress(
    useDerivedValue(() => lock.value.rotation),
    plan,
  );
  const pinned = useGuideProgress(
    useDerivedValue(() => lock.value.pin),
    plan,
  );

  const verticalPath = useDerivedValue(() => {
    const { width, height } = canvasSize.value;
    return linePath(width / 2, 0, width / 2, height, height / 2);
  });
  const horizontalPath = useDerivedValue(() => {
    const { width, height } = canvasSize.value;
    return linePath(0, height / 2, width, height / 2, width / 2);
  });
  const rotationPath = useDerivedValue(() => {
    const { width, height } = canvasSize.value;
    const t = shown.value;
    const reach = Math.hypot(width, height);
    const radians = (t.rotation * Math.PI) / 180;
    const dx = Math.cos(radians) * reach;
    const dy = Math.sin(radians) * reach;
    return linePath(t.x - dx, t.y - dy, t.x + dx, t.y + dy, reach);
  });
  const pinPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const placed = pin.value;
    const image = imageSize.value;
    if (placed === null || image.width === 0) return p;
    const t = restoreTransform(placed.transform, placed.viewport, canvasSize.value);
    const radians = (t.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const halfW = (image.width * t.scale) / 2;
    const halfH = (image.height * t.scale) / 2;
    const corners = [-1, 1, 1, -1].map((sx, i) => {
      const cx = sx * halfW;
      const cy = (i < 2 ? -1 : 1) * halfH;
      return { x: t.x + cx * cos - cy * sin, y: t.y + cx * sin + cy * cos };
    });
    p.moveTo(corners[0]?.x ?? 0, corners[0]?.y ?? 0);
    for (let i = 1; i < 4; i++) p.lineTo(corners[i]?.x ?? 0, corners[i]?.y ?? 0);
    p.close();
    const arm = magnetGuide.pinCross;
    p.moveTo(t.x - arm, t.y);
    p.lineTo(t.x + arm, t.y);
    p.moveTo(t.x, t.y - arm);
    p.lineTo(t.x, t.y + arm);
    return p;
  });

  return (
    <Group>
      <Guide path={verticalPath} progress={axisX} />
      <Guide path={horizontalPath} progress={axisY} />
      <Guide path={rotationPath} progress={rotation} />
      <Guide path={pinPath} progress={pinned} dashed />
    </Group>
  );
}

type GuideProps = {
  path: DerivedValue<SkPath>;
  progress: SharedValue<number>;
  dashed?: boolean;
};

/** One guide: the case stroke under the core stroke, both scaled and faded by `progress`. */
function Guide({ path, progress, dashed = false }: GuideProps) {
  const opacity = useDerivedValue(() => Math.min(1, Math.max(0, progress.value)));
  const caseWidth = useDerivedValue(() => magnetGuide.caseWidth * Math.max(0, progress.value));
  const coreWidth = useDerivedValue(() => magnetGuide.coreWidth * Math.max(0, progress.value));
  return (
    <Group opacity={opacity}>
      <Path
        path={path}
        style="stroke"
        strokeWidth={caseWidth}
        strokeCap="round"
        color={cameraColors.guideCase}
      >
        {dashed && <DashPathEffect intervals={[...magnetGuide.pinDash]} />}
      </Path>
      <Path
        path={path}
        style="stroke"
        strokeWidth={coreWidth}
        strokeCap="round"
        color={cameraColors.guide}
      >
        {dashed && <DashPathEffect intervals={[...magnetGuide.pinDash]} />}
      </Path>
    </Group>
  );
}

/**
 * 0 while `active` is false, 1 once it is on. Rising uses the plan's spring (it overshoots a
 * little, the «bounce»); falling fades in `signature.guideFadeOutMs`. Reduced motion: the plan is a
 * fade, so both directions are a plain fade.
 */
function useGuideProgress(active: DerivedValue<boolean>, plan: MotionPlan): SharedValue<number> {
  const progress = useSharedValue(0);
  useAnimatedReaction(
    () => active.value,
    (on, was) => {
      if (on === was) return;
      progress.value = on
        ? plan.mode === "full"
          ? animateMove(1, plan)
          : animateFade(1, plan, signature.guideFadeOutMs)
        : animateFade(0, plan, signature.guideFadeOutMs);
    },
    [plan],
  );
  return progress;
}

/**
 * A line from (x1, y1) to (x2, y2) with measuring ticks every `magnetGuide.tickSpacing` px counted
 * from `origin` px along it (the middle of a canvas axis; the image's center for the rotation
 * guide), every `majorEvery`-th one longer.
 */
function linePath(x1: number, y1: number, x2: number, y2: number, origin: number): SkPath {
  "worklet";
  const p = Skia.Path.Make();
  p.moveTo(x1, y1);
  p.lineTo(x2, y2);
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length === 0) return p;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const first = -Math.floor(origin / magnetGuide.tickSpacing);
  const last = Math.floor((length - origin) / magnetGuide.tickSpacing);
  for (let i = first; i <= last; i++) {
    if (i === 0) continue;
    const along = origin + i * magnetGuide.tickSpacing;
    const half =
      (i % magnetGuide.majorEvery === 0 ? magnetGuide.tickMajor : magnetGuide.tickMinor) / 2;
    const cx = x1 + ux * along;
    const cy = y1 + uy * along;
    p.moveTo(cx - uy * half, cy + ux * half);
    p.lineTo(cx + uy * half, cy - ux * half);
  }
  return p;
}
