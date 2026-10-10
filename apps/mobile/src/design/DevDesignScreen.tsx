import {
  type HapticEvent,
  haptics,
  opacity as opacityTokens,
  radius,
  space,
  spring,
  type TypeRoleName,
  toNativeTextStyle,
  typography,
} from "@ar-darwin/ui";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { Slider } from "../components/Slider";
import { Toggle } from "../components/Toggle";
import { percentFormat } from "../format";
import { t } from "../i18n";
import { playHaptic } from "../theme/playHaptic";
import { useTheme } from "../theme/ThemeProvider";
import { CameraControlsDemo } from "./CameraControlsDemo";
import { CameraEntry } from "./CameraEntry";
import { ComponentsGallery } from "./ComponentsGallery";
import { IconGrid } from "./IconGrid";
import { Preferences } from "./Preferences";
import { SpringRow } from "./SpringRow";

const roles = Object.keys(typography) as TypeRoleName[];
const hapticEvents = Object.keys(haptics) as HapticEvent[];
const opacityText = percentFormat(1);

/**
 * Dev-only check of packages/ui on a real phone: theme, hand and reduce motion for the whole app,
 * colours, real fonts, the base components in every state, Skia icons, Reanimated springs,
 * expo-haptics and the camera's dark entry with its light status bar.
 */
export function DevDesignScreen() {
  const { theme } = useTheme();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [grid, setGrid] = useState(true);
  const imageOpacity = useSharedValue<number>(opacityTokens.overlayImage);
  const c = theme.color;
  const text = (role: TypeRoleName) => toNativeTextStyle(typography[role]);
  const heading = [text("title"), styles.heading, { color: c.text.primary }];

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
    <View style={[styles.screen, { backgroundColor: c.bg.canvas }]}>
      <StatusBar style={cameraOpen ? theme.statusBar.camera : theme.statusBar.app} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[text("display"), { color: c.text.primary }]}>{t("devDesign.title")}</Text>
        <Preferences />

        <Text style={heading}>{t("devDesign.components")}</Text>
        <ComponentsGallery
          grid={grid}
          onGrid={setGrid}
          opacity={imageOpacity}
          onOpenSheet={() => setSheetOpen(true)}
        />

        <Text style={heading}>{t("devDesign.cameraControls")}</Text>
        <CameraControlsDemo opacity={imageOpacity} />

        <Text style={heading}>{t("devDesign.icons")}</Text>
        <Text style={[text("body"), { color: c.text.muted }]}>{t("devDesign.iconsHint")}</Text>
        <IconGrid />

        <Text style={heading}>{t("devDesign.colors")}</Text>
        <View style={styles.swatches}>
          {swatches.map(([name, value]) => (
            <View key={name} style={styles.swatch}>
              <View
                style={[styles.chip, { backgroundColor: value, borderColor: c.border.subtle }]}
              />
              <Text style={[text("value"), styles.small, { color: c.text.muted }]}>{name}</Text>
            </View>
          ))}
        </View>

        <Text style={heading}>{t("devDesign.type")}</Text>
        {roles.map((role) => (
          <Text key={role} style={[text(role), { color: c.text.primary }]}>
            {t(`tokens.type.sample.${role}`)}
          </Text>
        ))}

        <Text style={heading}>{t("devDesign.springs")}</Text>
        {Object.entries(spring).map(([name, token]) => (
          <SpringRow key={name} name={name} token={token} />
        ))}

        <Text style={heading}>{t("devDesign.haptics")}</Text>
        <View style={styles.wrap}>
          {hapticEvents.map((event) => (
            <Button key={event} onPress={() => playHaptic(event)}>
              {event}
            </Button>
          ))}
        </View>

        <Text style={heading}>{t("devDesign.camera")}</Text>
        <CameraEntry open={cameraOpen} onOpenChange={setCameraOpen} />
      </ScrollView>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("gallery.sheetTitle")}
        handleLabel={t("gallery.sheetHandle")}
      >
        <Slider
          label={t("camera.opacity")}
          value={imageOpacity}
          min={0}
          max={1}
          step={0.01}
          format={opacityText}
        />
        <Toggle label={t("gallery.toggle")} checked={grid} onChange={setGrid} />
        <Button variant="primary" onPress={() => setSheetOpen(false)}>
          {t("common.done")}
        </Button>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[4], paddingTop: space[16], paddingBottom: space[16], gap: space[3] },
  heading: { marginTop: space[6] },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  swatch: { width: 96, gap: space[1] },
  chip: { height: space[10], borderRadius: radius.sm, borderWidth: 1 },
  small: { fontSize: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
