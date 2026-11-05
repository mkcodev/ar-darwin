import {
  type Category,
  EMPTY_LIBRARY_FILTER,
  LIBRARY_SORTS,
  type LibraryFilter,
  type LibrarySort,
  type LibraryStatusFilter,
} from "@ar-darwin/core";
import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { SegmentedControl } from "../components/SegmentedControl";
import { t } from "../i18n";
import { categoryLabel } from "../storage/categoryLabel";
import { categoryStyle } from "../storage/categoryStyle";
import { useTheme } from "../theme/ThemeProvider";

const sectionStyle = toNativeTextStyle(typography.label);

const STATUSES: readonly LibraryStatusFilter[] = ["all", "pending", "in_progress", "done"];

type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  filter: LibraryFilter;
  sort: LibrarySort;
  categories: readonly Category[];
  /** How many projects a filter would leave, for the live count on «Show results». */
  countFor: (filter: LibraryFilter) => number;
  onApply: (filter: LibraryFilter, sort: LibrarySort) => void;
};

/**
 * «Filter and sort»: status (one), categories (any of them) and the order. Changes stay a draft
 * until «Show results (N)», whose count follows the draft; closing the sheet drops them. «Reset»
 * clears status, categories and order (not the search, which lives on the screen).
 */
export function FilterSheet({
  open,
  onClose,
  filter,
  sort,
  categories,
  countFor,
  onApply,
}: FilterSheetProps) {
  const { theme } = useTheme();
  const c = theme.color;
  const [draft, setDraft] = useState(filter);
  const [draftSort, setDraftSort] = useState(sort);
  // Each opening starts from what the screen shows.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(filter);
      setDraftSort(sort);
    }
  }

  const toggleCategory = (id: string) =>
    setDraft((d) => ({
      ...d,
      categoryIds: d.categoryIds.includes(id)
        ? d.categoryIds.filter((other) => other !== id)
        : [...d.categoryIds, id],
    }));

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("library.filter.title")}
      handleLabel={t("library.sheetHandle")}
    >
      <View style={styles.body}>
        <View style={styles.section}>
          <Text style={[sectionStyle, { color: c.text.muted }]}>{t("library.filter.status")}</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {STATUSES.map((status) => (
              <Chip
                key={status}
                text="label"
                label={status === "all" ? t("library.filter.all") : t(`projectStatus.${status}`)}
                selected={draft.status === status}
                onPress={() => setDraft((d) => ({ ...d, status }))}
              />
            ))}
          </View>
        </View>
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={[sectionStyle, { color: c.text.muted }]}>
              {t("library.filter.categories")}
            </Text>
            <View style={styles.chips}>
              {categories.map((category) => {
                const look = categoryStyle(category, theme);
                return (
                  <Chip
                    key={category.id}
                    role="checkbox"
                    text="label"
                    icon={look.icon}
                    iconColor={look.color}
                    label={categoryLabel(category)}
                    selected={draft.categoryIds.includes(category.id)}
                    onPress={() => toggleCategory(category.id)}
                  />
                );
              })}
            </View>
          </View>
        )}
        <SegmentedControl
          label={t("library.filter.sort")}
          options={LIBRARY_SORTS.map((value) => ({ value, label: t(`library.sort.${value}`) }))}
          value={draftSort}
          onChange={setDraftSort}
        />
        <View style={styles.actions}>
          <Button variant="primary" onPress={() => onApply(draft, draftSort)}>
            {t("library.filter.show", { count: countFor(draft) })}
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              setDraft({ ...EMPTY_LIBRARY_FILTER, query: draft.query });
              setDraftSort("recent");
            }}
          >
            {t("library.filter.reset")}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[6] },
  section: { gap: space[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[3] },
});
