import { type SplitConfig, sheetCount } from "@ar-darwin/core";
import { toNativeTextStyle, typography } from "@ar-darwin/ui";
import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, Text } from "react-native";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

type SplitSummaryProps = {
  config: SplitConfig;
  /** The overlap as the person set it, in % of a tile. */
  overlapPercent: number;
};

const body = toNativeTextStyle(typography.value);

/** How many sheets the split takes and how much they overlap: «4 folios · solape 8 %». */
export function SplitSummary({ config, overlapPercent }: SplitSummaryProps) {
  const { theme } = useTheme();
  const count = sheetCount(config);
  const summary =
    count === 1
      ? t("splitter.summaryOne")
      : config.overlapPx > 0
        ? t("splitter.summary", { count, percent: overlapPercent })
        : t("splitter.summaryFlush", { count });
  // Announced once the person stops changing things: a live region would read every step of a
  // slider drag, and only exists on Android.
  useEffect(() => {
    const timer = setTimeout(() => AccessibilityInfo.announceForAccessibility(summary), 600);
    return () => clearTimeout(timer);
  }, [summary]);

  return <Text style={[styles.text, { color: theme.color.text.primary }]}>{summary}</Text>;
}

const styles = StyleSheet.create({
  text: { ...body, textAlign: "center" },
});
