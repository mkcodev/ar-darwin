import { type IconName, icon, icons } from "@ar-darwin/ui";
import { Group, Path, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";

type CameraIconProps = {
  name: IconName;
  size?: number;
  color: string;
  /** Top-left corner inside the parent Canvas. */
  x?: number;
  y?: number;
};

/**
 * packages/ui's stroke-only icon set (apps/desktop's `Icon` draws it as SVG) painted with Skia
 * instead, since the camera overlay is a Canvas, not the DOM. A Skia element, not a view: it must
 * be rendered inside a `<Canvas>`. Static only: no "trazo vivo" draw-in here, and filled dots
 * (e.g. `reset`) aren't handled — neither icon used on camera needs them yet.
 */
export function CameraIcon({ name, size = icon.size, color, x = 0, y = 0 }: CameraIconProps) {
  const path = useMemo(() => {
    const builder = Skia.PathBuilder.Make();
    for (const shape of icons[name]) {
      if (shape.type === "path") {
        const svgPath = Skia.Path.MakeFromSVGString(shape.d);
        if (svgPath) builder.addPath(svgPath);
      } else if (shape.type === "rect") {
        builder.addRRect({
          rect: Skia.XYWHRect(shape.x, shape.y, shape.width, shape.height),
          rx: shape.rx,
          ry: shape.rx,
        });
      } else {
        builder.addCircle(shape.cx, shape.cy, shape.r);
      }
    }
    return builder.detach();
  }, [name]);

  const scale = size / icon.grid;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
      <Path
        path={path}
        style="stroke"
        strokeWidth={icon.stroke}
        strokeCap="round"
        strokeJoin="round"
        color={color}
      />
    </Group>
  );
}
