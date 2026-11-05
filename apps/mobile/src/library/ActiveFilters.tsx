import type { Category, LibraryFilter } from "@ar-darwin/core";
import {
  hairline,
  library,
  radius,
  space,
  toNativeTextStyle,
  touchTarget,
  typography,
} from "@ar-darwin/ui";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Icon } from "../components/Icon";
import { t } from "../i18n";
import { categoryLabel } from "../storage/categoryLabel";
import { useTheme } from "../theme/ThemeProvider";

const labelStyle = toNativeTextStyle(typography.label);

type ActiveFiltersProps = {
  filter: LibraryFilter;
  categories: readonly Category[];
  onChange: (filter: LibraryFilter) => void;
};

/**
 * The filters set in the sheet, one removable chip each (status first, then categories), in a row
 * that scrolls sideways. Nothing renders when none is set.
 */
export function ActiveFilters({ filter, categories, onChange }: ActiveFiltersProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const chips = [
    ...(filter.status === "all"
      ? []
      : [
          {
            key: "status",
            label: t(`projectStatus.${filter.status}`),
            remove: () => onChange({ ...filter, status: "all" }),
          },
        ]),
    ...filter.categoryIds.flatMap((id) => {
      const category = categories.find((cat) => cat.id === id);
      if (category === undefined) return [];
      return [
        {
          key: id,
          label: categoryLabel(category),
          remove: () =>
            onChange({
              ...filter,
              categoryIds: filter.categoryIds.filter((other) => other !== id),
            }),
        },
      ];
    }),
  ];
  if (chips.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          onPress={chip.remove}
          accessibilityRole="button"
          accessibilityLabel={t("library.filter.remove", { name: chip.label })}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: pressed ? c.bg.raised : c.accent.subtle,
              borderColor: c.accent.default,
            },
          ]}
        >
          <Text style={[labelStyle, { color: c.text.primary }]}>{chip.label}</Text>
          <Icon name="close" size={library.smallIcon} color={c.text.primary} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[2] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: touchTarget,
    paddingLeft: space[4],
    paddingRight: space[3],
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
});
