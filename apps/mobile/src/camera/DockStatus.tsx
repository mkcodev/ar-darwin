import { type DockModel, nextTileId } from "@ar-darwin/core";
import { cameraDock, fonts, space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Icon } from "../components/Icon";
import { t } from "../i18n";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { TileMinimap } from "./TileMinimap";

const idText = toNativeTextStyle(typography.value);
const countText = toNativeTextStyle(typography.label);
const CHEVRON_SIZE = 16;
/** How long a new name or count takes to roll in. */
const ROLL_MS = 150;

type DockStatusProps = {
  model: DockModel;
  rows: number;
  cols: number;
  /** Width over height of the picture, for the minimap. */
  aspect: number;
  /** The tiles marked as done: they fill the minimap. */
  completedIds: readonly string[];
  /** The zone was tapped: the tile picker opens. */
  onOpen: () => void;
  /** The screen reader's «increment» / «decrement»: the next or the previous tile, in reading order. */
  onGoTo: (id: string) => void;
};

/**
 * Where the person is in a split project: the grid in miniature (the tiles done in solid paper, the
 * one being traced in the accent), its name over the «4/9» count, and a chevron, in a well of the
 * dock. Tapping it opens the tile picker. When the tile or the count changes the new text rolls in
 * from above (nothing with reduced motion). For the screen reader it reads «Trozo B2 de 9. Hechos:
 * 4» and offers `increment` and `decrement` to step through the tiles without a gesture.
 */
export function DockStatus({
  model,
  rows,
  cols,
  aspect,
  completedIds,
  onOpen,
  onGoTo,
}: DockStatusProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color.camera;
  const roll = reduce ? undefined : FadeInDown.duration(ROLL_MS);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("camera.tileOfProgress", {
        id: model.tileId,
        count: model.total,
        done: model.done,
      })}
      accessibilityHint={t("camera.tilePicker.open")}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        if (action === "increment") onGoTo(nextTileId({ rows, cols }, model.tileId));
        else if (action === "decrement") onGoTo(model.previousId);
      }}
      onPress={onOpen}
      style={({ pressed }) => [styles.zone, { backgroundColor: pressed ? c.wellPressed : c.well }]}
    >
      <TileMinimap
        rows={rows}
        cols={cols}
        aspect={aspect}
        tileId={model.tileId}
        completedIds={completedIds}
        side={cameraDock.minimapSide}
      />
      <View style={styles.text}>
        <Animated.Text
          key={model.tileId}
          entering={roll}
          style={[idText, styles.id, { color: c.text }]}
        >
          {model.tileId}
        </Animated.Text>
        <Animated.Text
          key={model.done}
          entering={roll}
          numberOfLines={1}
          style={[countText, { color: c.muted }]}
        >
          {t("camera.tileProgress", { done: model.done, total: model.total })}
        </Animated.Text>
      </View>
      <Icon name="chevronUp" size={CHEVRON_SIZE} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zone: {
    flexShrink: 1,
    height: cameraDock.zoneHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[2],
    borderRadius: cameraDock.innerRadius,
  },
  text: { flexShrink: 1 },
  id: { fontFamily: fonts.value.native[500] },
});
