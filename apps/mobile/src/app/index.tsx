import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { LargeTitle } from "../components/LargeTitle";
import { LargeTitleHeader, useLargeTitleBarHeight } from "../components/LargeTitleHeader";
import { t } from "../i18n";
import { spikesEnabled } from "../spikes";
import { useTheme } from "../theme/ThemeProvider";

const body = toNativeTextStyle(typography.body);

/** Library, the home screen. The project list arrives with the Biblioteca task. */
export default function Library() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const barHeight = useLargeTitleBarHeight();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const title = t("library.title");

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ top: barHeight }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: barHeight, paddingBottom: insets.bottom + space[6] },
        ]}
      >
        <LargeTitle title={title} scrollY={scrollY} />
        <View style={styles.body}>
          <Text style={[body, { color: theme.color.text.muted }]}>{t("library.empty")}</Text>
          {__DEV__ && (
            <Button variant="ghost" onPress={() => router.push("/dev/design")}>
              {t("devDesign.open")}
            </Button>
          )}
          {spikesEnabled && (
            <Button variant="ghost" onPress={() => router.push("/dev/camera")}>
              {t("cameraSpike.open")}
            </Button>
          )}
        </View>
      </Animated.ScrollView>
      <LargeTitleHeader
        title={title}
        scrollY={scrollY}
        trailing={
          <IconButton
            icon="settings"
            label={t("icons.settings")}
            onPress={() => router.push("/settings")}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1 },
  body: { paddingHorizontal: space[4], gap: space[3], alignItems: "flex-start" },
});
