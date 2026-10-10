import { type IconName, icons, radius, space, touchTarget } from "@ar-darwin/ui";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "../components/Icon";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

const names = Object.keys(icons) as IconName[];

/** Every icon of packages/ui drawn with Skia; tapping one replays its «trazo vivo». */
export function IconGrid() {
  const { theme } = useTheme();
  const [drawKeys, setDrawKeys] = useState<Partial<Record<IconName, number>>>({});
  return (
    <View style={styles.grid}>
      {names.map((name) => (
        <Pressable
          key={name}
          accessibilityRole="button"
          accessibilityLabel={t(`icons.${name}`)}
          onPress={() => setDrawKeys((keys) => ({ ...keys, [name]: (keys[name] ?? 0) + 1 }))}
          style={[styles.cell, { backgroundColor: theme.color.bg.surface }]}
        >
          <Icon name={name} drawKey={drawKeys[name] ?? 0} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  cell: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
});
