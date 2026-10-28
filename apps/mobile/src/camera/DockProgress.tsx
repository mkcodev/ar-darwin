import type { ProgressBar } from "@ar-darwin/core";
import { cameraDock, duration, radius, spring, stagger } from "@ar-darwin/ui";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

type DockProgressProps = {
  bar: ProgressBar;
  /** Goes up by one each time every tile gets done: the segments pulse in a wave. 0 = never. */
  celebrateKey: number;
};

/** How much taller the segment of the tile being traced is, and how much the wave adds. */
const MARK_GROW = 0.5;
const WAVE_GROW = 0.9;

/**
 * The dock's progress, a spine along its top edge: one segment per tile in reading order (done in
 * solid paper, the tile being traced a little taller and in the accent while it is pending, the
 * rest in the dim edge tone), or a single filling bar when there are too many tiles for segments.
 * Hidden from the screen reader: the status zone says «Hechos: 4».
 */
export function DockProgress({ bar, celebrateKey }: DockProgressProps) {
  if (bar.kind === "bar") return <ContinuousBar fraction={bar.fraction} />;
  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bar.items.map((segment, index) => (
        <Segment
          key={segment.id}
          done={segment.done}
          current={segment.current}
          index={index}
          celebrateKey={celebrateKey}
        />
      ))}
    </View>
  );
}

type SegmentProps = {
  done: boolean;
  current: boolean;
  index: number;
  celebrateKey: number;
};

function Segment({ done, current, index, celebrateKey }: SegmentProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color.camera;
  const fill = useSharedValue(done ? 1 : 0);
  const mark = useSharedValue(current ? 1 : 0);
  const wave = useSharedValue(0);
  const fillPlan = springPlan(spring.snappy, reduce);
  const markPlan = springPlan(spring.gentle, reduce);

  // biome-ignore lint/correctness/useExhaustiveDependencies: animate when `done` flips
  useEffect(() => {
    fill.value = animateMove(done ? 1 : 0, fillPlan);
  }, [done]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: animate when `current` flips
  useEffect(() => {
    mark.value = animateMove(current ? 1 : 0, markPlan);
  }, [current]);

  // The wave: each segment pulses `stagger` ms after the one before it. Not with reduced motion.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new celebration starts it
  useEffect(() => {
    if (celebrateKey === 0 || reduce) return;
    wave.value = withDelay(
      index * stagger,
      withSequence(
        withTiming(1, { duration: duration.micro.ms }),
        withTiming(0, { duration: duration.long.ms }),
      ),
    );
  }, [celebrateKey]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + mark.value * MARK_GROW + wave.value * WAVE_GROW }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <Animated.View
      style={[
        styles.segment,
        { backgroundColor: current && !done ? c.accent : c.pillEdge },
        bodyStyle,
      ]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: c.text }, fillStyle]} />
    </Animated.View>
  );
}

function ContinuousBar({ fraction }: { fraction: number }) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const c = theme.color.camera;
  const fill = useSharedValue(fraction);
  const plan = springPlan(spring.gentle, reduce);

  // biome-ignore lint/correctness/useExhaustiveDependencies: animate when the fraction changes
  useEffect(() => {
    fill.value = animateMove(fraction, plan);
  }, [fraction]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <View
      style={[styles.segment, styles.bar, { backgroundColor: c.pillEdge }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.fill, { backgroundColor: c.text }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: cameraDock.segmentGap },
  segment: { flex: 1, height: cameraDock.segmentHeight, borderRadius: radius.pill },
  bar: { alignSelf: "stretch" },
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    transformOrigin: "left",
  },
});
