import type { PreviewTile } from "@ar-darwin/core";
import { hairline, radius, splitter, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { StyleSheet, Text } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

type TileTagProps = {
  tile: PreviewTile;
  progress: SharedValue<number>;
  /** The preview's fade (reduced motion): the tags follow the canvas, not appear before it. */
  fade: SharedValue<number>;
  /** Zoom and pan of the preview: the tag follows its tile but keeps its own size. */
  scale: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  isCurrent: boolean;
  onPick: (id: string) => void;
};

const label = toNativeTextStyle(typography.value);

/**
 * The tile's name («A1») in a dark pill, legible on any photo (the camera's own colours, which are
 * measured against paper). It sits over the preview, not inside the canvas, so it is real text a
 * screen reader can reach: touches go to the preview's own gestures (`pointerEvents="none"`), and a
 * screen reader picks the tile with its «activate» action.
 */
export function TileTag({ tile, progress, scale, tx, ty, isCurrent, onPick, fade }: TileTagProps) {
  const { theme } = useTheme();
  const c = theme.color.camera;
  // Centre of the crop with the tiles joined; the offset adds the separation.
  const homeX = tile.rect.x + tile.rect.width / 2;
  const homeY = tile.rect.y + tile.rect.height / 2;

  // A tag wider than its tile would cover the drawing (10 columns): it hides, unless it is the
  // picked one, and shows again with zoom.
  const tagWidth =
    Math.max(splitter.tagHeight, tile.id.length * splitter.tagCharWidth) + 2 * splitter.tagPaddingX;

  const place = useAnimatedStyle(() => ({
    opacity: fade.value * (isCurrent || tile.rect.width * scale.value >= tagWidth ? 1 : 0),
    transform: [
      { translateX: tx.value + (homeX + tile.offset.x * progress.value) * scale.value },
      { translateY: ty.value + (homeY + tile.offset.y * progress.value) * scale.value },
      { translateX: "-50%" },
      { translateY: "-50%" },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole="radio"
      accessibilityLabel={t("splitter.pickTile", { id: tile.id })}
      accessibilityHint={t("splitter.pickTileHint")}
      accessibilityState={{ checked: isCurrent }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate") onPick(tile.id);
      }}
      style={[
        styles.pill,
        {
          backgroundColor: c.pill,
          borderColor: isCurrent ? c.accent : c.pillEdge,
          borderWidth: isCurrent ? splitter.currentWidth : hairline,
        },
        place,
      ]}
    >
      <Text style={[label, { color: c.text }]} importantForAccessibility="no">
        {tile.id}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    left: 0,
    top: 0,
    minWidth: splitter.tagHeight,
    height: splitter.tagHeight,
    paddingHorizontal: splitter.tagPaddingX,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
