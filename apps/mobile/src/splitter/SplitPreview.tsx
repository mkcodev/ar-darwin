import { type ImageSize, type SplitConfig, splitPreviewLayout, tileAtPoint } from "@ar-darwin/core";
import { duration, hairline, radius, splitter, spring, stagger } from "@ar-darwin/ui";
import { Canvas, Group, type SkImage } from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  makeMutable,
  useDerivedValue,
  useSharedValue,
  withDelay,
} from "react-native-reanimated";
import { IconButton } from "../components/IconButton";
import { t } from "../i18n";
import { animateFade, animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { SplitTile } from "./SplitTile";
import { TileTag } from "./TileTag";
import { useSplitPreviewGestures } from "./useSplitPreviewGestures";

type SplitPreviewProps = {
  image: SkImage;
  imageSize: ImageSize;
  config: SplitConfig;
  currentTileId: string | undefined;
  frame: { width: number; height: number };
  /** Changes when the grid or the edges change: the tiles come together and separate again. */
  separationKey: string;
  onPickTile: (id: string) => void;
};

/** One shared value per possible tile (10 × 10), made once: hooks can't run in a loop. */
const MAX_TILES = 100;

/** The staggered separation never takes longer than this to start its last tile (a transition). */
const separationMs = duration.medium.ms;

/**
 * The splitter's live preview: the image cut with `splitPreviewLayout`, drawn in one Skia canvas
 * (crops, blue tint on the extended zones, dashed original cuts) with the names as pills over it.
 * When the grid or the edges change the tiles separate one after another (`stagger` ms, `gentle`
 * spring); under «reduce motion» they appear separated with a short fade. Pinch and drag zoom the
 * preview, and a tap on a tile picks it.
 */
export function SplitPreview({
  image,
  imageSize,
  config,
  currentTileId,
  frame,
  separationKey,
  onPickTile,
}: SplitPreviewProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const plan = useMemo(() => springPlan(spring.gentle, reduce), [reduce]);

  const layout = useMemo(
    () => splitPreviewLayout(imageSize, config, frame, splitter.tileGap),
    [imageSize, config, frame],
  );
  const imageFrame = useMemo(
    () => ({
      x: layout.origin.x,
      y: layout.origin.y,
      width: imageSize.width * layout.scale,
      height: imageSize.height * layout.scale,
    }),
    [layout, imageSize],
  );

  const progress = useMemo(() => Array.from({ length: MAX_TILES }, () => makeMutable(0)), []);
  const fade = useSharedValue(1);

  const { gesture, scale, tx, ty, zoomed, reset } = useSplitPreviewGestures({
    frame,
    maxZoom: splitter.maxZoom,
    onTapContent: (x, y) => {
      // Tiles still coming apart sit where their progress has them, not at their final place.
      const moving = {
        ...layout,
        tiles: layout.tiles.map((tile, i) => {
          const p = progress[i]?.value ?? 1;
          return { ...tile, offset: { x: tile.offset.x * p, y: tile.offset.y * p } };
        }),
      };
      const id = tileAtPoint(moving, { x, y });
      if (id !== null) onPickTile(id);
    },
  });

  // A new grid or edge style: the tiles join and separate again, and the zoom starts over.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only `separationKey` restarts it
  useEffect(() => {
    reset(false);
    const count = config.rows * config.cols;
    // Whatever the grid, the last tile starts within `separationMs` of the first.
    const step = Math.min(stagger, separationMs / count);
    progress.forEach((p, i) => {
      if (i >= count) {
        p.value = 1;
      } else if (plan.mode === "full") {
        p.value = 0;
        p.value = withDelay(i * step, animateMove(1, plan));
      } else {
        p.value = 1;
      }
    });
    if (plan.mode !== "full") {
      fade.value = 0;
      fade.value = animateFade(1, plan, duration.short.ms);
    }
  }, [separationKey]);

  const view = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);

  const c = theme.color;
  const colors = useMemo(
    () => ({
      tint: c.guide.tint,
      cut: c.guide.default,
      cutCase: c.camera.guideCase,
      current: c.accent.default,
      sheet: c.bg.raised,
    }),
    [c],
  );

  return (
    <View style={[styles.frame, frame]}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group opacity={fade} transform={view}>
              {layout.tiles.map((tile, i) => (
                <SplitTile
                  key={tile.id}
                  tile={tile}
                  image={image}
                  imageFrame={imageFrame}
                  progress={progress[i] ?? fade}
                  showTint={config.showOverlapTint}
                  isCurrent={tile.id === currentTileId}
                  paper={layout.paper}
                  colors={colors}
                />
              ))}
            </Group>
          </Canvas>
          <View
            pointerEvents="none"
            accessibilityRole="radiogroup"
            accessibilityLabel={t("splitter.preview")}
            style={StyleSheet.absoluteFill}
          >
            {layout.tiles.map((tile, i) => (
              <TileTag
                key={tile.id}
                tile={tile}
                progress={progress[i] ?? fade}
                fade={fade}
                scale={scale}
                tx={tx}
                ty={ty}
                isCurrent={tile.id === currentTileId}
                onPick={onPickTile}
              />
            ))}
          </View>
        </View>
      </GestureDetector>
      {zoomed && (
        <Animated.View
          entering={FadeIn.duration(duration.micro.ms)}
          exiting={FadeOut.duration(duration.micro.ms)}
          style={[styles.reset, { backgroundColor: c.camera.pill, borderColor: c.camera.pillEdge }]}
        >
          <IconButton
            icon="reset"
            label={t("splitter.resetZoom")}
            tone="camera"
            onPress={() => reset(true)}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
  reset: {
    position: "absolute",
    top: splitter.zoomResetInset,
    right: splitter.zoomResetInset,
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
});
