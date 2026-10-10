import type { Project } from "@ar-darwin/core";
import { space, toNativeTextStyle, typography } from "@ar-darwin/ui";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

const body = toNativeTextStyle(typography.body);

export type ProjectActionsStep = "actions" | "confirmDelete";

type ProjectActionsSheetProps = {
  /** The project whose actions are open; `null` closes the sheet. */
  project: Project | null;
  /** Where the sheet opens: the screen reader's «Delete» action goes straight to the confirmation. */
  initialStep: ProjectActionsStep;
  onClose: () => void;
  onDelete: (project: Project) => void;
};

/**
 * A project's actions. Only «Delete» for now (renaming will live in the project's page), and it
 * asks for confirmation inside the sheet, without a system dialog.
 */
export function ProjectActionsSheet({
  project,
  initialStep,
  onClose,
  onDelete,
}: ProjectActionsSheetProps) {
  const { theme } = useTheme();
  // The sheet keeps showing the last project while it animates closed.
  const [shown, setShown] = useState(project);
  const [step, setStep] = useState(initialStep);
  const [previous, setPrevious] = useState(project);
  if (project !== previous) {
    setPrevious(project);
    if (project !== null) {
      setShown(project);
      setStep(initialStep);
    }
  }
  if (shown === null) return null;

  const confirming = step === "confirmDelete";
  return (
    <BottomSheet
      open={project !== null}
      onClose={onClose}
      title={confirming ? t("library.actions.confirmTitle", { name: shown.name }) : shown.name}
      handleLabel={t("library.sheetHandle")}
    >
      {confirming ? (
        <View style={styles.block}>
          <Text style={[body, { color: theme.color.text.muted }]}>
            {t("library.actions.confirmBody")}
          </Text>
          <View style={styles.row}>
            <Button variant="danger" icon="trash" onPress={() => onDelete(shown)}>
              {t("library.actions.delete")}
            </Button>
            <Button variant="ghost" onPress={onClose}>
              {t("library.actions.cancel")}
            </Button>
          </View>
        </View>
      ) : (
        <Button variant="danger" icon="trash" onPress={() => setStep("confirmDelete")}>
          {t("library.actions.delete")}
        </Button>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  block: { gap: space[4] },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
});
