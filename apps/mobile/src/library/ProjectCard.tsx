import {
  type Category,
  libraryStatus,
  libraryTileProgress,
  type Project,
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
import { Icon } from "../components/Icon";
import { t } from "../i18n";
import { categoryLabel } from "../storage/categoryLabel";
import { categoryStyle } from "../storage/categoryStyle";
import { storedFileUri } from "../storage/files";
import { useTheme } from "../theme/ThemeProvider";
import { CardProgress } from "./CardProgress";

/** Portrait frame, like a sheet of paper: most traced images are portrait. */
const THUMB_ASPECT = 3 / 4;

const nameStyle = toNativeTextStyle(typography.label);
const valueStyle = toNativeTextStyle(typography.value);
const categoryStyleText = toNativeTextStyle(typography.label);
/** The status word: in the body face like the category, the mono is only for «4/9». */
const wordStyle = categoryStyleText;

type ProjectCardProps = {
  project: Project;
  /** Every category, to name and colour the project's first one. */
  categories: readonly Category[];
  /** Tap (and the screen reader's «activate»): the project's camera. */
  onOpen: (project: Project) => void;
  /** Long press, the «⋯» button and the screen reader's «long press»: the project's actions. */
  onActions: (project: Project) => void;
  /** The screen reader's custom actions, straight to the action. */
  onRename: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onDelete: (project: Project) => void;
};

/**
 * A project in the grid: its thumbnail (never the full image), the tile progress under it, the
 * name with a «⋯» menu, the status (with «4/9» in the mono for a split project) and its first
 * category as icon + name in the category's ink (never the colour alone; «+1» when there are more).
 */
export function ProjectCard({
  project,
  categories,
  onOpen,
  onActions,
  onRename,
  onDuplicate,
  onDelete,
}: ProjectCardProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const status = libraryStatus(project);
  const statusText = t(`projectStatus.${status}`);
  const progress = status === "done" ? null : libraryTileProgress(project);
  const own = categories.filter((category) => project.categoryIds.includes(category.id));
  const first = own[0];
  const firstStyle = first === undefined ? null : categoryStyle(first, theme);
  const label = [
    progress
      ? t("library.projectLabelProgress", { name: project.name, status: statusText, ...progress })
      : t("library.projectLabel", { name: project.name, status: statusText }),
    ...own.map(categoryLabel),
  ].join(", ");

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => onOpen(project)}
        onLongPress={() => onActions(project)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t("library.projectHint")}
        accessibilityActions={[
          { name: "activate" },
          { name: "longpress" },
          { name: "rename", label: t("library.actions.rename") },
          { name: "duplicate", label: t("library.actions.duplicate") },
          { name: "delete", label: t("library.actions.delete") },
        ]}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName;
          if (action === "delete") onDelete(project);
          else if (action === "rename") onRename(project);
          else if (action === "duplicate") onDuplicate(project);
          else if (action === "longpress") onActions(project);
          else onOpen(project);
        }}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View
          style={[styles.frame, { backgroundColor: c.bg.surface, borderColor: c.border.subtle }]}
        >
          <Image
            source={{ uri: storedFileUri(projectThumbPath(project.id)) }}
            recyclingKey={project.id}
            contentFit="cover"
            transition={0}
            style={styles.thumb}
            accessible={false}
          />
        </View>
        {/* The slot stays without a bar, so names line up across the row. */}
        {progress ? (
          <CardProgress done={progress.done} total={progress.total} />
        ) : (
          <View style={styles.progressSlot} />
        )}
        <View style={styles.text}>
          <Text style={[nameStyle, { color: c.text.primary }]} numberOfLines={1}>
            {project.name}
          </Text>
          <View style={styles.status}>
            {status === "done" && <Icon name="check" size={library.smallIcon} />}
            <Text style={[wordStyle, styles.shrink, { color: c.text.muted }]} numberOfLines={1}>
              {statusText}
            </Text>
            {progress && (
              <Text style={[valueStyle, { color: c.text.muted }]}>
                {t("library.tileCount", progress)}
              </Text>
            )}
          </View>
          {first !== undefined && firstStyle !== null && (
            <View style={styles.category}>
              <Icon name={firstStyle.icon} size={library.smallIcon} color={firstStyle.color} />
              <Text
                style={[categoryStyleText, styles.shrink, { color: c.text.muted }]}
                numberOfLines={1}
              >
                {categoryLabel(first)}
              </Text>
              {own.length > 1 && (
                <Text style={[categoryStyleText, { color: c.text.muted }]}>
                  {t("library.moreCategories", { count: own.length - 1 })}
                </Text>
              )}
            </View>
          )}
        </View>
      </Pressable>
      {/* Outside the card's Pressable (a nested one would also open the camera), on a surface
          pill over the thumbnail's corner so it reads over any image. */}
      <Pressable
        onPress={() => onActions(project)}
        accessibilityRole="button"
        accessibilityLabel={t("library.cardMenu", { name: project.name })}
        hitSlop={library.cardMenuHitSlop}
        style={({ pressed }) => [
          styles.menu,
          {
            backgroundColor: pressed ? c.bg.raised : c.bg.surface,
            // Strong, not subtle: in the light theme the pill is white over (often) white paper.
            borderColor: c.border.strong,
          },
        ]}
      >
        <Icon name="more" color={c.text.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  body: { gap: space[2] },
  pressed: { opacity: opacity.pressedContent },
  frame: {
    aspectRatio: THUMB_ASPECT,
    borderRadius: radius.md,
    borderWidth: hairline,
    overflow: "hidden",
  },
  thumb: { flex: 1 },
  progressSlot: { height: library.progressHeight },
  text: { gap: space[1] },
  status: { flexDirection: "row", alignItems: "center", gap: space[1] },
  category: { flexDirection: "row", alignItems: "center", gap: space[1] },
  shrink: { flexShrink: 1 },
  menu: {
    position: "absolute",
    top: space[2],
    right: space[2],
    width: touchTarget - space[3],
    height: touchTarget - space[3],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
});
