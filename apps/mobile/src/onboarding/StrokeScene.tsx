import { staggeredProgress, staggeredTotalMs } from "@ar-darwin/core";
import { duration, easing, stagger } from "@ar-darwin/ui";
import { Canvas, Group, Path, Skia, type SkPath } from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import {
  Easing,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { animateFade, tweenPlan } from "../theme/motion";

export type Stroke = {
  /** SVG path data on the scene's grid. */
  d: string;
  color: string;
  /** Line width on the scene's grid. */
  width: number;
};

type StrokeSceneProps = {
  /** Side of the square grid the strokes are drawn on. */
  grid: number;
  /** Side in dp. */
  size: number;
  /** In drawing order: each starts `stagger` ms after the one before it. */
  strokes: readonly Stroke[];
  /** «Reduce motion», read outside the Canvas (Skia has its own renderer: no contexts inside). */
  reduce: boolean;
};

const [ex1, ey1, ex2, ey2] = easing.draw;
const drawEase = Easing.bezierFn(ex1, ey1, ex2, ey2);

function strokePath(d: string): SkPath | null {
  return Skia.Path.MakeFromSVGString(d);
}

/**
 * A small drawing that writes itself when it appears, «trazo vivo»: the strokes are trimmed one
 * after another with `easing.draw`. Reduced motion: it fades in; with none, it just appears.
 * The scene is decorative: the page that holds it carries the accessible name.
 */
export function StrokeScene({ grid, size, strokes, reduce }: StrokeSceneProps) {
  const paths = useMemo(() => strokes.map((stroke) => strokePath(stroke.d)), [strokes]);
  const plan = tweenPlan(duration.long, easing.draw, reduce);
  const strokeMs = plan.mode === "full" && plan.kind === "tween" ? plan.duration : 0;
  const totalMs = staggeredTotalMs(strokes.length, stagger, strokeMs);

  // Milliseconds since the drawing started; it starts at 0 so the first frame is not the finished
  // scene, and reduced motion starts from the end (it only fades).
  const elapsed = useSharedValue(plan.mode === "full" ? 0 : totalMs);
  const fade = useSharedValue(plan.mode === "fade" ? 0 : 1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draw once, when the page appears
  useEffect(() => {
    if (plan.mode === "full") {
      elapsed.value = withTiming(totalMs, { duration: totalMs, easing: Easing.linear });
    } else if (plan.mode === "fade") {
      fade.value = animateFade(1, plan, 0);
    }
  }, []);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: size / grid }]} opacity={fade}>
        {strokes.map((stroke, index) => {
          const path = paths[index];
          if (!path) return null;
          return (
            <SceneStroke
              key={stroke.d}
              path={path}
              stroke={stroke}
              index={index}
              elapsed={elapsed}
              strokeMs={strokeMs}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}

type SceneStrokeProps = {
  path: SkPath;
  stroke: Stroke;
  index: number;
  elapsed: SharedValue<number>;
  strokeMs: number;
};

function SceneStroke({ path, stroke, index, elapsed, strokeMs }: SceneStrokeProps) {
  const end = useDerivedValue(() =>
    drawEase(staggeredProgress(elapsed.value, index, stagger, strokeMs)),
  );
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={stroke.width}
      strokeCap="round"
      strokeJoin="round"
      color={stroke.color}
      end={end}
    />
  );
}
