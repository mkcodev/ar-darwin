import { APP_AUTHOR, feedbackBody, feedbackIssueUrl, REPO_URL } from "@ar-darwin/core";
import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { getLocale, t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";
import { SettingNote } from "./SettingNote";
import { SettingsSection } from "./SettingsSection";

/** The version in app.config.ts, read from the manifest bundled with the JS (no native module). */
function appVersion(): string {
  return Constants.expoConfig?.version ?? "?";
}

function openLink(url: string): void {
  WebBrowser.openBrowserAsync(url).catch((error: unknown) => {
    if (__DEV__) console.warn("[settings] could not open", url, error);
  });
}

/** The issue «Enviar comentarios» opens, with what helps reproduce a problem already written. */
function feedbackUrl(): string {
  const version = appVersion();
  return feedbackIssueUrl({
    title: t("settings.feedback.issueTitle"),
    body: feedbackBody(t("settings.feedback.issueIntro"), [
      [t("settings.feedback.version"), version],
      [t("settings.feedback.system"), `${Platform.OS} ${String(Platform.Version)}`],
      [t("settings.feedback.language"), getLocale()],
    ]),
  });
}

/**
 * Version and author, the code, the licenses, feedback and the introduction. Links open in the
 * in-app browser (expo-web-browser), so the person comes back to Settings when closing it.
 */
export function AboutSection() {
  const router = useRouter();
  const { theme } = useTheme();
  const muted = [styles.line, { color: theme.color.text.muted }];

  return (
    <SettingsSection title={t("settings.sections.about")}>
      <View>
        <Text style={[styles.line, { color: theme.color.text.primary }]}>
          {t("settings.about.version", { version: appVersion() })}
        </Text>
        <Text style={muted}>{t("settings.about.author", { author: APP_AUTHOR })}</Text>
      </View>
      <View style={styles.actions}>
        <Button onPress={() => openLink(REPO_URL)}>{t("settings.about.repo")}</Button>
        <Button onPress={() => router.push("/licenses")}>{t("settings.about.licenses")}</Button>
      </View>
      <View style={styles.setting}>
        <View style={styles.start}>
          <Button onPress={() => openLink(feedbackUrl())}>{t("settings.feedback.action")}</Button>
        </View>
        <SettingNote>{t("settings.feedback.hint")}</SettingNote>
      </View>
      <View style={styles.setting}>
        <View style={styles.start}>
          <Button onPress={() => router.push("/onboarding?replay=1")}>
            {t("settings.onboarding.action")}
          </Button>
        </View>
        <SettingNote>{t("settings.onboarding.hint")}</SettingNote>
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  line: toNativeTextStyle(typography.body),
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  setting: { gap: space[1] },
  start: { alignItems: "flex-start" },
});
