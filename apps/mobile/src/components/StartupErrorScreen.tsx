import { isSchemaTooNewError } from "@ar-darwin/core";
import {
  darkTheme,
  radius,
  space,
  type TypeRole,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { isLoaded } from "expo-font";
import { SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useContext, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { t } from "../i18n";

type StartupErrorScreenProps = {
  /** What the root layout caught: a `SchemaTooNewError` or anything else. */
  error: unknown;
  /** Re-mounts the app (the router's `retry`): the database is opened and migrated again. */
  onRetry: () => void | Promise<void>;
};

const colors = darkTheme.color;

/** Text style of a type role, in the system font if the app fonts did not register. */
function textStyle(role: TypeRole) {
  const { fontFamily, ...rest } = toNativeTextStyle(role);
  try {
    return isLoaded(fontFamily) ? { fontFamily, ...rest } : rest;
  } catch {
    return rest;
  }
}

/**
 * Recovery screen for a start-up failure (the database did not open or migrate). It renders from
 * the root layout's `ErrorBoundary`, ABOVE every app provider, so it takes nothing from them: plain
 * React Native, the dark theme object from packages/ui and no Reanimated or gestures. The fonts may
 * not be in yet, hence the system-font fallback.
 *
 * It offers retry only. It never deletes or resets the database: that is the person's data.
 */
export function StartupErrorScreen({ error, onRetry }: StartupErrorScreenProps) {
  // The context, not the hook: without a SafeAreaProvider the hook throws, and this must not.
  const insets = useContext(SafeAreaInsetsContext);
  const newer = isSchemaTooNewError(error);

  // The splash is still up (the settings that would hide it never mounted): show the screen.
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  useEffect(() => {
    console.error("AR-Darwin start-up error", error);
  }, [error]);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: (insets?.top ?? 0) + space[6],
          paddingBottom: (insets?.bottom ?? 0) + space[6],
        },
      ]}
    >
      <StatusBar style={darkTheme.statusBar.app} />
      <View style={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, textStyle(typography.title)]}>
          {t(newer ? "startupError.newerTitle" : "startupError.title")}
        </Text>
        <Text style={[styles.body, textStyle(typography.body)]}>
          {t(newer ? "startupError.newerBody" : "startupError.body")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("startupError.retry")}
          onPress={() => {
            void onRetry();
          }}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? colors.accent.pressed : colors.accent.default },
          ]}
        >
          <Text style={[styles.buttonLabel, textStyle(typography.label)]}>
            {t("startupError.retry")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: space[6],
    backgroundColor: colors.bg.canvas,
  },
  content: { width: "100%", maxWidth: 480, alignSelf: "center", gap: space[4] },
  title: { color: colors.text.primary },
  body: { color: colors.text.muted },
  button: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: space[6],
    marginTop: space[2],
    borderRadius: radius.pill,
  },
  buttonLabel: { color: colors.text.onAccent },
});
