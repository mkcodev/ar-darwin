import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { Slider } from "../components/Slider";
import { Stepper } from "../components/Stepper";
import { Toggle } from "../components/Toggle";
import { percentFormat } from "../format";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

type Edges = "flush" | "extended";

const opacityText = percentFormat(1);

type ComponentsGalleryProps = {
  grid: boolean;
  onGrid: (grid: boolean) => void;
  opacity: SharedValue<number>;
  onOpenSheet: () => void;
};

/**
 * The base components in every state, as in the web playground's gallery (same `gallery.*`
 * texts). The bottom sheet itself lives at the screen's root, outside the ScrollView.
 */
export function ComponentsGallery({ grid, onGrid, opacity, onOpenSheet }: ComponentsGalleryProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const [magnet, setMagnet] = useState(true);
  const [lock, setLock] = useState(false);
  const [edges, setEdges] = useState<Edges>("extended");
  const [rows, setRows] = useState(2);
  const heading = [styles.heading, { color: c.text.primary }];
  const note = [styles.note, { color: c.text.muted }];

  return (
    <View style={styles.gallery}>
      <Text style={heading}>{t("gallery.buttons")}</Text>
      <View style={styles.row}>
        <Button variant="primary" icon="nextTile">
          {t("camera.nextTile")}
        </Button>
        <Button variant="secondary">{t("gallery.secondary")}</Button>
        <Button variant="ghost">{t("gallery.ghost")}</Button>
        <Button variant="primary" disabled>
          {t("gallery.disabled")}
        </Button>
      </View>
      <Text style={note}>{t("gallery.inkNote")}</Text>

      <Text style={heading}>{t("gallery.iconButtons")}</Text>
      <View style={styles.row}>
        <IconButton
          icon="magnet"
          label={t("camera.magnet")}
          pressed={magnet}
          onPress={() => setMagnet((v) => !v)}
        />
        <IconButton
          icon="lock"
          label={t("camera.lock")}
          pressed={lock}
          onPress={() => setLock((v) => !v)}
        />
        <IconButton icon="settings" label={t("icons.settings")} />
        <IconButton icon="split" label={t("icons.split")} disabled />
      </View>
      <Text style={note}>{t("gallery.iconButtonNote")}</Text>

      <Text style={heading}>{t("gallery.controls")}</Text>
      <Toggle label={t("gallery.toggle")} checked={grid} onChange={onGrid} />
      <Slider
        label={t("camera.opacity")}
        value={opacity}
        min={0}
        max={1}
        step={0.01}
        format={opacityText}
      />
      <SegmentedControl
        label={t("gallery.edges")}
        options={[
          { value: "flush", label: t("splitter.flush") },
          { value: "extended", label: t("splitter.extended") },
        ]}
        value={edges}
        onChange={setEdges}
      />
      <Stepper
        label={t("splitter.rows")}
        value={rows}
        min={1}
        max={10}
        onChange={setRows}
        decreaseLabel={t("splitter.fewerRows")}
        increaseLabel={t("splitter.moreRows")}
      />

      <Text style={heading}>{t("gallery.sheet")}</Text>
      <Text style={note}>{t("gallery.sheetNote")}</Text>
      <Button variant="secondary" icon="settings" onPress={onOpenSheet}>
        {t("gallery.openSheet")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: space[3] },
  heading: { ...toNativeTextStyle(typography.label), marginTop: space[3] },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[2], alignItems: "center" },
  note: toNativeTextStyle(typography.body),
});
