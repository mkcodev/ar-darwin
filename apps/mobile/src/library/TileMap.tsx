import { type SplitConfig, type TileMapCell, tileMapCells } from "@ar-darwin/core";
import { library, radius } from "@ar-darwin/ui";
import { Canvas, Group, Path, RoundedRect, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { View } from "react-native";

type TileMapProps = {
  split: Pick<SplitConfig, "rows" | "cols">;
  currentTileId?: string;
  completedTileIds: readonly string[];
  /**
   * Passed in, not read from the theme inside: React context does not cross into a Skia
   * `<Canvas>` (its reconciler is separate).
   */
  colors: {
    guide: string;
    doneFill: string;
    current: string;
    check: string;
    /** The check of a current tile that is already done, on the accent fill. */
    checkOnCurrent: string;
  };
};

/** A check in the 24 icon grid, scaled into a done cell. */
const CHECK = "M5 12.5l4.5 4.5L19 7";

/**
 * The split of the «keep tracing» card, drawn small: the cells in the non-photo blue (the ink of
 * guides and cuts), the tiles done tinted with a fine check, and the tile the camera opens on
 * filled with the accent (with its check too when it is already done, so «2/6» shows two
 * checks). Its longer side is `library.tileMapSide`. Decorative for the screen reader: the card
 * reads «Tile B2, 4/9 tiles».
 */
export function TileMap({ split, currentTileId, completedTileIds, colors }: TileMapProps) {
  const cell = library.tileMapSide / Math.max(split.rows, split.cols);
  const width = cell * split.cols;
  const height = cell * split.rows;
  const inset = library.tileMapInset;
  const cells = useMemo(
    () => tileMapCells({ split, currentTileId, completedTileIds: [...completedTileIds] }),
    [split, currentTileId, completedTileIds],
  );
  const check = useMemo(() => Skia.Path.MakeFromSVGString(CHECK), []);
  const corner = Math.min(radius.sm / 2, cell / 6);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height }}
    >
      <Canvas style={{ width, height }}>
        {cells.map((c: TileMapCell) => {
          const x = c.col * cell + inset;
          const y = c.row * cell + inset;
          const side = cell - inset * 2;
          const box = { x, y, width: side, height: side, r: corner };
          const current = c.state === "current";
          return (
            <Group key={c.id}>
              {current ? (
                <RoundedRect {...box} color={colors.current} />
              ) : (
                <>
                  {c.done && <RoundedRect {...box} color={colors.doneFill} />}
                  <RoundedRect
                    {...box}
                    color={colors.guide}
                    style="stroke"
                    strokeWidth={library.tileMapStroke}
                  />
                </>
              )}
              {c.done && check !== null && side >= 8 && (
                <Group
                  transform={[
                    { translateX: x + side * 0.2 },
                    { translateY: y + side * 0.2 },
                    { scale: (side * 0.6) / 24 },
                  ]}
                >
                  <Path
                    path={check}
                    style="stroke"
                    strokeWidth={(library.tileMapStroke * 1.5 * 24) / (side * 0.6)}
                    strokeCap="round"
                    strokeJoin="round"
                    color={current ? colors.checkOnCurrent : colors.check}
                  />
                </Group>
              )}
            </Group>
          );
        })}
      </Canvas>
    </View>
  );
}
