import type { PreviewTile } from "@ar-darwin/core";
import { splitter } from "@ar-darwin/ui";
import {
  DashPathEffect,
  FilterMode,
  Group,
  Image,
  MipmapMode,
  Path,
  Rect,
  type SkImage,
  Skia,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";

/** Colours of the preview, read outside the Skia canvas (React context does not reach inside). */
export type SplitPreviewColors = {
  /** Extended zones: the app's blue, translucent. */
  tint: string;
  /** The original cut line. */
  cut: string;
  /** Under the cut line and the picked outline, so they read on any photo. */
  cutCase: string;
  /** Outline of the tile picked last. */
  current: string;
};

type SplitTileProps = {
  tile: PreviewTile;
  image: SkImage;
  /** Where the joined image is drawn, in frame px. */
  imageFrame: { x: number; y: number; width: number; height: number };
  /** 0 = joined, 1 = separated, per tile (staggered by the preview). */
  progress: SharedValue<number>;
  showTint: boolean;
  isCurrent: boolean;
  colors: SplitPreviewColors;
};

/** Anything below this many px is rounding, not an extension. */
const EPSILON = 0.01;

/**
 * One tile of the preview, inside the Skia canvas: the crop of the image, the blue tint on the
 * parts it took from its neighbours and, over their inner edge, the original cut line (dashed). It
 * moves to its separated place with `progress`.
 */
export function SplitTile({
  tile,
  image,
  imageFrame,
  progress,
  showTint,
  isCurrent,
  colors,
}: SplitTileProps) {
  const { rect, coreRect: core } = tile;

  const geometry = useMemo(() => {
    const left = core.x - rect.x > EPSILON;
    const right = rect.x + rect.width - (core.x + core.width) > EPSILON;
    const top = core.y - rect.y > EPSILON;
    const bottom = rect.y + rect.height - (core.y + core.height) > EPSILON;
    if (!(left || right || top || bottom)) return null;

    // The ring between the final crop and the flush one is the extended zone.
    const zones = Skia.PathBuilder.Make();
    zones.addRect(Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height));
    zones.addRect(Skia.XYWHRect(core.x, core.y, core.width, core.height));

    // The flush crop's sides that were extended: the line where the sheet used to end.
    const cuts = Skia.PathBuilder.Make();
    if (left) cuts.moveTo(core.x, core.y).lineTo(core.x, core.y + core.height);
    if (right) {
      cuts.moveTo(core.x + core.width, core.y).lineTo(core.x + core.width, core.y + core.height);
    }
    if (top) cuts.moveTo(core.x, core.y).lineTo(core.x + core.width, core.y);
    if (bottom) {
      cuts.moveTo(core.x, core.y + core.height).lineTo(core.x + core.width, core.y + core.height);
    }
    return { zones: zones.detach(), cuts: cuts.detach() };
  }, [rect, core]);

  const clip = useMemo(
    () => Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height),
    [rect.x, rect.y, rect.width, rect.height],
  );

  const place = useDerivedValue(() => [
    { translateX: tile.offset.x * progress.value },
    { translateY: tile.offset.y * progress.value },
  ]);

  const half = splitter.currentWidth / 2;
  return (
    <Group transform={place}>
      <Group clip={clip}>
        <Image
          image={image}
          x={imageFrame.x}
          y={imageFrame.y}
          width={imageFrame.width}
          height={imageFrame.height}
          fit="fill"
          // A 4096 px photo shown ~13× smaller: mipmaps keep it from shimmering while it moves.
          sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.Linear }}
        />
        {showTint && geometry && (
          <Path path={geometry.zones} fillType="evenOdd" color={colors.tint} />
        )}
      </Group>
      {geometry && (
        <>
          <Path
            path={geometry.cuts}
            style="stroke"
            strokeWidth={splitter.cutWidth + 2}
            color={colors.cutCase}
          >
            <DashPathEffect intervals={[...splitter.cutDash]} />
          </Path>
          <Path
            path={geometry.cuts}
            style="stroke"
            strokeWidth={splitter.cutWidth}
            color={colors.cut}
          >
            <DashPathEffect intervals={[...splitter.cutDash]} />
          </Path>
        </>
      )}
      {isCurrent && (
        <>
          {/* The accent never sits straight on a photo: a dark case under it, like the cut lines. */}
          <Rect
            x={rect.x + half}
            y={rect.y + half}
            width={rect.width - splitter.currentWidth}
            height={rect.height - splitter.currentWidth}
            style="stroke"
            strokeWidth={splitter.currentWidth + 2}
            color={colors.cutCase}
          />
          <Rect
            x={rect.x + half}
            y={rect.y + half}
            width={rect.width - splitter.currentWidth}
            height={rect.height - splitter.currentWidth}
            style="stroke"
            strokeWidth={splitter.currentWidth}
            color={colors.current}
          />
        </>
      )}
    </Group>
  );
}
