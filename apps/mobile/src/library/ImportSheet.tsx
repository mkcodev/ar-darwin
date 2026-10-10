import { space } from "@ar-darwin/ui";
import { StyleSheet, View } from "react-native";
import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { t } from "../i18n";
import { IMPORT_SOURCES, type ImportSource } from "./importSources";

type ImportSheetProps = {
  open: boolean;
  onClose: () => void;
  onPick: (source: ImportSource) => void;
};

/** Where to import an image from: one button per entry of `IMPORT_SOURCES`. */
export function ImportSheet({ open, onClose, onPick }: ImportSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("library.importSheetTitle")}
      handleLabel={t("library.sheetHandle")}
    >
      <View style={styles.sources}>
        {IMPORT_SOURCES.map((source) => (
          <Button key={source.id} icon={source.icon} onPress={() => onPick(source)}>
            {source.label()}
          </Button>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sources: { gap: space[3] },
});
