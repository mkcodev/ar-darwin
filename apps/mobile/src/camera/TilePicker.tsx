import {
  type Rect,
  type SplitConfig,
  splitGridAspect,
  splitTiles,
  type Tile,
  type TilePickerLayout,
  tilePickerLayout,
  tileThumbnailRect,
} from "@ar-darwin/core";
import {
  bottomSheet,
  hairline,
  opacity,
  radius,
  space,
  tilePicker,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import {
  Canvas,
  FilterMode,
  Group,
  Image,
  MipmapMode,
  RoundedRect,
  type SkImage,
  Skia,
  Rect as SkiaRect,
} from "@shopify/react-native-skia";
import { type ReactNode, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "../components/BottomSheet";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

const idText = toNativeTextStyle(typography.value);
const TITLE_BLOCK = typography.title.lineHeight + space[4];

/** A tile in the grid: where its cell is, and the part of the photo its thumbnail shows. */
type Cell = { tile: Tile; x: number; y: number; view: Rect };

type TilePickerProps = {
  open: boolean;
  onClose: () => void;
  image: SkImage;
  split: SplitConfig;
  /** The tile being traced, as «B2». */
  currentId: string;
  /** A tile other than the current one was chosen. The picker closes itself. */
  onPick: (id: string) => void;
};

/**
 * Every tile of the split as a cell of one big grid, in a sheet that opens from the camera: each
 * cell shows its piece of the photo, with its name, and the tile being traced is outlined in the
 * accent. Cells keep the proportion of a tile and are at least `tilePicker.minCell` on their
 * shortest side (`tilePickerLayout`, core); a grid that does not fit scrolls, and opens scrolled to
 * the current tile. The sheet only closes by dragging its handle or title, so a drag in the grid
 * scrolls. The photo is drawn in one Skia canvas; the cells are real buttons over it, so a screen
 * reader gets «Trozo B2, actual» (and a tap anywhere on a cell, not only on its name, picks it).
 */
export function TilePicker({ open, onClose, image, split, currentId, onPick }: TilePickerProps) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const imageWidth = image.width();
  const imageHeight = image.height();

  const tiles = useMemo(
    () => splitTiles({ width: imageWidth, height: imageHeight }, split),
    [imageWidth, imageHeight, split],
  );

  // The room the sheet leaves its grid: the sheet's own maximum height without its handle, title and
  // bottom padding.
  const maxWidth = Math.min(window.width, bottomSheet.maxWidth) - 2 * space[5];
  const maxHeight = Math.max(
    tilePicker.minCell,
    window.height * bottomSheet.maxHeightRatio -
      touchTarget -
      TITLE_BLOCK -
      space[8] -
      insets.bottom,
  );
  const layout = useMemo(
    () =>
      tilePickerLayout({
        rows: split.rows,
        cols: split.cols,
        aspect: splitGridAspect({ width: imageWidth, height: imageHeight }, split),
        maxWidth,
        maxHeight,
        minCell: tilePicker.minCell,
        gap: tilePicker.gap,
      }),
    [split, imageWidth, imageHeight, maxWidth, maxHeight],
  );

  const cells = useMemo<Cell[]>(
    () =>
      tiles.map((tile) => ({
        tile,
        x: tile.col * (layout.cellWidth + tilePicker.gap),
        y: tile.row * (layout.cellHeight + tilePicker.gap),
        view: tileThumbnailRect(split, tile),
      })),
    [tiles, split, layout.cellWidth, layout.cellHeight],
  );

  const current = cells.find((cell) => cell.tile.id === currentId);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("camera.tilePicker.title")}
      handleLabel={t("camera.tilePicker.handle")}
      dragFrom="handle"
    >
      <Scrolling
        layout={layout}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        focus={current === undefined ? null : { x: current.x, y: current.y }}
      >
        <Grid
          image={image}
          cells={cells}
          layout={layout}
          currentId={currentId}
          paper={split.paper !== undefined}
          onPress={(id) => {
            if (id !== currentId) onPick(id);
            onClose();
          }}
        />
      </Scrolling>
    </BottomSheet>
  );
}

type ScrollingProps = {
  layout: TilePickerLayout;
  maxWidth: number;
  maxHeight: number;
  /** Top-left of the cell to bring into view the first time the content is measured. */
  focus: { x: number; y: number } | null;
  children: ReactNode;
};

/** Gives the grid the scrolling it needs (one axis, both or none) and opens it on the current cell. */
function Scrolling({ layout, maxWidth, maxHeight, focus, children }: ScrollingProps) {
  const vertical = useRef<ScrollView>(null);
  const horizontal = useRef<ScrollView>(null);
  const placedX = useRef(false);
  const placedY = useRef(false);

  // Once per axis, when its content has a size: centre the current cell in the room that scrolls.
  const placeX = () => {
    if (placedX.current || focus === null) return;
    placedX.current = true;
    const x = focus.x - (maxWidth - layout.cellWidth) / 2;
    horizontal.current?.scrollTo({ x: Math.max(0, x), animated: false });
  };
  const placeY = () => {
    if (placedY.current || focus === null) return;
    placedY.current = true;
    const y = focus.y - (maxHeight - layout.cellHeight) / 2;
    vertical.current?.scrollTo({ y: Math.max(0, y), animated: false });
  };

  const content = layout.scrollX ? (
    <ScrollView
      ref={horizontal}
      horizontal
      nestedScrollEnabled
      onContentSizeChange={placeX}
      contentContainerStyle={styles.centered}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.centered}>{children}</View>
  );

  if (!layout.scrollY) return content;
  return (
    <ScrollView
      ref={vertical}
      nestedScrollEnabled
      onContentSizeChange={placeY}
      style={{ maxHeight }}
    >
      {content}
    </ScrollView>
  );
}

type GridProps = {
  image: SkImage;
  cells: Cell[];
  layout: TilePickerLayout;
  currentId: string;
  /** The tiles are sheets of paper (a split by paper size). */
  paper: boolean;
  onPress: (id: string) => void;
};

function Grid({ image, cells, layout, currentId, paper, onPress }: GridProps) {
  const { theme } = useTheme();
  const c = theme.color.camera;
  // A sheet of paper reaches past the photo: its blank part is painted so the cell reads as a sheet.
  const sheet = paper ? theme.color.bg.raised : null;

  return (
    <View style={{ width: layout.width, height: layout.height }}>
      <Canvas style={StyleSheet.absoluteFill}>
        {cells.map(({ tile, x, y, view }) => (
          <CellImage
            key={tile.id}
            image={image}
            view={view}
            sheet={sheet}
            x={x}
            y={y}
            width={layout.cellWidth}
            height={layout.cellHeight}
            isCurrent={tile.id === currentId}
            accent={c.accent}
            edge={c.pillEdge}
          />
        ))}
      </Canvas>
      {cells.map(({ tile, x, y }) => {
        const isCurrent = tile.id === currentId;
        return (
          <Pressable
            key={tile.id}
            accessibilityRole="button"
            accessibilityLabel={
              isCurrent
                ? t("camera.tileCurrent", { id: tile.id })
                : t("camera.tile", { id: tile.id })
            }
            accessibilityState={{ selected: isCurrent }}
            onPress={() => onPress(tile.id)}
            style={[
              styles.cell,
              { left: x, top: y, width: layout.cellWidth, height: layout.cellHeight },
            ]}
          >
            {({ pressed }) => (
              <>
                {pressed && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.pressFill,
                      { backgroundColor: c.text, opacity: opacity.pressFill },
                    ]}
                  />
                )}
                <View
                  pointerEvents="none"
                  style={[
                    styles.tag,
                    { backgroundColor: c.pill, borderColor: isCurrent ? c.accent : c.pillEdge },
                  ]}
                >
                  <Text style={[idText, { color: c.text }]} importantForAccessibility="no">
                    {tile.id}
                  </Text>
                </View>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

type CellImageProps = {
  image: SkImage;
  /** The part of the photo this cell shows, in image px (it can reach past the photo). */
  view: Rect;
  /** Fill under the photo for a sheet of paper, or null. */
  sheet: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  isCurrent: boolean;
  /** Colours come in as props: React context does not reach inside a Skia canvas. */
  accent: string;
  edge: string;
};

/** One cell inside the canvas: the tile's part of the photo, and its outline. */
function CellImage({
  image,
  view: core,
  sheet,
  x,
  y,
  width,
  height,
  isCurrent,
  accent,
  edge,
}: CellImageProps) {
  const clip = useMemo(
    () =>
      Skia.RRectXY(
        Skia.XYWHRect(x, y, width, height),
        tilePicker.cellRadius,
        tilePicker.cellRadius,
      ),
    [x, y, width, height],
  );
  const sx = width / core.width;
  const sy = height / core.height;
  const line = isCurrent ? tilePicker.currentWidth : hairline;

  return (
    <>
      <Group clip={clip}>
        {sheet !== null && <SkiaRect x={x} y={y} width={width} height={height} color={sheet} />}
        <Image
          image={image}
          x={x - core.x * sx}
          y={y - core.y * sy}
          width={image.width() * sx}
          height={image.height() * sy}
          fit="fill"
          // A 4096 px photo shown tens of times smaller: mipmaps keep the thumbnails clean.
          sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.Linear }}
        />
      </Group>
      <RoundedRect
        x={x + line / 2}
        y={y + line / 2}
        width={width - line}
        height={height - line}
        r={tilePicker.cellRadius}
        style="stroke"
        strokeWidth={line}
        color={isCurrent ? accent : edge}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  cell: { position: "absolute", borderRadius: tilePicker.cellRadius, overflow: "hidden" },
  pressFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  tag: {
    position: "absolute",
    left: tilePicker.tagInset,
    top: tilePicker.tagInset,
    minWidth: tilePicker.tagHeight,
    height: tilePicker.tagHeight,
    paddingHorizontal: tilePicker.tagPaddingX,
    borderRadius: radius.pill,
    borderWidth: hairline,
    alignItems: "center",
    justifyContent: "center",
  },
});
