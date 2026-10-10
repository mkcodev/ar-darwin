import { largeTitleCollapse } from "@ar-darwin/core";
import { hairline, space, toNativeTextStyle, touchTarget, typography } from "@ar-darwin/ui";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

/** Row of the bar under the status bar: a 48 px target plus breathing room. */
const BAR_ROW = touchTarget + space[2];
/** The big title is gone under the bar after scrolling its own line height. */
export const LARGE_TITLE_COLLAPSE_PX = typography.display.lineHeight;

const compact = toNativeTextStyle(typography.title);

/**
 * Height the bar covers at the top of the screen. The scroll view under it takes this as
 * `paddingTop` and `scrollIndicatorInsets.top`, so nothing starts hidden behind the bar.
 */
export function useLargeTitleBarHeight(): number {
  return useSafeAreaInsets().top + BAR_ROW;
}

type LargeTitleHeaderProps = {
  title: string;
  /** Vertical offset of the screen's scroll view, written by `useAnimatedScrollHandler`. */
  scrollY: SharedValue<number>;
  /** Actions on the right, e.g. an IconButton. */
  trailing?: ReactNode;
};

/**
 * Bar of the main screens (library; challenges later). Fixed over the scroll view, it shows the
 * compact title and a hairline once `LargeTitle` has scrolled under it. Purely scroll-driven on
 * the UI thread: a crossfade, so it reads the same with reduced motion.
 */
export function LargeTitleHeader({ title, scrollY, trailing }: LargeTitleHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.color;

  const collapsed = useAnimatedStyle(() => ({
    opacity: largeTitleCollapse(scrollY.value, LARGE_TITLE_COLLAPSE_PX),
  }));

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top, height: insets.top + BAR_ROW, backgroundColor: c.bg.canvas },
      ]}
    >
      {/* LargeTitle is the header for screen readers; this copy is only visual. */}
      <Animated.Text
        style={[compact, styles.title, { color: c.text.primary }, collapsed]}
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {title}
      </Animated.Text>
      {trailing}
      <Animated.View
        style={[styles.hairline, { backgroundColor: c.border.subtle }, collapsed]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingLeft: space[4],
    paddingRight: space[2],
  },
  title: { flex: 1 },
  hairline: { position: "absolute", left: 0, right: 0, bottom: 0, height: hairline },
});
