import {
  cameraPermissionAction,
  ONBOARDING_STEPS,
  type OnboardingStep,
  stepAfter,
  stepBefore,
  stepIndex,
} from "@ar-darwin/core";
import {
  duration,
  type Handedness,
  space,
  spring,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeInLeft, FadeInRight, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCameraPermission } from "react-native-vision-camera";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { IconButton } from "../components/IconButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { t } from "../i18n";
import { useAppSettings } from "../settings/AppSettingsProvider";
import { springPlan } from "../theme/motion";
import { playHaptic } from "../theme/playHaptic";
import { useReduceMotion } from "../theme/ReduceMotionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { OnboardingFooter } from "./OnboardingFooter";
import { OnboardingPage } from "./OnboardingPage";
import { SplitIllustration } from "./SplitIllustration";
import { TraceIllustration } from "./TraceIllustration";

const HANDS: readonly Handedness[] = ["right", "left"];
const progress = toNativeTextStyle(typography.value);

/** How far a swipe goes to turn the page, and how much sideways movement starts it (dp). */
const SWIPE_DISTANCE = 50;
const SWIPE_START = 24;
const SWIPE_FAIL_Y = 16;
const SIDE_SLOT = touchTarget * 2;

type OnboardingScreenProps = {
  /** Ends the onboarding: the last page's button, «Saltar» or «Ahora no». */
  onFinish: () => void;
};

/**
 * The three pages (trace, split, camera) with their indicator and buttons. Pages turn by button,
 * by a swipe over the drawing and the text, by the header's back button and, for a screen reader,
 * by the «Siguiente» and «Anterior» actions of the title. The camera permission lives in the last
 * page; the drawing hand is asked in the first, and saved like in Settings.
 */
export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { reduce } = useReduceMotion();
  const { drawingHand, setDrawingHand } = useAppSettings();
  const permission = useCameraPermission();
  const [step, setStep] = useState<OnboardingStep>("trace");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [cameraDraw, setCameraDraw] = useState(0);
  const titleRef = useRef<Text>(null);
  const c = theme.color;
  const index = stepIndex(step);
  const total = ONBOARDING_STEPS.length;
  const permissionAction = cameraPermissionAction(permission);

  const goTo = (next: OnboardingStep | null, to: 1 | -1) => {
    if (next === null) return;
    playHaptic("tileChange");
    setDirection(to);
    setStep(next);
  };
  const goNext = () => goTo(stepAfter(step), 1);
  const goBack = () => goTo(stepBefore(step), -1);

  // Swipe over the drawing and the text. It starts only after a clear sideways movement, and gives
  // up on a vertical one (the page scrolls when the text is long).
  // biome-ignore lint/correctness/useExhaustiveDependencies: goTo only reads `step`
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-SWIPE_START, SWIPE_START])
        .failOffsetY([-SWIPE_FAIL_Y, SWIPE_FAIL_Y])
        .onEnd((event) => {
          if (event.translationX <= -SWIPE_DISTANCE) goTo(stepAfter(step), 1);
          else if (event.translationX >= SWIPE_DISTANCE) goTo(stepBefore(step), -1);
        }),
    [step],
  );

  // The Android back button turns the page back; on the first page the system takes over.
  // biome-ignore lint/correctness/useExhaustiveDependencies: goBack only reads `step`
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stepBefore(step) === null) return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  // A screen reader lands on the new page title, after the page has come in.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new page moves the focus
  useEffect(() => {
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
    }, duration.short.ms);
    return () => clearTimeout(timer);
  }, [step]);

  // The camera icon writes itself when its page opens.
  useEffect(() => {
    if (step === "camera") setCameraDraw((n) => n + 1);
  }, [step]);

  const pageIn = springPlan(spring.screen, reduce);
  const entering =
    pageIn.mode === "full"
      ? (direction === 1 ? FadeInRight : FadeInLeft)
          .duration(duration.short.ms)
          .reduceMotion(ReduceMotion.Never)
      : pageIn.mode === "fade"
        ? FadeIn.duration(pageIn.duration).reduceMotion(ReduceMotion.Never)
        : undefined;

  const actions = [
    ...(stepAfter(step) ? [{ name: "next", label: t("onboarding.next") }] : []),
    ...(stepBefore(step) ? [{ name: "back", label: t("onboarding.back") }] : []),
  ];
  const onAction = (name: string) => (name === "next" ? goNext() : goBack());
  const titleLabel = (title: string) =>
    `${t("onboarding.progressLabel", { step: index + 1, total })}. ${title}`;

  const cameraReady = permissionAction === "ready";
  const cameraTitle = t(cameraReady ? "onboarding.camera.ready" : "onboarding.camera.title");

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: c.bg.canvas,
          paddingTop: insets.top + space[2],
          paddingBottom: insets.bottom + space[4],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.slot, styles.start]}>
          {stepBefore(step) !== null && (
            <IconButton icon="arrowLeft" label={t("onboarding.back")} onPress={goBack} />
          )}
        </View>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[progress, { color: c.text.muted }]}
        >
          {t("onboarding.progress", { step: index + 1, total })}
        </Text>
        <View style={[styles.slot, styles.end]}>
          {step !== "camera" && (
            <Button
              variant="ghost"
              compact
              accessibilityLabel={t("onboarding.skipLabel")}
              onPress={onFinish}
            >
              {t("onboarding.skip")}
            </Button>
          )}
        </View>
      </View>

      <Animated.View key={step} entering={entering} style={styles.page}>
        {step === "trace" && (
          <OnboardingPage
            titleLabel={titleLabel(t("onboarding.trace.title"))}
            title={t("onboarding.trace.title")}
            body={t("onboarding.trace.body")}
            illustrationLabel={t("onboarding.trace.illustration")}
            renderIllustration={(size) => <TraceIllustration size={size} />}
            swipe={swipe}
            titleRef={titleRef}
            accessibilityActions={actions}
            onAccessibilityAction={onAction}
            extra={
              <SegmentedControl
                label={t("settings.hand.label")}
                options={HANDS.map((value) => ({ value, label: t(`settings.hand.${value}`) }))}
                value={drawingHand}
                onChange={setDrawingHand}
              />
            }
          />
        )}
        {step === "split" && (
          <OnboardingPage
            titleLabel={titleLabel(t("onboarding.split.title"))}
            title={t("onboarding.split.title")}
            body={t("onboarding.split.body")}
            illustrationLabel={t("onboarding.split.illustration")}
            renderIllustration={(size) => <SplitIllustration size={size} />}
            swipe={swipe}
            titleRef={titleRef}
            accessibilityActions={actions}
            onAccessibilityAction={onAction}
          />
        )}
        {step === "camera" && (
          <OnboardingPage
            titleLabel={titleLabel(cameraTitle)}
            title={cameraTitle}
            body={t(cameraReady ? "onboarding.camera.readyBody" : "onboarding.camera.body")}
            illustrationLabel={t("onboarding.camera.illustration")}
            renderIllustration={(size) => (
              <View style={styles.center}>
                <Icon
                  name="camera"
                  size={Math.round(size * 0.7)}
                  color={c.text.primary}
                  drawKey={cameraDraw}
                />
              </View>
            )}
            swipe={swipe}
            titleRef={titleRef}
            accessibilityActions={actions}
            onAccessibilityAction={onAction}
          />
        )}
      </Animated.View>

      <OnboardingFooter
        step={step}
        permissionAction={permissionAction}
        onRequestPermission={() => {
          permission.requestPermission();
        }}
        onNext={goNext}
        onFinish={onFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space[5], gap: space[4] },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  slot: { width: SIDE_SLOT, minHeight: touchTarget, justifyContent: "center" },
  start: { alignItems: "flex-start" },
  end: { alignItems: "flex-end" },
  page: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
