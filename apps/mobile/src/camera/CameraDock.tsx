import { dockModel, justCompleted, progressBar } from "@ar-darwin/core";
import { cameraDock, duration } from "@ar-darwin/ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  type SharedValue,
} from "react-native-reanimated";
import { useRetreat } from "../components/useRetreat";
import { t } from "../i18n";
import { useHandedness } from "../theme/HandednessProvider";
import { playHaptic } from "../theme/playHaptic";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { DockIconButton } from "./DockIconButton";
import { DockOpacity } from "./DockOpacity";
import { DockPrimaryButton } from "./DockPrimaryButton";
import { DockProgress } from "./DockProgress";
import { DockStatus } from "./DockStatus";

/** What the dock needs of a split project, and what its buttons do. */
export type DockTiles = {
  rows: number;
  cols: number;
  /** Width over height of the grid, for the minimap. */
  aspect: number;
  /** The tile being traced, as «B2». */
  tileId: string;
  /** The tiles marked as done. */
  completedIds: readonly string[];
  /** Go to a tile: «Anterior», «Siguiente trozo» (the next pending one) and the screen reader's steps. */
  onGoTo: (id: string) => void;
  /** Mark a tile as done, or remove the mark. */
  onToggleDone: (id: string) => void;
  /** The tile picker opens. */
  onOpenPicker: () => void;
};

type CameraDockProps = {
  /** The menu is idle: the dock retreats towards the bottom edge and stops taking touches. */
  retreated: boolean;
  /** The image's opacity, a shared value of the camera screen. */
  opacity: SharedValue<number>;
  onOpacitySettle?: (opacity: number) => void;
  onSliderActiveChange?: (active: boolean) => void;
  /** A split project's tiles: the dock adds the status zone, the progress and the main action. */
  tiles?: DockTiles | null;
  /** The camera is locked: the extra controls hide (keeping their space). */
  isLocked: boolean;
  /** Extra controls under the rows (the spike's); not part of the dock's design. */
  extraControls?: ReactNode;
};

/** The ring of the main action and the thump come this long after the success haptic. */
const COMPLETE_THUMP_MS = 140;

/**
 * The camera's bottom dock, one surface with one outline (paper edge) and, inside, zones told apart
 * by tone. Row one: the tile status (a tap opens the picker) and the opacity slider. Row two:
 * «Anterior», the undo of the mark when the tile is done, and the main action, which is the only one
 * in the accent: «Marcar hecho» → «Siguiente trozo» (the next PENDING tile, wrapping) → «Completado».
 * A spine of segments along the top edge shows the progress. A project with no split gets only the
 * opacity row. The main action and the opacity sit on the free hand's side (`useHandedness`), the
 * rest on the other; both rows mirror with the left hand. It retreats when the menu is idle
 * (`useRetreat`), stays usable while locked, and never re-renders per frame: every animation is a
 * shared value or a layout animation, and its own state only changes when a button is pressed.
 * Marking the last pending tile starts a short celebration: the segments pulse in a wave, a ring
 * spreads from the main action, and a heavy thump follows the success haptic (the screen plays the
 * success one). Opening an already complete project celebrates nothing.
 */
export function CameraDock({
  retreated,
  opacity,
  onOpacitySettle,
  onSliderActiveChange,
  tiles,
  isLocked,
  extraControls,
}: CameraDockProps) {
  const { theme } = useTheme();
  const { controls } = useHandedness();
  const { reduce } = useReduceMotion();
  const c = theme.color.camera;
  const retreat = useRetreat(retreated, "down");
  const mirrored = controls === "left";

  const model = tiles
    ? dockModel({ rows: tiles.rows, cols: tiles.cols }, tiles.completedIds, tiles.tileId)
    : null;
  const done = model?.done ?? 0;
  const total = model?.total ?? 0;

  // The celebration starts only when marking a tile makes them all done, not when a project that
  // already was complete opens (the ref starts at the count it opened with).
  const [celebrateKey, setCelebrateKey] = useState(0);
  const previousDone = useRef(done);
  useEffect(() => {
    const celebrate = justCompleted(previousDone.current, done, total);
    previousDone.current = done;
    if (!celebrate) return;
    setCelebrateKey((key) => key + 1);
    const thump = setTimeout(() => playHaptic("tilesComplete"), COMPLETE_THUMP_MS);
    return () => clearTimeout(thump);
  }, [done, total]);

  const grid = tiles ? { rows: tiles.rows, cols: tiles.cols } : null;
  const tileIsDone = tiles?.completedIds.includes(tiles.tileId) ?? false;
  const slide = reduce ? undefined : LinearTransition.duration(duration.short.ms);

  return (
    <Animated.View
      accessibilityLabel={t("camera.dockLabel")}
      pointerEvents={retreated ? "none" : "auto"}
      style={[
        styles.dock,
        { backgroundColor: c.pill, borderColor: c.pillEdge },
        tiles ? styles.withSpine : null,
        retreat,
      ]}
    >
      {tiles && grid && (
        <View style={styles.spine} pointerEvents="none">
          <DockProgress
            bar={progressBar(grid, tiles.completedIds, tiles.tileId)}
            celebrateKey={celebrateKey}
          />
        </View>
      )}
      <View style={[styles.row, mirrored && styles.mirrored]}>
        {tiles && model && (
          <DockStatus
            model={model}
            rows={tiles.rows}
            cols={tiles.cols}
            aspect={tiles.aspect}
            completedIds={tiles.completedIds}
            onOpen={tiles.onOpenPicker}
            onGoTo={tiles.onGoTo}
          />
        )}
        <DockOpacity
          value={opacity}
          onChangeEnd={onOpacitySettle}
          onActiveChange={onSliderActiveChange}
        />
      </View>
      {tiles && model && (
        <View style={[styles.row, mirrored && styles.mirrored]}>
          <DockIconButton
            icon="nextTile"
            flipGlyph
            label={t("camera.prevTile")}
            accessibilityHint={t("camera.prevTileHint", { id: model.previousId })}
            onPress={() => tiles.onGoTo(model.previousId)}
          />
          {tileIsDone && (
            <Animated.View
              entering={FadeIn.duration(duration.micro.ms)}
              exiting={FadeOut.duration(duration.instant.ms)}
            >
              <DockIconButton
                icon="undo"
                label={t("camera.undoDone", { id: model.tileId })}
                onPress={() => tiles.onToggleDone(model.tileId)}
              />
            </Animated.View>
          )}
          <Animated.View layout={slide} style={styles.primary}>
            <DockPrimaryButton
              phase={model.phase}
              label={
                model.phase === "pending"
                  ? t("camera.markDone")
                  : model.phase === "done"
                    ? t("camera.nextTile")
                    : t("camera.tileComplete")
              }
              accessibilityLabel={
                model.phase === "pending"
                  ? t("camera.markDoneLabel", { id: model.tileId })
                  : model.phase === "done"
                    ? t("camera.nextTile")
                    : t("camera.tileCompleteLabel", { count: model.total })
              }
              accessibilityHint={
                model.phase === "pending"
                  ? t("camera.markDoneHint")
                  : model.phase === "done"
                    ? t("camera.nextTileHint", { id: model.nextPendingId ?? model.tileId })
                    : t("camera.tileCompleteHint")
              }
              onPress={() => {
                if (model.phase === "pending") tiles.onToggleDone(model.tileId);
                else if (model.phase === "done" && model.nextPendingId !== undefined) {
                  tiles.onGoTo(model.nextPendingId);
                } else if (model.phase === "complete") tiles.onOpenPicker();
              }}
              celebrateKey={celebrateKey}
            />
          </Animated.View>
        </View>
      )}
      {extraControls && (
        <View
          style={[styles.extraRow, isLocked && styles.hidden]}
          pointerEvents={isLocked ? "none" : "box-none"}
          accessibilityElementsHidden={isLocked}
          importantForAccessibility={isLocked ? "no-hide-descendants" : "auto"}
        >
          {extraControls}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: {
    alignSelf: "stretch",
    gap: cameraDock.gap,
    padding: cameraDock.padding,
    borderRadius: cameraDock.radius,
    borderWidth: cameraDock.edgeWidth,
  },
  /** Room for the progress spine above the first row. */
  withSpine: { paddingTop: cameraDock.paddingTopWithSpine },
  spine: {
    position: "absolute",
    top: cameraDock.spineInset,
    left: cameraDock.padding + cameraDock.innerRadius / 2,
    right: cameraDock.padding + cameraDock.innerRadius / 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: cameraDock.gap },
  mirrored: { flexDirection: "row-reverse" },
  primary: { flex: 1 },
  extraRow: { flexDirection: "row", justifyContent: "center", gap: cameraDock.gap },
  hidden: { opacity: 0 },
});
