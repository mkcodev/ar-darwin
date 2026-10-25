import { hairline, space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/** The longest side of the minimap. */
const SIDE = space[10] + space[1];
/** Space between cells, so a tile reads as its own sheet. */
const GAP = 2;
/** Cells this small are drawn square-cornered: a radius would round them into dots. */
const CELL_RADIUS = 2;

type TileMinimapProps = {
  rows: number;
  cols: number;
  /** Width over height of the picture: the minimap has the same shape. */
  aspect: number;
  /** The tile being traced, as «B2». */
  tileId: string;
};

/**
 * The grid of the split in miniature, with the tile being traced filled in the accent. Hidden from
 * the screen reader: the tile's label already says where the person is.
 */
export function TileMinimap({ rows, cols, aspect, tileId }: TileMinimapProps) {
  const { theme } = useTheme();
  const c = theme.color.camera;
  const width = aspect >= 1 ? SIDE : Math.round(SIDE * aspect);
  const height = aspect >= 1 ? Math.round(SIDE / aspect) : SIDE;
  const currentRow = tileId.charCodeAt(0) - "A".charCodeAt(0);
  const currentCol = Number(tileId.slice(1)) - 1;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, gap: GAP }}
    >
      {Array.from({ length: rows }, (_, row) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the grid is fixed; a cell is its position
        <View key={row} style={styles.row}>
          {Array.from({ length: cols }, (_, col) => {
            const current = row === currentRow && col === currentCol;
            return (
              <View
                // biome-ignore lint/suspicious/noArrayIndexKey: the grid is fixed; a cell is its position
                key={col}
                style={[
                  styles.cell,
                  current
                    ? { backgroundColor: c.accent, borderColor: c.accent }
                    : { borderColor: c.muted },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", gap: GAP },
  cell: { flex: 1, borderWidth: hairline, borderRadius: CELL_RADIUS },
});
