import {
  radius,
  space,
  type Theme,
  type ThemePreference,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "./i18n";

type ThemeSelectorProps = {
  theme: Theme;
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
};

const options: ThemePreference[] = ["system", "light", "dark"];

/** Sistema / Claro / Oscuro, as a radio group. */
export function ThemeSelector({ theme, value, onChange }: ThemeSelectorProps) {
  const c = theme.color;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("devDesign.theme.label")}
      style={[styles.row, { backgroundColor: c.bg.surface, borderColor: c.border.subtle }]}
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option)}
            style={[
              styles.segment,
              selected && { backgroundColor: c.bg.raised, borderColor: c.border.strong },
            ]}
          >
            <Text
              style={[
                toNativeTextStyle(typography.label),
                { color: selected ? c.text.primary : c.text.muted },
              ]}
            >
              {t(`devDesign.theme.${option}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  segment: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: space[4],
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
});
