import {
  libraryStatus,
  libraryTileProgress,
  type Project,
  pickedTileId,
  projectThumbPath,
} from "@ar-darwin/core";
import {
  hairline,
  library,
  opacity,
  radius,
  space,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { formatDuration } from "../format";
import { t } from "../i18n";
import { storedFileUri } from "../storage/files";
import { useTheme } from "../theme/ThemeProvider";
import { TileMap } from "./TileMap";

const nameStyle = toNativeTextStyle(typography.headline);
const valueStyle = toNativeTextStyle(typography.value);

type ContinueCardProps = {
  project: Project;
  /** The main action and a tap on the card: the camera, on the tile it was left at. */
  onOpen: (project: Project) => void;
  /** Long press (and the screen reader's «long press»): the project's actions. */
  onActions: (project: Project) => void;
  /** Only for a project that was never split. */
  onSplit: (project: Project) => void;
};

/**
 * «Keep tracing»: the latest project that is not done, one tap from the camera. Thumbnail, name in
 * the serif, the tile it opens on and, for a split project, its tile map (the one memorable thing
 * of the screen: the cuts in the non-photo blue, the current tile in the accent). About 190 dp
 * tall, so on a 360 × 640 phone the grid still shows under it.
 */
export function ContinueCard({ project, onOpen, onActions, onSplit }: ContinueCardProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const progress = libraryTileProgress(project);
  const started = libraryStatus(project) !== "pending";
  const action = t(started ? "library.continue.keepTracing" : "library.continue.start");
  const time = project.timeSpentMs > 0 ? formatDuration(project.timeSpentMs) : null;
  const tile =
    project.split !== undefined && progress !== null
      ? t("library.continue.tile", { tile: pickedTileId(project.split, project.currentTileId) })
      : t("library.continue.notSplit");
  const detail = [
    tile,
    progress === null ? null : t("library.continue.tiles", progress),
    time,
  ].filter((part) => part !== null);

  return (
    <View style={[styles.card, { backgroundColor: c.bg.surface, borderColor: c.border.subtle }]}>
      <View style={styles.top}>
        <Pressable
          onPress={() => onOpen(project)}
          onLongPress={() => onActions(project)}
          accessibilityRole="button"
          accessibilityLabel={t("library.continue.label", {
            name: project.name,
            detail: detail.join(", "),
          })}
          accessibilityHint={t("library.projectHint")}
          accessibilityActions={[{ name: "activate" }, { name: "longpress" }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "longpress") onActions(project);
            else onOpen(project);
          }}
          style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
        >
          <View
            style={[styles.thumb, { backgroundColor: c.bg.raised, borderColor: c.border.subtle }]}
          >
            <Image
              source={{ uri: storedFileUri(projectThumbPath(project.id)) }}
              recyclingKey={project.id}
              contentFit="cover"
              transition={0}
              style={styles.image}
              accessible={false}
            />
          </View>
          <View style={styles.text}>
            <Text style={[nameStyle, { color: c.text.primary }]} numberOfLines={2}>
              {project.name}
            </Text>
            <Text style={[valueStyle, { color: c.text.primary }]} numberOfLines={1}>
              {tile}
            </Text>
            <View style={styles.meta}>
              {progress !== null && (
                <Text style={[valueStyle, { color: c.text.muted }]} numberOfLines={1}>
                  {t("library.continue.tiles", progress)}
                </Text>
              )}
              {time !== null && (
                <Text style={[valueStyle, { color: c.text.muted }]} numberOfLines={1}>
                  {time}
                </Text>
              )}
            </View>
          </View>
        </Pressable>
        {project.split !== undefined && progress !== null ? (
          <TileMap
            split={project.split}
            currentTileId={project.currentTileId}
            completedTileIds={project.completedTileIds}
            colors={{
              guide: c.guide.default,
              doneFill: c.guide.tint,
              current: c.accent.default,
              check: c.text.primary,
              checkOnCurrent: c.text.onAccent,
            }}
          />
        ) : (
          <IconButton
            icon="split"
            label={t("library.actions.split")}
            onPress={() => onSplit(project)}
          />
        )}
      </View>
      <Button variant="primary" icon="camera" fullWidth onPress={() => onOpen(project)}>
        {action}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space[4],
    gap: space[3],
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  top: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  summary: { flex: 1, flexDirection: "row", gap: space[3], minHeight: touchTarget },
  pressed: { opacity: opacity.pressedContent },
  thumb: {
    width: library.continueThumbWidth,
    height: library.continueThumbHeight,
    borderRadius: radius.md,
    borderWidth: hairline,
    overflow: "hidden",
  },
  image: { flex: 1 },
  text: { flex: 1, gap: space[1] },
  meta: { marginTop: "auto", gap: space[1] },
});
