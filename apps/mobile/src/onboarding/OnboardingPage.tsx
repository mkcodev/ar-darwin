import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { type ReactNode, type Ref, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureDetector, type GestureType } from "react-native-gesture-handler";
import { useTheme } from "../theme/ThemeProvider";

const title = toNativeTextStyle(typography.display);
const body = toNativeTextStyle(typography.body);

/** The drawing is never smaller than this nor bigger than that, whatever room the text leaves. */
const MIN_ILLUSTRATION = 64;
const MAX_ILLUSTRATION = 200;
const FALLBACK_ILLUSTRATION = 140;
const GAP = space[5];

type OnboardingPageProps = {
  /** What the screen reader says for the title: «Paso 1 de 3. Calca sobre papel». */
  titleLabel: string;
  title: string;
  body: string;
  illustrationLabel: string;
  renderIllustration: (size: number) => ReactNode;
  /** The swipe between pages. It covers the drawing and the text, not `extra`. */
  swipe: GestureType;
  /** Controls that sit under the text (the drawing hand): outside the swipe, so it never grabs them. */
  extra?: ReactNode;
  /** To move focus to the title when the page appears. */
  titleRef: Ref<Text>;
  /** The screen reader's «next» and «back» (the swipe has no alternative otherwise). */
  accessibilityActions: { name: string; label: string }[];
  onAccessibilityAction: (name: string) => void;
};

/**
 * One page of the onboarding: a drawing over a title and a text. The drawing takes the room the
 * text and `extra` leave — it shrinks before the text would be cut off (a large system font, a
 * 360 × 640 phone) — and the page scrolls only when even the smallest drawing does not fit.
 */
export function OnboardingPage({
  titleLabel,
  title: titleText,
  body: bodyText,
  illustrationLabel,
  renderIllustration,
  swipe,
  extra,
  titleRef,
  accessibilityActions,
  onAccessibilityAction,
}: OnboardingPageProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const [viewport, setViewport] = useState(0);
  const [textHeight, setTextHeight] = useState(0);
  const [extraHeight, setExtraHeight] = useState(0);

  const measured = viewport > 0 && textHeight > 0;
  const gaps = GAP * (extra ? 2 : 1);
  const room = viewport - textHeight - extraHeight - gaps;
  const size = measured
    ? Math.round(Math.min(MAX_ILLUSTRATION, Math.max(MIN_ILLUSTRATION, room)))
    : FALLBACK_ILLUSTRATION;

  return (
    <View style={styles.page} onLayout={(e) => setViewport(e.nativeEvent.layout.height)}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <GestureDetector gesture={swipe}>
          <View collapsable={false} style={styles.swipeArea}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={illustrationLabel}
              style={{ width: size, height: size }}
            >
              {renderIllustration(size)}
            </View>
            <View style={styles.text} onLayout={(e) => setTextHeight(e.nativeEvent.layout.height)}>
              <Text
                ref={titleRef}
                accessibilityRole="header"
                accessibilityLabel={titleLabel}
                accessibilityActions={accessibilityActions}
                onAccessibilityAction={(e) => onAccessibilityAction(e.nativeEvent.actionName)}
                style={[title, { color: c.text.primary }]}
              >
                {titleText}
              </Text>
              <Text style={[body, { color: c.text.muted }]}>{bodyText}</Text>
            </View>
          </View>
        </GestureDetector>
        {extra ? (
          <View onLayout={(e) => setExtraHeight(e.nativeEvent.layout.height)}>{extra}</View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: GAP },
  swipeArea: { gap: GAP },
  text: { gap: space[2] },
});
