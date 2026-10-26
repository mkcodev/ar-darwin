import {
  hasCuts,
  MAX_SPLIT,
  maxPaperOverlapMm,
  type Orientation,
  type PaperSize,
  type Project,
  pickedTileId,
  type SplitMode,
  sheetCount,
} from "@ar-darwin/core";
import { hairline, radius, space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import type { SkImage } from "@shopify/react-native-skia";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Button } from "../components/Button";
import { SegmentedControl } from "../components/SegmentedControl";
import { Stepper } from "../components/Stepper";
import { Toggle } from "../components/Toggle";
import { t } from "../i18n";
import { playHaptic } from "../theme/playHaptic";
import { useTheme } from "../theme/ThemeProvider";
import { OverlapControl } from "./OverlapControl";
import { PresetChips } from "./PresetChips";
import { SplitPreview } from "./SplitPreview";
import { SplitSummary } from "./SplitSummary";
import { useSplitterDraft } from "./useSplitterDraft";
import { WidthChips } from "./WidthChips";

type SplitterEditorProps = {
  project: Project;
  image: SkImage;
};

type Frame = { width: number; height: number };

/** The widest drawing the stepper reaches: 10 m, far past what 10 A3 sheets cover. */
const MAX_WIDTH_CM = 1000;

/** The most overlap a sheet takes (half its shortest side), in whole mm for the stepper. */
function maxOverlapFor(paper: PaperSize, orientation: Orientation): number {
  return Math.floor(maxPaperOverlapMm(paper, orientation));
}

/**
 * The splitter with its image decoded: live preview, summary and controls. Every control edits the
 * draft; the preview, the summary and the saved split all come from it. A tap on a tile picks it
 * (A1 until one is), and the button under the controls, «Calcar B2», stores it and opens the camera
 * on that tile. A selector chooses how the image is cut: by hand (rows, columns, edges) or by paper
 * size («Folios»: sheet, orientation, final width in cm and overlap in mm, from which the grid
 * follows). A drawing that needs more than 10 sheets on an axis is explained in the summary, nothing
 * is stored and «Calcar» waits.
 */
export function SplitterEditor({ project, image }: SplitterEditorProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const imageSize = useMemo(() => ({ width: image.width(), height: image.height() }), [image]);
  const { draft, config, plan, currentTileId, update, pickTile } = useSplitterDraft(
    project,
    imageSize,
  );
  const [frame, setFrame] = useState<Frame | null>(null);
  const c = theme.color;

  // The slider drags a shared value; each whole percent it passes reaches the draft, so the
  // preview follows the thumb without a render per frame.
  const percent = useSharedValue(draft.overlapPercent);
  const commitPercent = useCallback((value: number) => update({ overlapPercent: value }), [update]);
  useAnimatedReaction(
    () => Math.round(percent.value),
    (now, was) => {
      if (was !== null && now !== was) scheduleOnRN(commitPercent, now);
    },
  );

  // A tiny image can't be cut in more pieces than it has pixels.
  const maxRows = Math.min(MAX_SPLIT, imageSize.height);
  const maxCols = Math.min(MAX_SPLIT, imageSize.width);

  const opening = useRef(false);
  useFocusEffect(
    useCallback(() => {
      opening.current = false;
    }, []),
  );
  const picked = pickedTileId(config, currentTileId);
  const choose = (id: string) => {
    if (id === picked && id === currentTileId) return;
    playHaptic("tileChange");
    pickTile(id);
  };
  const start = async () => {
    if (opening.current) return;
    opening.current = true;
    // The camera loads the project as it opens: let the write of the tile land first.
    await pickTile(picked);
    router.push({ pathname: "/project/[id]/camera", params: { id: project.id } });
  };

  const cuts = hasCuts(config);
  const extended = draft.edges === "extended";
  const isPaper = draft.mode === "paper";
  const maxOverlapMm = maxOverlapFor(draft.paper, draft.orientation);
  // The other sheet or orientation may take less overlap than the one that was set.
  const choosePaper = (paper: PaperSize) =>
    update({
      paper,
      overlapMm: Math.min(draft.overlapMm, maxOverlapFor(paper, draft.orientation)),
    });
  const chooseOrientation = (orientation: Orientation) =>
    update({
      orientation,
      overlapMm: Math.min(draft.overlapMm, maxOverlapFor(draft.paper, orientation)),
    });

  return (
    <View style={styles.screen}>
      <View style={styles.previewArea}>
        <View
          style={[styles.preview, { backgroundColor: c.bg.surface }]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setFrame({ width, height });
          }}
        >
          {frame !== null && frame.width > 0 && frame.height > 0 && (
            <SplitPreview
              image={image}
              imageSize={imageSize}
              config={config}
              currentTileId={picked}
              frame={frame}
              separationKey={
                isPaper
                  ? `paper-${config.rows}x${config.cols}-${draft.paper}-${draft.orientation}`
                  : `${draft.rows}x${draft.cols}-${draft.edges}`
              }
              onPickTile={choose}
            />
          )}
        </View>
        <SplitSummary
          config={config}
          overlapPercent={draft.overlapPercent}
          plan={plan}
          draft={draft}
        />
        {sheetCount(config) > 1 && (
          <Text style={[styles.help, { color: c.text.muted }]}>{t("splitter.pickHelp")}</Text>
        )}
      </View>
      <ScrollView
        style={styles.controls}
        contentContainerStyle={styles.controlsContent}
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedControl<SplitMode>
          label={t("splitter.mode.label")}
          options={[
            { value: "manual", label: t("splitter.mode.manual") },
            { value: "paper", label: t("splitter.mode.paper") },
          ]}
          value={draft.mode}
          onChange={(mode) => update({ mode })}
        />
        {isPaper ? (
          <>
            <SegmentedControl<PaperSize>
              label={t("splitter.paper.label")}
              options={[
                { value: "A4", label: t("splitter.paper.A4") },
                { value: "A3", label: t("splitter.paper.A3") },
                { value: "Letter", label: t("splitter.paper.Letter") },
              ]}
              value={draft.paper}
              onChange={choosePaper}
            />
            <SegmentedControl<Orientation>
              label={t("splitter.orientation.label")}
              options={[
                { value: "portrait", label: t("splitter.orientation.portrait") },
                { value: "landscape", label: t("splitter.orientation.landscape") },
              ]}
              value={draft.orientation}
              onChange={chooseOrientation}
            />
            <View style={styles.steppers}>
              <Stepper
                label={t("splitter.widthCm")}
                value={draft.widthCm}
                min={1}
                max={MAX_WIDTH_CM}
                accelerate
                onChange={(widthCm) => update({ widthCm })}
                format={(value) => t("splitter.widthValue", { value })}
                decreaseLabel={t("splitter.narrower")}
                increaseLabel={t("splitter.wider")}
              />
              <Stepper
                label={t("splitter.overlapMm")}
                value={draft.overlapMm}
                min={0}
                max={maxOverlapMm}
                onChange={(overlapMm) => update({ overlapMm })}
                format={(value) => t("splitter.overlapMmValue", { value })}
                decreaseLabel={t("splitter.lessOverlapMm")}
                increaseLabel={t("splitter.moreOverlapMm")}
              />
            </View>
            <WidthChips widthCm={draft.widthCm} onSelect={(widthCm) => update({ widthCm })} />
            <Toggle
              label={t("splitter.tint")}
              checked={draft.showOverlapTint}
              onChange={(showOverlapTint) => update({ showOverlapTint })}
            />
          </>
        ) : (
          <>
            <PresetChips
              rows={draft.rows}
              cols={draft.cols}
              maxRows={maxRows}
              maxCols={maxCols}
              onSelect={(rows, cols) => update({ rows, cols })}
            />
            <View style={styles.steppers}>
              <Stepper
                label={t("splitter.rows")}
                value={draft.rows}
                min={1}
                max={maxRows}
                onChange={(rows) => update({ rows })}
                decreaseLabel={t("splitter.fewerRows")}
                increaseLabel={t("splitter.moreRows")}
              />
              <Stepper
                label={t("splitter.cols")}
                value={draft.cols}
                min={1}
                max={maxCols}
                onChange={(cols) => update({ cols })}
                decreaseLabel={t("splitter.fewerCols")}
                increaseLabel={t("splitter.moreCols")}
              />
            </View>
            {cuts && (
              <SegmentedControl
                label={t("splitter.edges")}
                options={[
                  { value: "flush", label: t("splitter.flush") },
                  { value: "extended", label: t("splitter.extendedShort") },
                ]}
                value={draft.edges}
                onChange={(edges) => update({ edges })}
              />
            )}
            {cuts && extended && (
              <>
                <OverlapControl
                  percent={percent}
                  committed={draft.overlapPercent}
                  onCommit={commitPercent}
                />
                <Toggle
                  label={t("splitter.tint")}
                  checked={draft.showOverlapTint}
                  onChange={(showOverlapTint) => update({ showOverlapTint })}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
      <View
        style={[
          styles.action,
          {
            paddingBottom: Math.max(insets.bottom, space[4]),
            borderTopColor: c.border.subtle,
            backgroundColor: c.bg.canvas,
          },
        ]}
      >
        <Button
          variant="primary"
          icon="camera"
          fullWidth
          disabled={!plan.ok}
          accessibilityHint={plan.ok ? t("splitter.startHint") : t("splitter.startBlocked")}
          onPress={start}
        >
          {t("splitter.start", { id: picked })}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  previewArea: { flex: 1, minHeight: 240, paddingHorizontal: space[4], gap: space[2] },
  preview: { flex: 1, borderRadius: radius.md, overflow: "hidden" },
  controls: { flexGrow: 0, maxHeight: "58%" },
  controlsContent: { padding: space[4], gap: space[4] },
  action: { paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: hairline },
  help: { ...toNativeTextStyle(typography.label), textAlign: "center" },
  steppers: { flexDirection: "row", flexWrap: "wrap", columnGap: space[6], rowGap: space[4] },
});
