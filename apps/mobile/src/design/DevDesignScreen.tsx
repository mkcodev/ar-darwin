import {
  DEFAULT_THEME_PREFERENCE,
  type HapticEvent,
  haptics,
  radius,
  resolveTheme,
  space,
  spring,
  type ThemePreference,
  type TypeRoleName,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { t } from "../i18n";
import { CameraEntry } from "./CameraEntry";
import { playHaptic } from "./playHaptic";
import { SpringRow } from "./SpringRow";
import { ThemeSelector } from "./ThemeSelector";
import { useAppFonts } from "./useAppFonts";

const roles = Object.keys(typography) as TypeRoleName[];
const hapticEvents = Object.keys(haptics) as HapticEvent[];

/**
 * Dev-only check of packages/ui on a real phone: theme selector, colours, real fonts,
 * Reanimated springs, expo-haptics and the camera's dark entry with its light status bar.
 */
export function DevDesignScreen() {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fontsReady = useAppFonts();
  const theme = resolveTheme(preference, system === "light" || system === "dark" ? system : null);
  const c = theme.color;
  const text = (role: TypeRoleName) => (fontsReady ? toNativeTextStyle(typography[role]) : {});

  const swatches: [string, string][] = [
    ["bg.canvas", c.bg.canvas],
    ["bg.surface", c.bg.surface],
    ["bg.raised", c.bg.raised],
    ["text.primary", c.text.primary],
    ["text.muted", c.text.muted],
    ["accent", c.accent.default],
    ["guide", c.guide.default],
    ["camera.pill", c.camera.pillSolid],
    ["camera.guide", c.camera.guide],
  ];

  return (
    <ScrollView style={{ backgroundColor: c.bg.canvas }} contentContainerStyle={styles.content}>
      <StatusBar style={cameraOpen ? theme.statusBar.camera : theme.statusBar.app} />
      <Text style={[text("display"), { color: c.text.primary }]}>{t("devDesign.title")}</Text>

      <Text style={[text("label"), { color: c.text.muted }]}>{t("devDesign.theme.label")}</Text>
      <ThemeSelector theme={theme} value={preference} onChange={setPreference} />

      <Text style={[text("title"), styles.heading, { color: c.text.primary }]}>
        {t("devDesign.colors")}
      </Text>
      <View style={styles.swatches}>
        {swatches.map(([name, value]) => (
          <View key={name} style={styles.swatch}>
            <View style={[styles.chip, { backgroundColor: value, borderColor: c.border.subtle }]} />
            <Text style={[text("value"), styles.small, { color: c.text.muted }]}>{name}</Text>
          </View>
        ))}
      </View>

      <Text style={[text("title"), styles.heading, { color: c.text.primary }]}>
        {t("devDesign.type")}
      </Text>
      {roles.map((role) => (
        <Text key={role} style={[text(role), { color: c.text.primary }]}>
          {t(`tokens.type.sample.${role}`)}
        </Text>
      ))}

      <Text style={[text("title"), styles.heading, { color: c.text.primary }]}>
        {t("devDesign.springs")}
      </Text>
      {Object.entries(spring).map(([name, token]) => (
        <SpringRow key={name} name={name} token={token} theme={theme} />
      ))}

      <Text style={[text("title"), styles.heading, { color: c.text.primary }]}>
        {t("devDesign.haptics")}
      </Text>
      <View style={styles.wrap}>
        {hapticEvents.map((event) => (
          <Pressable
            key={event}
            accessibilityRole="button"
            onPress={() => playHaptic(event)}
            style={[styles.pill, { backgroundColor: c.bg.raised, borderColor: c.border.subtle }]}
          >
            <Text style={[text("label"), { color: c.text.primary }]}>{event}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[text("title"), styles.heading, { color: c.text.primary }]}>
        {t("devDesign.camera")}
      </Text>
      <CameraEntry theme={theme} open={cameraOpen} onOpenChange={setCameraOpen} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], paddingTop: space[16], gap: space[3] },
  heading: { marginTop: space[6] },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  swatch: { width: 96, gap: space[1] },
  chip: { height: space[10], borderRadius: radius.sm, borderWidth: 1 },
  small: { fontSize: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  pill: {
    minHeight: touchTarget,
    paddingHorizontal: space[4],
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
