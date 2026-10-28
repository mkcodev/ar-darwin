import type { DockPhase } from "@ar-darwin/core";
import {
  cameraDock,
  duration,
  fonts,
  type IconName,
  space,
  toNativeTextStyle,
  typography,
} from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeOut, Keyframe } from "react-native-reanimated";
import { Icon } from "../components/Icon";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { DockCelebration } from "./DockCelebration";

const labelText = toNativeTextStyle(typography.body);
const REDUCED_FADE_MS =
  duration.micro.reduced.kind === "fade" ? duration.micro.reduced.duration : 0;

/** The content that arrives rises into place; the one that leaves lifts away. Subtle: 8 and 6 px. */
const ARRIVE = new Keyframe({
  from: { opacity: 0, transform: [{ translateY: 8 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
}).duration(duration.micro.ms);
const LEAVE = new Keyframe({
  from: { opacity: 1, transform: [{ translateY: 0 }] },
  to: { opacity: 0, transform: [{ translateY: -6 }] },
}).duration(duration.instant.ms);

const ICONS: Record<DockPhase, IconName> = {
  pending: "check",
  done: "nextTile",
  complete: "check",
};

type DockPrimaryButtonProps = {
  phase: DockPhase;
  /** Visible words: «Marcar hecho», «Siguiente trozo» or «Completado». */
  label: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
  /** Goes up by one each time every tile gets done: the ring spreads. */
  celebrateKey: number;
};

/**
 * The dock's one main action, in the accent. It changes with the state of the tile: «Marcar hecho»
 * while it is pending, «Siguiente trozo» once it is done and others are left, «Completado» when
 * every tile is. When the state changes the content (icon and words) is swapped in place: the old
 * lifts and fades, the new rises, and its icon draws itself («trazo vivo»); the button keeps its
 * size, so nothing around it moves. Reduced motion: a plain cross-fade. A `Pressable` of React
 * Native, with no gesture handler, so it keeps receiving touches in every state.
 */
export function DockPrimaryButton({
  phase,
  label,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  celebrateKey,
}: DockPrimaryButtonProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color.camera;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? c.accentPressed : c.accent },
      ]}
    >
      <Animated.View
        key={phase}
        entering={reduce ? FadeIn.duration(REDUCED_FADE_MS) : ARRIVE}
        exiting={reduce ? FadeOut.duration(REDUCED_FADE_MS) : LEAVE}
        style={styles.content}
      >
        <Icon name={ICONS[phase]} color={c.onAccent} drawKey={1} />
        <Text style={[labelText, styles.label, { color: c.onAccent }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
      <DockCelebration trigger={celebrateKey} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "stretch",
    minHeight: cameraDock.actionHeight,
    borderRadius: cameraDock.innerRadius,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
  },
  label: { fontFamily: fonts.ui.native[600] },
});
