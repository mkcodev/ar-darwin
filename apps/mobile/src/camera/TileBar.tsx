import { fonts, space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { useHandedness } from "../theme/HandednessProvider";
import { useTheme } from "../theme/ThemeProvider";
import { TileMinimap } from "./TileMinimap";

const idText = toNativeTextStyle(typography.value);

type TileBarProps = {
  rows: number;
  cols: number;
  /** Width over height of the picture, for the minimap. */
  aspect: number;
  /** The tile being traced, as «B2». */
  tileId: string;
  /** The tile «Siguiente trozo» goes to. */
  nextId: string;
  onNext: () => void;
};

/**
 * Where the person is in a split project: the minimap, the tile's name and the button that moves
 * on to the next tile keeping the zoom and the opacity. The button sits under the free hand, like
 * the rest of the camera's controls; the label reads «Trozo B2 de 4» for the screen reader.
 */
export function TileBar({ rows, cols, aspect, tileId, nextId, onNext }: TileBarProps) {
  const { theme } = useTheme();
  const { controls } = useHandedness();

  return (
    <View style={[styles.row, controls === "left" && styles.mirrored]}>
      <View
        accessible
        accessibilityLabel={t("camera.tileOf", { id: tileId, count: String(rows * cols) })}
        style={styles.where}
      >
        <TileMinimap rows={rows} cols={cols} aspect={aspect} tileId={tileId} />
        <Text style={[idText, styles.id, { color: theme.color.camera.text }]}>{tileId}</Text>
      </View>
      <Button
        variant="primary"
        tone="camera"
        icon="nextTile"
        onPress={onNext}
        accessibilityHint={t("camera.nextTileHint", { id: nextId })}
      >
        {t("camera.nextTile")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
    paddingHorizontal: space[3],
  },
  mirrored: { flexDirection: "row-reverse" },
  where: { flexDirection: "row", alignItems: "center", gap: space[3] },
  id: { fontFamily: fonts.value.native[500] },
});
