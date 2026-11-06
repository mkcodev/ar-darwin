import { OrientationSchema, PaperSizeSchema } from "@ar-darwin/core";
import { opacity } from "@ar-darwin/ui";
import { SegmentedControl } from "../components/SegmentedControl";
import { t } from "../i18n";
import { useAppSettings } from "./AppSettingsProvider";
import { SettingNote } from "./SettingNote";
import { SettingsSection } from "./SettingsSection";

const PAPERS = PaperSizeSchema.options;
const ORIENTATIONS = OrientationSchema.options;

/** Opacities as segment values: the control works with words. Built on render, after the locale. */
function opacityOptions(): { value: string; label: string }[] {
  return opacity.overlayChoices.map((value) => ({
    value: String(value),
    label: t("common.percent", { value: Math.round(value * 100) }),
  }));
}

/**
 * What a project starts with: its image opacity when imported, and the sheet of «Folios» in the
 * splitter. Projects that already exist keep what they have, as the note says.
 */
export function NewProjectSection() {
  const { defaultOpacity, setDefaultOpacity, paperDefaults, setPaperDefaults } = useAppSettings();

  return (
    <SettingsSection title={t("settings.sections.newProjects")}>
      <SegmentedControl
        label={t("settings.defaults.opacity")}
        options={opacityOptions()}
        value={String(defaultOpacity)}
        onChange={(value) => setDefaultOpacity(Number(value))}
      />
      <SegmentedControl
        label={t("splitter.paper.label")}
        options={PAPERS.map((value) => ({ value, label: t(`splitter.paper.${value}`) }))}
        value={paperDefaults.paper}
        onChange={(paper) => setPaperDefaults({ ...paperDefaults, paper })}
      />
      <SegmentedControl
        label={t("splitter.orientation.label")}
        options={ORIENTATIONS.map((value) => ({
          value,
          label: t(`splitter.orientation.${value}`),
        }))}
        value={paperDefaults.orientation}
        onChange={(orientation) => setPaperDefaults({ ...paperDefaults, orientation })}
      />
      <SettingNote>{t("settings.defaults.description")}</SettingNote>
    </SettingsSection>
  );
}
