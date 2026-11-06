import { hairline, radius, space, toNativeTextStyle, touchTarget, typography } from "@ar-darwin/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../components/Icon";
import { SearchField } from "../components/SearchField";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

const labelStyle = toNativeTextStyle(typography.label);
const countStyle = toNativeTextStyle(typography.value);

type LibraryToolbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** Filters set in the sheet; shown on the button, which turns to the accent while any is on. */
  activeFilters: number;
  onOpenFilters: () => void;
};

/** Search and «Filter» on one row, from `LIBRARY_TOOLBAR_MIN_PROJECTS` projects up. */
export function LibraryToolbar({
  query,
  onQueryChange,
  activeFilters,
  onOpenFilters,
}: LibraryToolbarProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const active = activeFilters > 0;
  return (
    <View style={styles.row}>
      <View style={styles.search}>
        <SearchField
          value={query}
          onChangeText={onQueryChange}
          placeholder={t("library.search.placeholder")}
          label={t("library.search.label")}
          clearLabel={t("library.search.clear")}
        />
      </View>
      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel={
          active
            ? t("library.filter.openActive", { count: activeFilters })
            : t("library.filter.open")
        }
        style={({ pressed }) => [
          styles.filter,
          {
            backgroundColor: active || pressed ? c.accent.subtle : c.bg.surface,
            borderColor: active ? c.accent.default : c.border.strong,
          },
        ]}
      >
        <Icon name="filter" color={c.text.primary} />
        {active ? (
          <Text style={[countStyle, { color: c.text.primary }]}>{activeFilters}</Text>
        ) : (
          <Text style={[labelStyle, { color: c.text.primary }]}>{t("library.filter.open")}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  search: { flex: 1 },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
});
