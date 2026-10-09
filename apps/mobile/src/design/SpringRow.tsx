import {
  radius,
  resolveMotion,
  type SpringToken,
  space,
  type Theme,
  toNativeTextStyle,
  toReanimatedSpring,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { t } from "./i18n";

type SpringRowProps = { name: string; token: SpringToken; theme: Theme };

const DOT = 16;

/**
 * One spring of packages/ui running on the UI thread with Reanimated. With the system's
 * «reduce motion» it runs the token's reduced variant (a short fade, or nothing).
 */
export function SpringRow({ name, token, theme }: SpringRowProps) {
  const reduce = useReducedMotion();
  const [track, setTrack] = useState(0);
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  const c = theme.color;

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }],
  }));

  const play = () => {
    const end = Math.max(0, track - DOT);
    const plan = resolveMotion(token, reduce);
    if (plan.kind === "full") {
      x.value = 0;
      x.value = withSpring(end, toReanimatedSpring(plan.token));
    } else if (plan.kind === "fade") {
      x.value = end;
      opacity.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: plan.duration }),
      );
    } else {
      x.value = end;
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={[toNativeTextStyle(typography.value), { color: c.text.primary }]}>{name}</Text>
        <Pressable accessibilityRole="button" onPress={play} style={styles.button}>
          <Text style={[toNativeTextStyle(typography.label), { color: c.accent.default }]}>
            {t("common.replay")}
          </Text>
        </Pressable>
      </View>
      <View
        style={[styles.track, { backgroundColor: c.bg.raised }]}
        onLayout={(e) => setTrack(e.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.dot, { backgroundColor: c.accent.default }, dotStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[1] },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  button: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  track: { height: DOT, borderRadius: radius.pill },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
});
