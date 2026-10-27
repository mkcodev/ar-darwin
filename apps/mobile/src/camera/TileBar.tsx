import { tileProgress } from "@ar-darwin/core";
import {
  cameraPill,
  fonts,
  opacity,
  radius,
  space,
  toNativeTextStyle,
  typography,
} from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { IconButton } from "../components/IconButton";
import { t } from "../i18n";
import { useHandedness } from "../theme/HandednessProvider";
import { useTheme } from "../theme/ThemeProvider";
import { TileMinimap } from "./TileMinimap";

const idText = toNativeTextStyle(typography.value);
const progressText = toNativeTextStyle(typography.label);
const CHEVRON_SIZE = 16;

type TileBarProps = {
  rows: number;
  cols: number;
  /** Width over height of the picture, for the minimap. */
  aspect: number;
  /** The tile being traced, as «B2». */
  tileId: string;
  /** The tiles marked as traced: they fill the minimap and make the «4/9». */
  completedIds: readonly string[];
  /** The tiles the two arrows go to. */
  previousId: string;
  nextId: string;
  onPrevious: () => void;
  onNext: () => void;
  /** The check was tapped: the current tile is marked as done, or the mark is removed. */
  onToggleDone: () => void;
  /** The minimap and the name were tapped: the picker opens. */
  onOpenPicker: () => void;
};

/**
 * Where the person is in a split project and how to move: a chip with the minimap (the tiles done
 * filled in), the tile's name over the «4/9» progress and a chevron (it opens the picker with the
 * whole grid), the check that marks the current tile as done, the arrow back to the previous tile
 * and «Siguiente», the main action, filled in the accent. Both arrows keep the zoom and the
 * opacity, and «Siguiente» only moves on: marking is its own tap. The controls sit under the free
 * hand, like the rest of the camera's; «Siguiente» is the one at the edge. The chip reads «Trozo B2
 * de 9. Hechos: 4» for the screen reader, and «Siguiente» is read in full («Siguiente trozo»): the
 * visible word is short so the four fit a 360 px phone.
 */
export function TileBar({
  rows,
  cols,
  aspect,
  tileId,
  completedIds,
  previousId,
  nextId,
  onPrevious,
  onNext,
  onToggleDone,
  onOpenPicker,
}: TileBarProps) {
  const { theme } = useTheme();
  const { controls } = useHandedness();
  const c = theme.color.camera;
  const progress = tileProgress({ rows, cols }, completedIds);
  const isDone = completedIds.includes(tileId);

  return (
    <View style={[styles.row, controls === "left" && styles.mirrored]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("camera.tileOfProgress", {
          id: tileId,
          count: rows * cols,
          done: progress.done,
        })}
        accessibilityHint={t("camera.tilePicker.open")}
        onPress={onOpenPicker}
        style={[styles.chip, { borderColor: c.pillEdge }]}
      >
        {({ pressed }) => (
          <>
            {pressed && (
              <View
                pointerEvents="none"
                style={[styles.pressFill, { backgroundColor: c.text, opacity: opacity.pressFill }]}
              />
            )}
            <TileMinimap
              rows={rows}
              cols={cols}
              aspect={aspect}
              tileId={tileId}
              completedIds={completedIds}
            />
            <View style={styles.name}>
              <Text style={[idText, styles.id, { color: c.text }]}>{tileId}</Text>
              <Text style={[progressText, { color: c.muted }]} numberOfLines={1}>
                {t("camera.tileProgress", { done: progress.done, total: progress.total })}
              </Text>
            </View>
            <View style={styles.chevron}>
              <Icon name="chevronUp" size={CHEVRON_SIZE} color={c.muted} />
            </View>
          </>
        )}
      </Pressable>
      <IconButton
        icon="check"
        tone="camera"
        pressed={isDone}
        label={t("camera.tileDone")}
        accessibilityHint={t("camera.tileDoneHint", { id: tileId })}
        onPress={onToggleDone}
      />
      <IconButton
        icon="nextTile"
        flipGlyph
        tone="camera"
        label={t("camera.prevTile")}
        accessibilityHint={t("camera.prevTileHint", { id: previousId })}
        onPress={onPrevious}
      />
      <Button
        variant="primary"
        tone="camera"
        icon="nextTile"
        compact
        accessibilityLabel={t("camera.nextTile")}
        accessibilityHint={t("camera.nextTileHint", { id: nextId })}
        onPress={onNext}
      >
        {t("camera.nextTileShort")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    paddingHorizontal: space[3],
  },
  mirrored: { flexDirection: "row-reverse" },
  chip: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: space[12],
    paddingHorizontal: space[1],
    borderWidth: cameraPill.edgeWidth,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  pressFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  name: { flexShrink: 1 },
  id: { fontFamily: fonts.value.native[500] },
  chevron: { marginRight: space[1] },
});
