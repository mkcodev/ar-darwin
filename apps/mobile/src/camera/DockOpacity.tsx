import { cameraDock, space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { Icon } from "../components/Icon";
import { Slider } from "../components/Slider";
import { percentFormat } from "../format";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

const opacityText = percentFormat(1);
const ICON_SIZE = 20;

type DockOpacityProps = {
  /** Lives on the UI thread, like the camera's overlay opacity. */
  value: SharedValue<number>;
  onChangeEnd?: (value: number) => void;
  onActiveChange?: (active: boolean) => void;
};

/**
 * The image's opacity in the dock: an icon, the slider and its value («47 %», in a fixed width so it
 * stays aligned), on a well of the dock. Always in view: it is tuned all the time while drawing, so
 * unfolding it would cost a tap every time.
 */
export function DockOpacity({ value, onChangeEnd, onActiveChange }: DockOpacityProps) {
  const { theme } = useTheme();
  const c = theme.color.camera;

  return (
    <View style={[styles.zone, { backgroundColor: c.well }]}>
      <Slider
        label={t("camera.opacity")}
        value={value}
        min={0}
        max={1}
        step={0.01}
        format={opacityText}
        compact
        tone="dock"
        leading={<Icon name="opacity" size={ICON_SIZE} color={c.muted} />}
        valueWidth={cameraDock.valueWidth}
        onChangeEnd={onChangeEnd}
        onActiveChange={onActiveChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    flex: 1,
    minWidth: 0,
    height: cameraDock.zoneHeight,
    justifyContent: "center",
    paddingHorizontal: space[3],
    borderRadius: cameraDock.innerRadius,
  },
});
