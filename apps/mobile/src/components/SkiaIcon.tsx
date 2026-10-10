import { staggeredProgress, staggeredTotalMs } from "@ar-darwin/core";
import { duration, easing, type IconName, type IconShape, icon, icons } from "@ar-darwin/ui";
import { Circle, DashPathEffect, Group, Path, Skia, type SkPath } from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import {
  Easing,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { animateFade, tweenPlan } from "../theme/motion";

type SkiaIconProps = {
  name: IconName;
  size?: number;
  color: string;
  /** Top-left corner inside the parent Canvas. */
  x?: number;
  y?: number;
  /**
   * «Trazo vivo»: every change of this number redraws the strokes like a pencil, one after
   * another (`icon.drawStaggerMs`). 0 shows the icon at rest.
   */
  drawKey?: number;
  /**
   * «Reduce motion», read outside the Canvas by whoever opens it (`useReduceMotion`): Skia has
   * its own React renderer and contexts do not cross into it.
   */
  reduce: boolean;
};

const [ex1, ey1, ex2, ey2] = easing.draw;
const drawEase = Easing.bezierFn(ex1, ey1, ex2, ey2);

function shapePath(shape: IconShape): SkPath | null {
  const builder = Skia.PathBuilder.Make();
  if (shape.type === "path") {
    const svgPath = Skia.Path.MakeFromSVGString(shape.d);
    if (!svgPath) return null;
    builder.addPath(svgPath);
  } else if (shape.type === "rect") {
    builder.addRRect({
      rect: Skia.XYWHRect(shape.x, shape.y, shape.width, shape.height),
      rx: shape.rx,
      ry: shape.rx,
    });
  } else {
    builder.addCircle(shape.cx, shape.cy, shape.r);
  }
  return builder.detach();
}

/**
 * packages/ui's stroke-only icon set (apps/desktop's `Icon` draws it as SVG) painted with Skia.
 * A Skia element, not a view: it must be rendered inside a `<Canvas>` (use `Icon` for a
 * standalone one). Each stroke is its own `Path` so «trazo vivo» can trim them one by one with
 * `end`, eased with `easing.draw` over `duration.long`. Dashed axes and filled dots never draw
 * themselves (as on the web). Reduced motion: the whole icon fades in; none: it just appears.
 */
export function SkiaIcon({
  name,
  size = icon.size,
  color,
  x = 0,
  y = 0,
  drawKey = 0,
  reduce,
}: SkiaIconProps) {
  const shapes = icons[name] as readonly IconShape[];
  const paths = useMemo(() => shapes.map(shapePath), [shapes]);
  const plan = tweenPlan(duration.long, easing.draw, reduce);
  const strokeMs = plan.mode === "full" && plan.kind === "tween" ? plan.duration : 0;
  const totalMs = staggeredTotalMs(shapes.length, icon.drawStaggerMs, strokeMs);

  // Milliseconds since the redraw started; parked at the end so the icon rests fully drawn.
  const elapsed = useSharedValue(totalMs);
  const opacity = useSharedValue(1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: redraw only when drawKey changes
  useEffect(() => {
    if (drawKey === 0) return;
    if (plan.mode === "full") {
      elapsed.value = 0;
      elapsed.value = withTiming(totalMs, { duration: totalMs, easing: Easing.linear });
    } else if (plan.mode === "fade") {
      opacity.value = 0;
      opacity.value = animateFade(1, plan, 0);
    }
  }, [drawKey]);

  const scale = size / icon.grid;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }]} opacity={opacity}>
      {shapes.map((shape, i) => {
        const path = paths[i];
        const key = `${name}-${i}`;
        if (shape.type === "circle" && shape.filled) {
          return <Circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} color={color} />;
        }
        if (!path) return null;
        if (shape.type === "path" && shape.dashed) {
          return (
            <Path key={key} path={path} {...strokeProps} color={color}>
              <DashPathEffect intervals={[...icon.dash]} />
            </Path>
          );
        }
        return (
          <IconStroke
            key={key}
            path={path}
            color={color}
            index={i}
            elapsed={elapsed}
            strokeMs={strokeMs}
          />
        );
      })}
    </Group>
  );
}

const strokeProps = {
  style: "stroke",
  strokeWidth: icon.stroke,
  strokeCap: "round",
  strokeJoin: "round",
} as const;

type IconStrokeProps = {
  path: SkPath;
  color: string;
  index: number;
  elapsed: SharedValue<number>;
  strokeMs: number;
};

/** One stroke, trimmed by its own share of the staggered redraw. */
function IconStroke({ path, color, index, elapsed, strokeMs }: IconStrokeProps) {
  const end = useDerivedValue(() =>
    drawEase(staggeredProgress(elapsed.value, index, icon.drawStaggerMs, strokeMs)),
  );
  return <Path path={path} {...strokeProps} color={color} end={end} />;
}
