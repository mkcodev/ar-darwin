import { cameraDock, radius } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type CardProgressProps = {
  /** Tiles done, out of `total` (at least 1). */
  done: number;
  total: number;
};

/**
 * The tile progress of a split project, a thin bar under the thumbnail frame. It sits on the
 * canvas, not over the image, so it reads the same over a white or a black thumbnail. The status
 * line and the card's label say «4/9»: the bar is hidden from the screen reader.
 */
export function CardProgress({ done, total }: CardProgressProps) {
  const { theme } = useTheme();
  const c = theme.color;
  return (
    <View
      style={[styles.track, { backgroundColor: c.border.strong }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.fill,
          { backgroundColor: c.text.primary, width: `${Math.round((done / total) * 100)}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: cameraDock.segmentHeight, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
