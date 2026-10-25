import { MAX_OVERLAP_PERCENT } from "@ar-darwin/core";
import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { StyleSheet, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { IconButton } from "../components/IconButton";
import { Slider } from "../components/Slider";
import { percentFormat } from "../format";
import { t } from "../i18n";
import { playHaptic } from "../theme/playHaptic";
import { useTheme } from "../theme/ThemeProvider";

const MIN_PERCENT = 1;
const percentText = percentFormat(100);
const label = toNativeTextStyle(typography.label);

type OverlapControlProps = {
  /** The overlap in % of a tile; the slider drags it on the UI thread. */
  percent: SharedValue<number>;
  /** The same value as last committed to React, to disable the buttons at the ends. */
  committed: number;
  onCommit: (percent: number) => void;
};

/** The thickness of the extended edge: a slider with − and + buttons, in % of a tile. */
export function OverlapControl({ percent, committed, onCommit }: OverlapControlProps) {
  const { theme } = useTheme();

  const step = (delta: number) => {
    const next = Math.min(MAX_OVERLAP_PERCENT, Math.max(MIN_PERCENT, committed + delta));
    playHaptic("nudgeStep");
    percent.value = next;
    onCommit(next);
  };

  return (
    <View style={styles.root}>
      <Text style={[label, { color: theme.color.text.muted }]}>{t("splitter.overlapAmount")}</Text>
      <View style={styles.row}>
        <IconButton
          icon="minus"
          label={t("splitter.thinner")}
          disabled={committed <= MIN_PERCENT}
          onPress={() => step(-1)}
        />
        <View style={styles.slider}>
          <Slider
            label={t("splitter.overlapAmount")}
            compact
            value={percent}
            min={MIN_PERCENT}
            max={MAX_OVERLAP_PERCENT}
            step={1}
            format={percentText}
            onChangeEnd={onCommit}
          />
        </View>
        <IconButton
          icon="plus"
          label={t("splitter.thicker")}
          disabled={committed >= MAX_OVERLAP_PERCENT}
          onPress={() => step(1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[1] },
  row: { flexDirection: "row", alignItems: "center", gap: space[1] },
  slider: { flex: 1 },
});
