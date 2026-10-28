import { PAPER_WIDTH_PRESETS_CM } from "@ar-darwin/core";
import { space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { Chip } from "../components/Chip";
import { t } from "../i18n";
import { playHaptic } from "../theme/playHaptic";

type WidthChipsProps = {
  /** The final width now, in cm; the chip with the same width is on. */
  widthCm: number;
  onSelect: (widthCm: number) => void;
};

/** The usual final widths of a mural in one tap: 50, 80 and 100 cm; any other width is typed with the stepper. */
export function WidthChips({ widthCm, onSelect }: WidthChipsProps) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("splitter.widthPresets")}
      style={styles.row}
    >
      {PAPER_WIDTH_PRESETS_CM.map((value) => {
        const selected = value === widthCm;
        return (
          <Chip
            key={value}
            label={t("splitter.widthValue", { value })}
            accessibilityLabel={t("splitter.widthPresetLabel", { value })}
            selected={selected}
            onPress={() => {
              if (selected) return;
              playHaptic("splitGrid");
              onSelect(value);
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
