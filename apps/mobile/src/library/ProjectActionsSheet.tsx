import {
  type Category,
  doneAction,
  normalizeProjectName,
  type Project,
  sheetCount,
} from "@ar-darwin/core";
import { hairline, radius, space, toNativeTextStyle, touchTarget, typography } from "@ar-darwin/ui";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { SheetRow } from "../components/SheetRow";
import { t } from "../i18n";
import { categoryLabel } from "../storage/categoryLabel";
import { categoryStyle } from "../storage/categoryStyle";
import { useTheme } from "../theme/ThemeProvider";

const bodyStyle = toNativeTextStyle(typography.body);
const { fontFamily, fontSize } = bodyStyle;

export type ProjectActionsStep = "actions" | "rename" | "categories";

type ProjectActionsSheetProps = {
  /** The project whose actions are open; `null` closes the sheet. */
  project: Project | null;
  /** Where the sheet opens: the screen reader's «Rename» action goes straight to that step. */
  initialStep: ProjectActionsStep;
  categories: readonly Category[];
  onClose: () => void;
  onSplit: (project: Project) => void;
  /** Resolve to `true` once saved; the sheet then closes. */
  onRename: (project: Project, name: string) => Promise<boolean>;
  onSetCategories: (project: Project, categoryIds: readonly string[]) => Promise<boolean>;
  onDuplicate: (project: Project) => void;
  onSetDone: (project: Project, done: boolean) => void;
  /** No confirmation: the screen hides the project and offers «Undo». */
  onDelete: (project: Project) => void;
};

/**
 * A project's actions as a menu of rows: rename, categories, split (again), duplicate, finish or
 * reopen, and delete. Renaming and choosing categories are steps inside the same sheet, without a
 * system dialog. Deleting has no confirmation step: «Undo» in the snackbar replaces it.
 */
export function ProjectActionsSheet({
  project,
  initialStep,
  categories,
  onClose,
  onSplit,
  onRename,
  onSetCategories,
  onDuplicate,
  onSetDone,
  onDelete,
}: ProjectActionsSheetProps) {
  const { theme } = useTheme();
  const c = theme.color;
  // The sheet keeps showing the last project while it animates closed.
  const [shown, setShown] = useState(project);
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState(project?.name ?? "");
  const [picked, setPicked] = useState<readonly string[]>(project?.categoryIds ?? []);
  const [previous, setPrevious] = useState(project);
  if (project !== previous) {
    setPrevious(project);
    if (project !== null) {
      setShown(project);
      setStep(initialStep);
      setName(project.name);
      setPicked(project.categoryIds);
    }
  }
  if (shown === null) return null;

  const own = categories.filter((category) => shown.categoryIds.includes(category.id));
  const done = doneAction(shown);
  const cleanName = normalizeProjectName(name);
  const title =
    step === "rename"
      ? t("library.actions.renameTitle")
      : step === "categories"
        ? t("library.actions.categoriesTitle", { name: shown.name })
        : shown.name;

  const saveName = async () => {
    if (cleanName === null) return;
    if (cleanName === shown.name || (await onRename(shown, cleanName))) onClose();
  };
  const saveCategories = async () => {
    if (await onSetCategories(shown, picked)) onClose();
  };
  const toggle = (id: string) =>
    setPicked((ids) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]));

  return (
    <BottomSheet
      open={project !== null}
      onClose={onClose}
      title={title}
      handleLabel={t("library.sheetHandle")}
    >
      {step === "rename" ? (
        <View style={styles.block}>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            selectTextOnFocus
            maxLength={120}
            accessibilityLabel={t("library.actions.name")}
            returnKeyType="done"
            onSubmitEditing={saveName}
            cursorColor={c.accent.default}
            selectionColor={c.accent.subtle}
            selectionHandleColor={c.accent.default}
            style={[
              styles.input,
              { color: c.text.primary, backgroundColor: c.bg.raised, borderColor: c.border.strong },
            ]}
          />
          {cleanName === null && (
            <Text style={[bodyStyle, { color: c.danger }]} accessibilityLiveRegion="polite">
              {t("library.actions.nameEmpty")}
            </Text>
          )}
          <View style={styles.row}>
            <Button variant="primary" disabled={cleanName === null} onPress={saveName}>
              {t("library.actions.save")}
            </Button>
            <Button variant="ghost" onPress={() => setStep("actions")}>
              {t("library.actions.cancel")}
            </Button>
          </View>
        </View>
      ) : step === "categories" ? (
        <View style={styles.block}>
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
                  selected={picked.includes(category.id)}
                  onPress={() => toggle(category.id)}
                />
              );
            })}
          </View>
          <View style={styles.row}>
            <Button variant="primary" onPress={saveCategories}>
              {t("common.done")}
            </Button>
            <Button variant="ghost" onPress={() => setStep("actions")}>
              {t("library.actions.cancel")}
            </Button>
          </View>
        </View>
      ) : (
        <View>
          <SheetRow
            icon="pencil"
            label={t("library.actions.rename")}
            onPress={() => setStep("rename")}
          />
          <SheetRow
            icon="tag"
            label={t("library.actions.categories")}
            value={
              own.length === 0
                ? t("library.actions.noCategories")
                : own.map(categoryLabel).join(", ")
            }
            onPress={() => setStep("categories")}
          />
          <SheetRow
            icon="split"
            label={t(shown.split ? "library.actions.resplit" : "library.actions.split")}
            value={
              shown.split && sheetCount(shown.split) > 1
                ? `${shown.split.rows} × ${shown.split.cols}`
                : undefined
            }
            onPress={() => onSplit(shown)}
          />
          <SheetRow
            icon="duplicate"
            label={t("library.actions.duplicate")}
            onPress={() => onDuplicate(shown)}
          />
          {done !== null && (
            <SheetRow
              icon={done === "finish" ? "check" : "undo"}
              label={t(done === "finish" ? "library.actions.finish" : "library.actions.reopen")}
              onPress={() => onSetDone(shown, done === "finish")}
            />
          )}
          <SheetRow
            icon="trash"
            variant="danger"
            label={t("library.actions.delete")}
            onPress={() => onDelete(shown)}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  block: { gap: space[4] },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  input: {
    minHeight: touchTarget,
    paddingHorizontal: space[4],
    paddingVertical: 0,
    borderRadius: radius.md,
    borderWidth: hairline,
    fontFamily,
    fontSize,
  },
});
