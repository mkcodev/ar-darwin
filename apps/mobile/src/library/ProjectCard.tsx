import { type Project, projectThumbPath } from "@ar-darwin/core";
import {
  hairline,
  opacity,
  radius,
  space,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";
import { storedFileUri } from "../storage/files";
import { useTheme } from "../theme/ThemeProvider";

/** Portrait frame, like a sheet of paper: most traced images are portrait. */
const THUMB_ASPECT = 3 / 4;

const name = toNativeTextStyle(typography.label);
const status = toNativeTextStyle(typography.value);

type ProjectCardProps = {
  project: Project;
  /** Tap (and the screen reader's «activate»): the project's camera. */
  onOpen: (project: Project) => void;
  /** Long press (and the screen reader's «long press»): the project's actions. */
  onActions: (project: Project) => void;
  /** The screen reader's «Delete» action, straight to the confirmation. */
  onDelete: (project: Project) => void;
};

/** A project in the library: its thumbnail (never the full image), name and status. */
export function ProjectCard({ project, onOpen, onActions, onDelete }: ProjectCardProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const statusText = t(`projectStatus.${project.status}`);

  return (
    <Pressable
      onPress={() => onOpen(project)}
      onLongPress={() => onActions(project)}
      accessibilityRole="button"
      accessibilityLabel={t("library.projectLabel", { name: project.name, status: statusText })}
      accessibilityHint={t("library.projectHint")}
      accessibilityActions={[
        { name: "activate" },
        { name: "longpress" },
        { name: "delete", label: t("library.actions.delete") },
      ]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        if (action === "delete") onDelete(project);
        else if (action === "longpress") onActions(project);
        else onOpen(project);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.frame, { backgroundColor: c.bg.surface, borderColor: c.border.subtle }]}>
        <Image
          source={{ uri: storedFileUri(projectThumbPath(project.id)) }}
          recyclingKey={project.id}
          contentFit="cover"
          transition={0}
          style={styles.thumb}
          accessible={false}
        />
      </View>
      <View style={styles.text}>
        <Text style={[name, { color: c.text.primary }]} numberOfLines={1}>
          {project.name}
        </Text>
        <Text style={[status, { color: c.text.muted }]} numberOfLines={1}>
          {statusText}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: touchTarget, gap: space[2] },
  pressed: { opacity: opacity.pressedContent },
  frame: {
    aspectRatio: THUMB_ASPECT,
    borderRadius: radius.md,
    borderWidth: hairline,
    overflow: "hidden",
  },
  thumb: { flex: 1 },
  text: { gap: space[1] },
});
