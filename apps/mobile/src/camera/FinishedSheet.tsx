import { projectThumbPath } from "@ar-darwin/core";
import {
  finishedSheet,
  hairline,
  radius,
  space,
  toNativeTextStyle,
  typography,
} from "@ar-darwin/ui";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { formatDuration } from "../format";
import { t } from "../i18n";
import { storedFileUri } from "../storage/files";
import { useTheme } from "../theme/ThemeProvider";

/** Portrait frame, like the library's cards. */
const THUMB_ASPECT = 3 / 4;

const valueStyle = toNativeTextStyle(typography.value);
const timeStyle = toNativeTextStyle(typography.body);

/**
 * `waiting`: the last tile was just marked and the sheet rises as soon as the camera is unlocked
 * (the lock means «leave my screen as it is»). `open`: shown.
 */
export type FinishedSheetState = "closed" | "waiting" | "open";

type FinishedSheetProps = {
  state: FinishedSheetState;
  /** The camera's lock (`CameraOverlayScreen`'s overlay gets it). */
  isLocked: boolean;
  unlock: () => void;
  /** A `waiting` sheet can rise now: the camera is unlocked. */
  onOpen: () => void;
  /** Closing it (drag, back, a tap outside) keeps the person in the camera. */
  onClose: () => void;
  projectId: string;
  done: number;
  total: number;
  /** Time spent drawing so far, read when the sheet opens. */
  timeSpentMs: number;
  /** «Back to the Library»: the main action. Called once the camera is unlocked. */
  onFinish: () => void;
  /** «Go over the tiles»: the tile picker. */
  onReviewTiles: () => void;
};

/**
 * What the camera offers once every tile is traced: the project's thumbnail, «9/9 tiles» and the
 * time spent, then «Back to the Library» (the main action) or «Go over the tiles». It rises after
 * the dock's celebration, and again from the dock's «Completed». A tap on «Back to the Library»
 * while locked is deliberate: it unlocks first, and leaves on the next render, once the screen no
 * longer blocks its removal (`usePreventRemove` in `CameraOverlayScreen` reads the committed lock).
 */
export function FinishedSheet({
  state,
  isLocked,
  unlock,
  onOpen,
  onClose,
  projectId,
  done,
  total,
  timeSpentMs,
  onFinish,
  onReviewTiles,
}: FinishedSheetProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const time = formatDuration(timeSpentMs);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (state === "waiting" && !isLocked) onOpen();
  }, [state, isLocked, onOpen]);

  useEffect(() => {
    if (!leaving || isLocked) return;
    setLeaving(false);
    onFinish();
  }, [leaving, isLocked, onFinish]);

  const finish = () => {
    if (isLocked) unlock();
    setLeaving(true);
  };

  return (
    <BottomSheet
      open={state === "open"}
      onClose={onClose}
      title={t("camera.finished.title")}
      handleLabel={t("camera.finished.handle")}
    >
      <View
        style={styles.summary}
        accessible
        accessibilityLabel={t("camera.finished.summaryLabel", { done, total, time })}
      >
        <View
          style={[styles.frame, { backgroundColor: c.bg.raised, borderColor: c.border.subtle }]}
        >
          <Image
            source={{ uri: storedFileUri(projectThumbPath(projectId)) }}
            contentFit="cover"
            transition={0}
            style={styles.thumb}
            accessible={false}
          />
        </View>
        <View style={styles.text}>
          <Text style={[valueStyle, { color: c.text.primary }]}>
            {t("camera.finished.tiles", { done, total })}
          </Text>
          <Text style={[timeStyle, { color: c.text.muted }]}>{time}</Text>
        </View>
      </View>
      <Button variant="primary" icon="check" fullWidth onPress={finish}>
        {t("camera.finished.backToLibrary")}
      </Button>
      <Button variant="ghost" fullWidth onPress={onReviewTiles}>
        {t("camera.finished.reviewTiles")}
      </Button>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: space[4] },
  frame: {
    width: finishedSheet.thumbWidth,
    aspectRatio: THUMB_ASPECT,
    borderRadius: radius.md,
    borderWidth: hairline,
    overflow: "hidden",
  },
  thumb: { flex: 1 },
  text: { flex: 1, gap: space[1] },
});
