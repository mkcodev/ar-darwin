import { largeTitleCollapse, largeTitleOverscrollScale } from "@ar-darwin/core";
import { signature, space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { StyleSheet } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { LARGE_TITLE_COLLAPSE_PX } from "./LargeTitleHeader";

const display = toNativeTextStyle(typography.display);

type LargeTitleProps = {
  title: string;
  /** Same shared value as the screen's `LargeTitleHeader`. */
  scrollY: SharedValue<number>;
};

/**
 * Big Instrument Serif title at the top of a main screen's scroll content. It fades (and, with
 * full motion, shrinks slightly) as it slides under `LargeTitleHeader`; pulled past the top it
 * grows up to `signature.largeTitleOverscrollScale` from its left edge. Reduced motion: fade only.
 * Android has no negative overscroll offset (it stretches instead), so the growth is iOS-only.
 */
export function LargeTitle({ title, scrollY }: LargeTitleProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();

  const animated = useAnimatedStyle(() => {
    const y = scrollY.value;
    const progress = largeTitleCollapse(y, LARGE_TITLE_COLLAPSE_PX);
    if (reduce) return { opacity: 1 - progress, transform: [{ scale: 1 }] };
    const shrink = 1 - progress * (1 - signature.largeTitleCollapsedScale);
    const grow = largeTitleOverscrollScale(
      y,
      signature.largeTitleOverscrollPx,
      signature.largeTitleOverscrollScale,
    );
    return { opacity: 1 - progress, transform: [{ scale: shrink * grow }] };
  });

  return (
    <Animated.Text
      style={[display, styles.title, { color: theme.color.text.primary }, animated]}
      accessibilityRole="header"
    >
      {title}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: space[4],
    paddingBottom: space[4],
    transformOrigin: "left",
  },
});
