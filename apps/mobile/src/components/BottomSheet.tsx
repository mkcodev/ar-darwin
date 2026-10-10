import { sheetRelease, sheetScrimOpacity } from "@ar-darwin/core";
import {
  bottomSheet,
  hairline,
  radius,
  space,
  spring,
  toNativeTextStyle,
  touchTarget,
  typography,
  zIndex,
} from "@ar-darwin/ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { animateFade, animateMove, springPlan } from "../theme/motion";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Name of the drag handle for screen readers; activating it closes the sheet. */
  handleLabel: string;
  children: ReactNode;
};

/**
 * Bottom sheet with 24 px corners (same behaviour as apps/desktop's BottomSheet). Opens and
 * closes with the `sheet` spring and follows the finger when dragged down; the scrim fades in
 * proportion to how far the sheet is open. Releasing past `closeThreshold` of its height, or
 * faster than `closeVelocity`, closes it (`sheetRelease`, core). It stays mounted until the
 * closing animation ends. Reduced motion: sheet and scrim fade together, dragging still works.
 *
 * It covers its parent (absolute, `zIndex.sheet`): render it at the root of the screen, outside
 * any ScrollView. Android's back button and the iOS escape gesture close it.
 */
export function BottomSheet({ open, onClose, title, handleLabel, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  if (!mounted) return null;
  return (
    <SheetBody
      open={open}
      onClose={onClose}
      onClosed={() => setMounted(false)}
      title={title}
      handleLabel={handleLabel}
    >
      {children}
    </SheetBody>
  );
}

type SheetBodyProps = BottomSheetProps & { onClosed: () => void };

function SheetBody({ open, onClose, onClosed, title, handleLabel, children }: SheetBodyProps) {
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const c = theme.color;
  const plan = springPlan(spring.sheet, reduce);
  const full = plan.mode === "full";
  const titleRef = useRef<Text>(null);

  const height = useSharedValue(0);
  /** px below the open position. Starts off-screen until the panel is measured. */
  const y = useSharedValue(window.height);
  /** Whole-sheet opacity: 1 with full motion, the reduced fade otherwise. */
  const shown = useSharedValue(full ? 1 : 0);
  const [measured, setMeasured] = useState(false);

  // Open once measured; close (from wherever the drag left it) when `open` turns false.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run on open/close and first measure
  useEffect(() => {
    if (!measured) return;
    const finished = (done?: boolean) => {
      "worklet";
      if (done) scheduleOnRN(onClosed);
    };
    if (open) {
      if (full) y.value = animateMove(0, plan);
      else {
        y.value = 0;
        shown.value = animateFade(1, plan, 0);
      }
      const node = titleRef.current;
      if (node) AccessibilityInfo.sendAccessibilityEvent(node, "focus");
    } else if (full) {
      y.value = animateMove(height.value, plan, finished);
    } else {
      shown.value = animateFade(0, plan, 0, finished);
    }
  }, [open, measured]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const drag = Gesture.Pan()
    .enabled(open)
    .activeOffsetY([-space[2], space[2]])
    .failOffsetX([-space[2], space[2]])
    .onUpdate((e) => {
      const t = e.translationY;
      y.value = t > 0 ? t : t * bottomSheet.overdragElastic;
    })
    .onEnd((e) => {
      const release = sheetRelease(
        e.translationY,
        e.velocityY,
        height.value,
        bottomSheet.closeThreshold,
        bottomSheet.closeVelocity,
      );
      if (release === "close") scheduleOnRN(onClose);
      else y.value = animateMove(0, plan);
    });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: shown.value * sheetScrimOpacity(y.value, height.value),
  }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <View style={styles.root} pointerEvents={open ? "auto" : "none"}>
      <Animated.View style={[styles.fill, { backgroundColor: c.bg.overlay }, scrimStyle]}>
        <Pressable
          style={styles.fill}
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>
      <GestureDetector gesture={drag}>
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            height.value = h;
            if (!measured) {
              if (full) y.value = h;
              setMeasured(true);
            }
          }}
          style={[
            styles.sheet,
            {
              maxHeight: window.height * bottomSheet.maxHeightRatio,
              paddingBottom: space[8] + insets.bottom,
              backgroundColor: c.bg.surface,
              borderColor: c.border.subtle,
            },
            panelStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={handleLabel}
            onPress={onClose}
            style={styles.handleArea}
          >
            <View style={[styles.handle, { backgroundColor: c.border.strong }]} />
          </Pressable>
          <Text
            ref={titleRef}
            accessibilityRole="header"
            style={[styles.title, { color: c.text.primary }]}
          >
            {title}
          </Text>
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: zIndex.sheet },
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  sheet: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    width: "100%",
    maxWidth: bottomSheet.maxWidth,
    paddingHorizontal: space[5],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: hairline,
  },
  // The visible handle is 36 × 4; the touch target around it is 48 tall.
  handleArea: {
    alignSelf: "center",
    minWidth: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: bottomSheet.handleWidth,
    height: bottomSheet.handleHeight,
    borderRadius: radius.pill,
  },
  title: { ...toNativeTextStyle(typography.title), marginBottom: space[4] },
  body: { gap: space[4] },
});
