import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { TraceIllustration } from "../onboarding/TraceIllustration";
import { useTheme } from "../theme/ThemeProvider";
import { IMPORT_SOURCES, type ImportSource } from "./importSources";

const body = toNativeTextStyle(typography.body);

/** Share of the screen width the drawing takes; it never grows past the onboarding's own size. */
const DRAWING_WIDTH_RATIO = 0.42;
const DRAWING_MAX = 176;

type EmptyLibraryProps = {
  importing: boolean;
  onPick: (source: ImportSource) => void;
};

/**
 * No projects yet: the onboarding's tracing drawing (the logo's tree traced over a sheet, drawn as
 * a live stroke), one line of what the app does and the import sources as buttons, the first one
 * primary. The sources come from `IMPORT_SOURCES`, so «Files» joins on its own after the rebuild.
 */
export function EmptyLibrary({ importing, onPick }: EmptyLibraryProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(DRAWING_MAX, width * DRAWING_WIDTH_RATIO);
  return (
    <View style={styles.empty}>
      <View style={styles.drawing}>
        <TraceIllustration size={size} />
      </View>
      <Text style={[body, { color: theme.color.text.primary }]}>{t("library.emptyIntro")}</Text>
      <View style={styles.sources}>
        {IMPORT_SOURCES.map((source, index) => (
          <Button
            key={source.id}
            variant={index === 0 ? "primary" : "secondary"}
            icon={source.icon}
            fullWidth
            disabled={importing}
            onPress={() => onPick(source)}
          >
            {source.actionLabel()}
          </Button>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { gap: space[6], paddingTop: space[4] },
  drawing: { alignItems: "center" },
  sources: { gap: space[3] },
});
