import type { Project } from "@ar-darwin/core";
import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { StyleSheet, Text, View } from "react-native";
import { useProjectImage } from "../camera/useProjectImage";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";
import { SplitterEditor } from "./SplitterEditor";
import { SplitterHeader } from "./SplitterHeader";

type SplitterScreenProps = {
  project: Project;
  /** Leaves the screen (the image is missing). */
  onLeave: () => void;
};

const body = toNativeTextStyle(typography.body);

/**
 * A project's splitter. Decodes the image first (the screen's own canvas colour meanwhile); an
 * image that can't be found or decoded gets a note and a way back instead of an empty preview.
 */
export function SplitterScreen({ project, onLeave }: SplitterScreenProps) {
  const { theme } = useTheme();
  const image = useProjectImage(project.sourceUri);

  return (
    // Own canvas: the stack's contentStyle does not repaint when the theme changes at runtime.
    <View style={[styles.screen, { backgroundColor: theme.color.bg.canvas }]}>
      <SplitterHeader />
      {image.status === "ready" && <SplitterEditor project={project} image={image.image} />}
      {image.status === "missing" && (
        <View style={styles.notice}>
          <Text style={[body, { color: theme.color.text.muted }]}>{t("splitter.missing")}</Text>
          <Button variant="secondary" onPress={onLeave}>
            {t("camera.imageMissing.back")}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  notice: { padding: space[5], gap: space[4], alignItems: "flex-start" },
});
