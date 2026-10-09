import type { Handedness, ThemePreference } from "@ar-darwin/ui";
import { SegmentedControl } from "../components/SegmentedControl";
import { Toggle } from "../components/Toggle";
import { t } from "../i18n";
import { useReduceMotion } from "../theme/ReduceMotion";

type ToolbarProps = {
  preference: ThemePreference;
  onPreference: (p: ThemePreference) => void;
  hand: Handedness;
  onHand: (h: Handedness) => void;
};

/** Sticky switches that affect the whole playground: theme, drawing hand, reduced motion. */
export function Toolbar({ preference, onPreference, hand, onHand }: ToolbarProps) {
  const { reduce, setReduce } = useReduceMotion();
  return (
    <div className="pg-toolbar" role="toolbar" aria-label={t("playground.toolbar")}>
      <SegmentedControl
        label={t("playground.theme.label")}
        options={[
          { value: "system", label: t("playground.theme.system") },
          { value: "light", label: t("playground.theme.light") },
          { value: "dark", label: t("playground.theme.dark") },
        ]}
        value={preference}
        onChange={onPreference}
      />
      <SegmentedControl
        label={t("playground.hand.label")}
        options={[
          { value: "right", label: t("playground.hand.right") },
          { value: "left", label: t("playground.hand.left") },
        ]}
        value={hand}
        onChange={onHand}
      />
      <Toggle label={t("playground.reduceMotion")} checked={reduce} onChange={setReduce} />
    </div>
  );
}
