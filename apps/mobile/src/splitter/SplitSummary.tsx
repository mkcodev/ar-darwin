import {
  MAX_SPLIT,
  paperSummary,
  type SplitConfig,
  type SplitDraft,
  type SplitPlan,
  sheetCount,
} from "@ar-darwin/core";
import { hairline, radius, space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { formatDecimal } from "../format";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

type SplitSummaryProps = {
  config: SplitConfig;
  /** The overlap as the person set it, in % of a tile. */
  overlapPercent: number;
  /** What the draft plans to store; in mode «paper» it can say the drawing does not fit. */
  plan: SplitPlan;
  draft: SplitDraft;
};

const body = toNativeTextStyle(typography.value);
const detail = toNativeTextStyle(typography.label);

/**
 * What the split takes. Manual: «4 folios · solape 8 %». By paper size: «Mural de 84 × 59,4 cm · 6
 * folios» with the paper and the overlap under it, or, when the drawing needs more than 10 sheets on
 * an axis, a warning in the danger colour that says which axis, how many it would take and the widest
 * width that fits. The warning is announced as an alert; the figures are announced once the person
 * stops changing things (a live region would read every step of a held button).
 */
export function SplitSummary({ config, overlapPercent, plan, draft }: SplitSummaryProps) {
  const { theme } = useTheme();
  const c = theme.color;

  if (draft.mode === "paper") {
    return <PaperSummary plan={plan} draft={draft} />;
  }

  const count = sheetCount(config);
  const summary =
    count === 1
      ? t("splitter.summaryOne")
      : config.overlapPx > 0
        ? t("splitter.summary", { count, percent: overlapPercent })
        : t("splitter.summaryFlush", { count });
  return <Announced summary={summary} color={c.text.primary} />;
}

function Announced({
  summary,
  color,
  detailText,
  detailColor,
}: {
  summary: string;
  color: string;
  detailText?: string;
  detailColor?: string;
}) {
  useEffect(() => {
    const spoken = detailText === undefined ? summary : `${summary}. ${detailText}`;
    const timer = setTimeout(() => AccessibilityInfo.announceForAccessibility(spoken), 600);
    return () => clearTimeout(timer);
  }, [summary, detailText]);

  return (
    <View style={styles.root}>
      <Text style={[styles.text, { color }]}>{summary}</Text>
      {detailText !== undefined && (
        <Text style={[styles.detail, { color: detailColor }]}>{detailText}</Text>
      )}
    </View>
  );
}

function PaperSummary({ plan, draft }: { plan: SplitPlan; draft: SplitDraft }) {
  const { theme } = useTheme();
  const c = theme.color;

  if (!plan.ok) {
    const problem = t(
      plan.axis === "columns" ? "splitter.tooMany.columns" : "splitter.tooMany.rows",
      {
        width: formatDecimal(draft.widthCm),
        needed: plan.needed,
        limit: MAX_SPLIT,
      },
    );
    const advice =
      plan.maxWidthCm > 0
        ? t("splitter.tooMany.advice", { maxWidth: formatDecimal(plan.maxWidthCm) })
        : t("splitter.tooMany.adviceNone");
    return <Warning message={`${problem} ${advice}`} />;
  }
  if (plan.sheets === null) return null;

  const { widthCm, heightCm, count } = paperSummary(plan.sheets);
  const size = { width: formatDecimal(widthCm), height: formatDecimal(heightCm) };
  const summary =
    count === 1
      ? t("splitter.summaryPaperOne", size)
      : t("splitter.summaryPaper", { ...size, count });
  const text = t("splitter.paperDetail", {
    paper: t(`splitter.paper.${draft.paper}`),
    orientation: t(`splitter.paperDetailInline.${draft.orientation}`),
    overlap: formatDecimal(plan.sheets.overlapMm),
  });
  return (
    <Announced
      summary={summary}
      color={c.text.primary}
      detailText={text}
      detailColor={c.text.muted}
    />
  );
}

/** The "does not fit" notice: an alert, so a screen reader reads it when it appears. */
function Warning({ message }: { message: string }) {
  const { theme } = useTheme();
  const c = theme.color;
  useEffect(() => {
    const timer = setTimeout(() => AccessibilityInfo.announceForAccessibility(message), 600);
    return () => clearTimeout(timer);
  }, [message]);

  // On the surface colour, where the danger text is measured for contrast.
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={message}
      style={[styles.warningBox, { backgroundColor: c.bg.surface, borderColor: c.danger }]}
    >
      <Text style={[styles.warning, { color: c.danger }]} importantForAccessibility="no">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[1], alignItems: "center" },
  text: { ...body, textAlign: "center" },
  detail: { ...detail, textAlign: "center" },
  warningBox: {
    alignSelf: "stretch",
    padding: space[3],
    borderWidth: hairline,
    borderRadius: radius.md,
  },
  warning: { ...toNativeTextStyle(typography.body), textAlign: "center" },
});
