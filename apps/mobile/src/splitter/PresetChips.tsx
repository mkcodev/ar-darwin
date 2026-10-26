import { SPLIT_PRESETS } from "@ar-darwin/core";
import { space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { Chip } from "../components/Chip";
import { t } from "../i18n";
import { playHaptic } from "../theme/playHaptic";

type PresetChipsProps = {
  rows: number;
  cols: number;
  /** Largest grid the image allows (a tiny image can't be cut in 10). */
  maxRows: number;
  maxCols: number;
  onSelect: (rows: number, cols: number) => void;
};

/** The usual grids in one tap: 1×2, 2×2, 2×3, 3×3, 4×4. The one matching the current grid is on. */
export function PresetChips({ rows, cols, maxRows, maxCols, onSelect }: PresetChipsProps) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("splitter.presets")}
      style={styles.row}
    >
      {SPLIT_PRESETS.filter((p) => p.rows <= maxRows && p.cols <= maxCols).map((p) => {
        const selected = p.rows === rows && p.cols === cols;
        return (
          <Chip
            key={`${p.rows}x${p.cols}`}
            label={t("splitter.preset", { rows: p.rows, cols: p.cols })}
            accessibilityLabel={t("splitter.presetLabel", { rows: p.rows, cols: p.cols })}
            selected={selected}
            onPress={() => {
              if (selected) return;
              playHaptic("splitGrid");
              onSelect(p.rows, p.cols);
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
